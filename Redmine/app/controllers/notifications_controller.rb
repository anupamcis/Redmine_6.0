class NotificationsController < ApplicationController
  before_action :require_login
  before_action :find_notification, only: [:show, :update, :destroy]

  # GET /notifications.json
  def index
    @notifications = Notification.where(user_id: User.current.id)
                                 .order(created_at: :desc)
                                 .limit(params[:limit] || 100)
                                 .offset(params[:offset] || 0)
    
    if params[:unread_only] == '1'
      @notifications = @notifications.where(read: false)
    end
    
    respond_to do |format|
      format.json {
        render json: {
          notifications: @notifications.map { |n| notification_to_json(n) }
        }
      }
    end
  end

  # GET /notifications/unread_count.json
  def unread_count
    count = Notification.where(user_id: User.current.id, read: false).count
    
    respond_to do |format|
      format.json {
        render json: { count: count }
      }
    end
  end

  # PUT /notifications/:id/read.json
  def mark_as_read
    @notification = Notification.find_by(id: params[:id], user_id: User.current.id)
    
    if @notification
      @notification.update(read: true, read_at: Time.current)
      respond_to do |format|
        format.json {
          render json: { success: true, notification: notification_to_json(@notification) }
        }
      end
    else
      respond_to do |format|
        format.json {
          render json: { error: 'Notification not found' }, status: :not_found
        }
      end
    end
  end

  # PUT /notifications/mark_all_read.json
  def mark_all_read
    updated = Notification.where(user_id: User.current.id, read: false)
                         .update_all(read: true, read_at: Time.current)
    
    respond_to do |format|
      format.json {
        render json: { success: true, updated_count: updated }
      }
    end
  end

  # DELETE /notifications/:id.json
  def destroy
    if @notification
      @notification.destroy
      respond_to do |format|
        format.json {
          render json: { success: true }
        }
      end
    else
      respond_to do |format|
        format.json {
          render json: { error: 'Notification not found' }, status: :not_found
        }
      end
    end
  end

  private

  def find_notification
    @notification = Notification.find_by(id: params[:id], user_id: User.current.id)
  end

  def notification_to_json(notification)
    {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      notification_type: notification.notification_type,
      read: notification.read,
      read_at: notification.read_at&.iso8601,
      created_at: notification.created_at.iso8601,
      project_id: notification.project_id,
      project_identifier: notification.project&.identifier,
      project_name: notification.project&.name
    }
  end
end

