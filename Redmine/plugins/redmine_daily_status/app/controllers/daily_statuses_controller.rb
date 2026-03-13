class DailyStatusesController < ApplicationController
  # Allow CORS for JSON requests from React frontend
  before_action :cors_set_access_control_headers, if: -> { request.format.json? }
  before_action :find_project
  before_action :find_daily_status, only: [:update, :show]
  before_action :check_for_todays_mail_sent, only: :new
  helper :attachments
  before_action :authorize, except: [:recipients, :today_status]
  # For recipients, authorize only if not JSON (HTML requests still need auth)
  before_action :authorize_recipients, only: [:recipients]
  before_action :authorize_today_status, only: [:today_status]
  #helper :watchers
  #include WatchersHelper
  
  # Accept API authentication (Basic Auth) for JSON requests
  accept_api_auth :index, :show, :create, :update, :recipients, :today_status
  
  # Skip CSRF for JSON API requests (use session auth instead)
  skip_before_action :verify_authenticity_token, if: -> { request.format.json? }

  def index
    @limit = per_page_option

    @daily_statuses = @project.daily_statuses.where('is_email_sent = ? or (is_email_sent = ? and author_id = ?)', true, false, User.current.id)
    if params[:query].present?
      @daily_statuses = @daily_statuses.joins(:author).where("(LOWER(users.login) LIKE (?) or LOWER(users.firstname) like (?) or  LOWER(users.lastname) like (?) or (LOWER(users.firstname) + ' ' + LOWER(users.lastname) like (?)))", "%#{params[:query].downcase}%", "%#{params[:query].downcase}%" , "%#{params[:query].downcase}%", "%#{params[:query].downcase}%")
    end

    @daily_status_count = @daily_statuses.count
    @daily_status_pages = Paginator.new @daily_status_count, @limit, params['page']
    @offset ||= @daily_status_pages.offset
    @daily_statuses =  @daily_statuses.limit(@limit).offset(@offset).to_a

    respond_to do |format|
      format.html
      format.js
      format.json do
        threads = @daily_statuses.map do |status|
          # Get all participants (author + reply authors)
          participants = [status.author]
          status.daily_status_replies.includes(:author).each { |reply| participants << reply.author }
          participants = participants.uniq.map { |u| { id: u.id, name: u.name } }
          
          # Check if unread (no release_notification for current user)
          unread = !status.release_notifications.exists?(user_id: User.current.id, user_type: 'User')
          
          # Get latest message time
          latest_time = status.created_at
          if status.daily_status_replies.any?
            latest_reply = status.daily_status_replies.order(created_at: :desc).first
            latest_time = latest_reply.created_at if latest_reply && latest_reply.created_at > latest_time
          end
          
          {
            threadId: "t-#{status.id}",
            subject: status.subject.presence || status.daily_status_subject,
            projectId: status.project_id,
            participants: participants,
            latestMessageAt: latest_time.utc.iso8601,
            createdAt: status.created_at.utc.iso8601,
            authorId: status.author_id,
            unread: unread,
            snippet: status.content.to_s.gsub(/<[^>]*>/, '').truncate(100),
            messageCount: 1 + status.daily_status_replies.count
          }
        end
        
        render json: {
          threads: threads,
          nextCursor: nil
        }
      end
    end
  end

  def show
    # Mark as read if viewing (fix for user_type requirement)
    if @daily_status.author != User.current
      notification = @daily_status.release_notifications.find_or_initialize_by(
        user_id: User.current.id,
        user_type: 'User'
      )
      notification.save if notification.new_record?
    end
    
    respond_to do |format|
      format.html
      format.json do
        # Build messages array (main status + replies)
        messages = []
        
        # Main status message
        messages << {
          messageId: @daily_status.id,
          author: { id: @daily_status.author.id, name: @daily_status.author.name },
          createdAt: @daily_status.created_at.utc.iso8601,
          bodyHtml: @daily_status.content.to_s,
          attachments: @daily_status.attachments.map do |att|
            {
              id: att.id,
              filename: att.filename,
              size: att.filesize,
              url: download_named_attachment_path(att, att.filename)
            }
          end,
          direction: @daily_status.author_id == User.current.id ? 'sent' : 'received'
        }
        
        # Reply messages
        @daily_status.daily_status_replies.includes(:author, :attachments).order(created_at: :asc).each do |reply|
          messages << {
            messageId: reply.id,
            author: { id: reply.author.id, name: reply.author.name },
            createdAt: reply.created_at.utc.iso8601,
            bodyHtml: reply.message.to_s,
            attachments: reply.attachments.map do |att|
              {
                id: att.id,
                filename: att.filename,
                size: att.filesize,
                url: download_named_attachment_path(att, att.filename)
              }
            end,
            direction: reply.author_id == User.current.id ? 'sent' : 'received'
          }
        end
        
        # Get recipients (watchers from setting)
        recipients = []
        project_members = @project.members.includes(:user).map(&:user)
        watcher_ids = []
        if @daily_status.setting && @daily_status.setting.respond_to?(:watcher_users)
          watcher_ids = @daily_status.setting.watcher_users.pluck(:id)
        end
        
        project_members.each do |user|
          recipients << {
            id: user.id,
            name: user.name,
            email: user.mail,
            selected: watcher_ids.include?(user.id)
          }
        end
        
        # Check if unread
        unread = !@daily_status.release_notifications.exists?(user_id: User.current.id, user_type: 'User')
        
        render json: {
          threadId: "t-#{@daily_status.id}",
          subject: @daily_status.subject.presence || @daily_status.daily_status_subject,
          projectId: @daily_status.project_id,
          messages: messages,
          recipients: recipients,
          unread: unread
        }
      end
    end
  end

  def update
    respond_to do |format|
      format.html do
        encoding_options = { :invalid => :replace, :undef => :replace, :replace => '', :universal_newline => true }
        @daily_status.content.encode!(Encoding.find('ASCII'), encoding_options)
        if @daily_status.save_attachments(params[:attachments] || params[:daily_status]) && @daily_status.update_attributes(params[:daily_status])
          settings_for_daily_status_mail
        else
          flash[:notice] = @daily_status.errors.full_messages.first
          render 'new'
        end
      end
      format.json do
        # Handle JSON update requests
        update_params = params[:daily_status] || {}
        
        # Update subject if provided
        if params[:subject].present?
          @daily_status.update_column(:subject, params[:subject])
        end
        
        # Update recipients if provided
        if params[:recipientIds].is_a?(Array)
          @daily_status.set_watchers(params[:recipientIds])
        end
        
        # Mark as read/unread
        if params[:unread] == false || params[:markRead] == true
          notification = @daily_status.release_notifications.find_or_initialize_by(
            user_id: User.current.id,
            user_type: 'User'
          )
          notification.save if notification.new_record?
        elsif params[:unread] == true || params[:markUnread] == true
          @daily_status.release_notifications.where(user_id: User.current.id, user_type: 'User').destroy_all
        end
        
        # Update content if provided
        if params[:bodyHtml].present?
          encoding_options = { :invalid => :replace, :undef => :replace, :replace => '', :universal_newline => true }
          content = params[:bodyHtml].encode(Encoding.find('ASCII'), encoding_options)
          @daily_status.update_column(:content, content)
        end
        
        render json: { status: 'updated', threadId: "t-#{@daily_status.id}" }
      end
    end
  end

  def new
    @todays_status = @project.todays_status
    @daily_status ||= @todays_status
    @daily_status ||= @project.daily_statuses.build
  end
  
  # Recipients endpoint for JSON API
  def recipients
    respond_to do |format|
      format.json do
        # Get all project members and filter for active users
        project_members = @project.members.includes(:user, :member_roles => :role).select { |member| member.user&.active? }
        recipients = project_members.map do |member|
          user = member.user
          {
            id: user.id,
            name: user.name,
            email: user.mail,
            roles: member.roles.map(&:name)
          }
        end
        
        render json: { recipients: recipients }
      end
    end
  end

  def today_status
    respond_to do |format|
      format.json do
        has_status = DailyStatus.todays_status_for(@project, User.current).present?
        render json: { hasStatus: has_status }
      end
    end
  end

  def create
    respond_to do |format|
      format.html do
        unless check_for_current_user_status?
          flash[:notice] = l(:already_add_status_message)
          redirect_to project_daily_statuses_path
        else
        permitted_params = daily_status_params
        content_value = params[:daily_status] ? params[:daily_status][:content] : nil
        Rails.logger.info "[DailyStatusesController] HTML create content param class=#{content_value.class} value=#{content_value.inspect[0..200]}" if defined?(Rails)
        @daily_status = DailyStatus.new(permitted_params)
        @daily_status.content = normalize_content_value(content_value)
          @daily_status.content = encode_content(@daily_status.content)
          if @daily_status.save_attachments(params[:attachments] || params[:daily_status]) && @daily_status.save
            settings_for_daily_status_mail
          else
            render 'new'
          end
        end
      end
      format.json do
        # Handle JSON create requests
        unless check_for_current_user_status?
          render json: { status: 'error', message: 'Already added status message for today' }, status: :unprocessable_entity
          return
        end
        
        @daily_status = DailyStatus.new
        # Ensure we have a project - use @project if available, otherwise find it
        project_id_param = params[:projectId] || params['projectId'] || params[:project_id] || params['project_id']
        if @project.nil? && project_id_param.present?
          @project = Project.where(:identifier => project_id_param).first
          if @project.nil?
            render json: { status: 'error', message: "Project not found: #{project_id_param}" }, status: :not_found
            return
          end
        end
        
        @daily_status.project_id = @project.id
        @daily_status.author_id = User.current.id
        # Ensure the project association is loaded for validation
        @daily_status.project = @project
        
        # Set content from bodyHtml
        # Handle both symbol and string keys (Rails might parse JSON with string keys)
        body_html_param = params[:bodyHtml] || params['bodyHtml'] || params[:body_html] || params['body_html'] || 
                         (params[:daily_status] && (params[:daily_status][:bodyHtml] || params[:daily_status]['bodyHtml']))
        
        # Debug logging
        Rails.logger.info "[DailyStatusesController] bodyHtml param class: #{body_html_param.class}, value: #{body_html_param.inspect[0..100]}"
        
        Rails.logger.info "[DailyStatusesController] JSON create bodyHtml class=#{body_html_param.class} value=#{body_html_param.inspect[0..200]}" if defined?(Rails)
        if body_html_param.present?
          body_html = normalize_content_value(body_html_param)
          @daily_status.content = encode_content(body_html)
        end
        
        # Set email sent status
        if params[:sendImmediately] == true || params[:isDraft] == false
          @daily_status.is_email_sent = true
        else
          @daily_status.is_email_sent = false
        end
        
        # Save first to get ID for subject generation
        if @daily_status.save
          # Set subject after save (so we have the ID)
          if params[:subject].present?
            date = Time.now.strftime('%d %b %y')
            subject_text = "[#{@project.name} ##{@daily_status.id}] - #{date} - Status update - #{params[:subject]}"
            @daily_status.update_column(:subject, subject_text)
          else
            # Use default subject if none provided
            @daily_status.update_column(:subject, @daily_status.daily_status_subject)
          end
          
          # Set recipients/watchers
          if params[:recipientIds].is_a?(Array) && params[:recipientIds].any?
            @daily_status.set_watchers(params[:recipientIds])
          end
          
          # Send email if requested
          if params[:sendImmediately] == true && params[:recipientIds].is_a?(Array) && params[:recipientIds].any?
            if @daily_status.email(@daily_status.signature, @daily_status.subject)
              # Email sent successfully
            end
          end
          
          render json: {
            status: 'created',
            threadId: "t-#{@daily_status.id}",
            messageId: @daily_status.id
          }
        else
          render json: {
            status: 'error',
            message: @daily_status.errors.full_messages.first
          }, status: :unprocessable_entity
        end
      end
    end
  end

  private

  def find_daily_status
    @daily_status  = DailyStatus.find(params[:id])
  end

  def check_for_current_user_status?
    DailyStatus.todays_status_for(@project, User.current).nil?
  end

  def find_project
    #id = params[:project_id].to_s.to_i
    #return @project = Project.where(:id => params[:project_id]).first if id > 0
    project_identifier = params[:project_id] || params['project_id']
    if project_identifier.present?
      @project = Project.where(:identifier => project_identifier).first
      unless @project
        # Project not found - render error for JSON requests, redirect for HTML
        if request.format.json?
          render json: { status: 'error', message: "Project not found: #{project_identifier}" }, status: :not_found
        else
          render_404
        end
        return false
      end
    end
    @project
  end

  def daily_status_params
    # Strong parameters for HTML form submissions
    permitted = params.require(:daily_status).permit(:author_id, :project_id, :signature, :subject, :is_email_sent)
    permitted = permitted.to_h.symbolize_keys
    permitted
  end

  def normalize_content_value(value)
    case value
    when ActionController::Parameters
      normalize_content_value(value.to_unsafe_h)
    when Hash
      value[:raw] || value['raw'] || value[:text] || value['text'] || value.to_json
    when Array
      value.map { |v| normalize_content_value(v) }.join("\n")
    else
      value.to_s
    end
  end

  def encode_content(str)
    Rails.logger.info "[DailyStatusesController] encode_content input class=#{str.class} value=#{str.inspect[0..200]}" if defined?(Rails)
    str = str.to_s
    encoding_options = { invalid: :replace, undef: :replace, replace: '', universal_newline: true }
    encoded = str.encode(Encoding.find('ASCII'), **encoding_options)
    Rails.logger.info "[DailyStatusesController] encode_content output length=#{encoded.length}"
    encoded
  rescue Encoding::UndefinedConversionError, Encoding::InvalidByteSequenceError
    str.encode(Encoding::UTF_8, **encoding_options)
  end

  def check_for_todays_mail_sent
    if DailyStatus.todays_mail_sent?(@project)
      flash[:notice] = l(:already_add_status_message)
      redirect_to project_daily_statuses_path
    end
  end

  def settings_for_daily_status_mail
    if params[:watcher].present? && params[:watcher][:user_ids].present?
      @daily_status.set_watchers(params[:watcher][:user_ids])
      @daily_status.set_subject_and_mail_sent(params[:daily_status][:subject]) if params[:commit] == 'Send mail'
      if @daily_status.is_email_sent and @daily_status.email(@daily_status.signature, @daily_status.subject)
        flash[:notice] = l(:label_email_sent_to_all_members_first)
      end
      redirect_to project_daily_statuses_path
    else
      flash[:error] = l(:select_receiver_for_email)
      if params[:commit] == 'Send mail'
        render 'new'
      else
        redirect_to project_daily_statuses_path
      end
    end
  end
  
  # Custom authorization for recipients endpoint
  # For JSON API requests, allow if user can view the project
  # For HTML requests, use normal authorization
  def authorize_recipients
    if request.format.json?
      # For JSON API, just check if user can view the project
      unless User.current.allowed_to?(:view_project, @project)
        render_403
        return false
      end
    else
      # For HTML requests, use normal authorization
      authorize
    end
  end

  def authorize_today_status
    if request.format.json?
      unless User.current.allowed_to?(:view_project, @project)
        render_403
        return false
      end
    else
      authorize
    end
  end
  
  # CORS headers for JSON API
  def cors_set_access_control_headers
    headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
    headers['Access-Control-Allow-Credentials'] = 'true'
    
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS'
      head :ok
    end
  end
end
