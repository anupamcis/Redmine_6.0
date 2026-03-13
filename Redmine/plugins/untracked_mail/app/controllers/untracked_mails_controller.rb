class UntrackedMailsController < ApplicationController
  before_action :require_admin, only: [:index]
  before_action :authorize_global, except: [:index]
  before_action :find_project, only: [:project_untracked_mails, :show]
  # Allow API (Basic/Auth token) authentication for JSON requests
  accept_api_auth :index, :project_untracked_mails, :show
  layout :set_layout
  helper :attachments
  helper :sort
  include SortHelper

  def index
    sort_init 'created_on', 'desc'
    sort_update %w(created_on sent_mail)

    @limit = per_page_option

    @untracked_mails = if params[:mail_type].present? && params[:mail_type].eql?("All mail")
        UntrackedMail.all
    else
      user_read = User.current.release_notifications.where(notifiable_type: "UntrackedMail").map(&:notifiable_id)
      UntrackedMail.where("untracked_mails.id not in (?)", user_read)
    end

    @untracked_mails_count = @untracked_mails.count
    @untracked_mails_pages = Redmine::Pagination::Paginator.new @untracked_mails_count, @limit, params['page']
    @offset ||= @untracked_mails_pages.offset
    @untracked_mails =  @untracked_mails.order(sort_clause).limit(@limit).offset(@offset).to_a
    respond_to do |format|
      format.html
      format.js
      format.json do
        render json: {
          mails: @untracked_mails.map { |mail| serialize_untracked_mail(mail) },
          total: @untracked_mails_count,
          page: @untracked_mails_pages.current,
          per_page: @limit
        }
      end
    end
  end

  def project_untracked_mails
    sort_init 'created_on', 'desc'
    sort_update %w(created_on sent_mail)

    @limit = per_page_option

    @untracked_mails = project_mails
    if @untracked_mails.present?
      if params[:mail_type].present? && params[:mail_type].eql?("All mail")
        @untracked_mails
      else
        user_read = User.current.release_notifications.where(notifiable_type: "UntrackedMail").map(&:notifiable_id)
        @untracked_mails = @untracked_mails.where("untracked_mails.id not in (?)", user_read)
      end

      @untracked_mails_count = @untracked_mails.count
      @untracked_mails_pages = Redmine::Pagination::Paginator.new @untracked_mails_count, @limit, params['page']
      @offset ||= @untracked_mails_pages.offset
      @untracked_mails =  @untracked_mails.order(sort_clause).limit(@limit).offset(@offset).to_a
    end
    respond_to do |format|
      format.html
      format.js
      format.json do
        if @untracked_mails.present?
          render json: {
            mails: @untracked_mails.map { |mail| serialize_untracked_mail(mail) },
            total: @untracked_mails_count,
            page: @untracked_mails_pages.current,
            per_page: @limit
          }
        else
          render json: { mails: [], total: 0, page: 1, per_page: @limit }, status: :ok
        end
      end
    end
  end

  def show
    @untracked_mail = UntrackedMail.find(params[:mail_id])
    notification = @untracked_mail.release_notifications.where(user_id: User.current.id)
    @untracked_mail.release_notifications.create(user: User.current) unless notification.present?
    respond_to do |format|
      format.html
      format.json do
        render json: serialize_untracked_mail(@untracked_mail, include_body: true)
      end
    end
  end

  private

  def project_mails
    if @project.present? && !@project.identifier.eql?(GLOBAL_PERMISSIONS_MODULE_NAME)
      # Get project members with company filter
      project_members = if @project.users.respond_to?(:joins)
                          @project.users.joins(:company).where("companies.default_company = ?", false)
                        else
                          # Fallback for when users returns an Array
                          User.joins(:company, :members).where("members.project_id = ? AND companies.default_company = ?", @project.id, false)
                        end
      project_members = project_members.map(&:mail)
      untracked_mails = UntrackedMail.all.map { |mail| mail.from_mail}
      untracked_user = project_members.reject{|member| !(untracked_mails.include?(member))}
      @untracked_mails = UntrackedMail.where(from_mail:  untracked_user)
    end
  end

  def serialize_untracked_mail(mail, include_body: false)
    # Helper to resolve email(s) to Redmine user display names
    resolve_email = lambda do |email|
      return '' if email.blank?
      user = User.joins(:email_address).where("email_addresses.address = ?", email).first
      user ? user.name : email
    end

    resolve_email_list = lambda do |raw|
      return '' if raw.blank?

      list = raw

      # to_mail / cc are often stored as serialized arrays (JSON or Ruby array)
      if raw.is_a?(String)
        begin
          list = JSON.parse(raw)
        rescue JSON::ParserError
          begin
            list = eval(raw)
          rescue StandardError
            list = raw
          end
        end
      end

      begin
        Array(list).map { |addr| resolve_email.call(addr) }.join(', ')
      rescue StandardError
        raw.to_s
      end
    end

    data = {
      id: mail.id,
      subject: mail.subject,
      from: resolve_email.call(mail.from_mail),
      to: resolve_email_list.call(mail.to_mail),
      cc: resolve_email_list.call(mail.cc),
      reply_to: mail.reply_to,
      headers: mail.headers,
      message_id: mail.message_id,
      references: mail.references,
      created_on: mail.created_on,
      sent_mail: mail.sent_mail
    }

    if include_body
      data[:message_html] = mail.message
      data[:attachments] = mail.attachments.map do |att|
        {
          id: att.id,
          filename: att.filename,
          filesize: att.filesize,
          content_type: att.content_type,
          url: download_named_attachment_path(att, att.filename, only_path: true)
        }
      end
    end

    data
  end

  def find_project
    @project = Project.find(params[:id]) if params[:id].present?
  end

  def set_layout
    case action_name
    when 'index'
      'admin'
    else
      'base'
    end
  end
end
