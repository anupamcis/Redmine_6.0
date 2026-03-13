class DailyStatusRepliesController < ApplicationController
  # Allow CORS for JSON requests from React frontend
  before_action :cors_set_access_control_headers, if: -> { request.format.json? }
  before_action :find_project, :find_daily_status, except: :read
  before_action :authorize, except: :read
  helper :attachments
  
  # Accept API authentication (Basic Auth) for JSON requests
  accept_api_auth :create
  
  # Skip CSRF for JSON API requests (use session auth instead)
  skip_before_action :verify_authenticity_token, if: -> { request.format.json? }

  def new
    @daily_status_reply = DailyStatusReply.new
  end

  def create
    respond_to do |format|
      format.html do
        permitted_params = daily_status_reply_params
        message_value = params[:daily_status_reply] ? params[:daily_status_reply][:message] : nil
        @daily_status_reply = DailyStatusReply.new(permitted_params.except(:message))
        @daily_status_reply.daily_status_id ||= @daily_status.id
        @daily_status_reply.author_id ||= User.current.id
        @daily_status_reply.message = normalize_reply_message(message_value || permitted_params[:message])
        @daily_status_reply.is_email_sent = true
        if @daily_status_reply.save_attachments(params[:attachments] || params[:daily_status_reply]) && @daily_status_reply.save
          if @daily_status_reply.is_email_sent
            @daily_status_reply.email
          end
          flash[:notice] = l(:label_reply_saved)
          redirect_to :back
        else
          flash[:error] = @daily_status_reply.errors.full_messages.first
          redirect_to :back
        end
      end
      format.json do
        # Handle JSON create requests for replies
        @daily_status_reply = DailyStatusReply.new
        @daily_status_reply.daily_status_id = @daily_status.id
        @daily_status_reply.author_id = User.current.id
        
        # Set message from bodyHtml
        if params[:bodyHtml].present?
          @daily_status_reply.message = params[:bodyHtml]
        elsif params[:message].present?
          @daily_status_reply.message = params[:message]
        end
        
        @daily_status_reply.is_email_sent = params[:sendImmediately] != false
        
        if @daily_status_reply.save_attachments(params[:attachments] || params[:daily_status_reply]) && @daily_status_reply.save
          # Send email if requested
          if @daily_status_reply.is_email_sent
            @daily_status_reply.email
          end
          
          render json: {
            status: 'created',
            messageId: @daily_status_reply.id,
            threadId: "t-#{@daily_status.id}"
          }
        else
          render json: {
            status: 'error',
            message: @daily_status_reply.errors.full_messages.first
          }, status: :unprocessable_entity
        end
      end
    end
  end

  def read
    @daily_status_reply = DailyStatusReply.find(params[:reply_id])
    # Fix for user_type requirement
    notification = @daily_status_reply.release_notifications.find_or_initialize_by(
      user_id: User.current.id,
      user_type: 'User'
    )
    notification.save if notification.new_record?
    
    respond_to do |format|
      format.js { render nothing: true }
      format.json { render json: { status: 'read' } }
    end
  end

  private
  def daily_status_reply_params
    permitted = params.require(:daily_status_reply).permit(:message, :daily_status_id, :author_id, :is_email_sent)
    permitted.to_h.symbolize_keys
  end

  def normalize_reply_message(value)
    case value
    when ActionController::Parameters
      normalize_reply_message(value.to_unsafe_h)
    when Hash
      value[:raw] || value['raw'] || value[:text] || value['text'] || value.to_json
    when Array
      value.map { |v| normalize_reply_message(v) }.join("\n")
    else
      value.to_s
    end
  end

  def find_project
    #id = params[:project_id].to_s.to_i
    #return @project = Project.where(:id => params[:project_id]).first if id > 0
    return @project = Project.where(:identifier => params[:project_id]).first
  end

  def find_daily_status
    #id = params[:project_id].to_s.to_i
    #return @project = Project.where(:id => params[:project_id]).first if id > 0
    @daily_status = DailyStatus.find_by_id(params[:daily_status_id] || params[:id])
    
    unless @daily_status
      respond_to do |format|
        format.html do
          flash[:error] = l(:error_daily_status_not_found)
          redirect_to project_daily_statuses_path(@project) if @project
        end
        format.json do
          render json: { 
            status: 'error', 
            message: 'Daily status not found. It may have been deleted.' 
          }, status: :not_found
        end
      end
      return false
    end
    
    return @daily_status
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
