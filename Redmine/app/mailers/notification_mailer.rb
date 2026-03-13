class NotificationMailer < ActionMailer::Base
  def inactivity_notification(notification)
    @notification = notification
    @user = notification.user
    @project = notification.project
    
    # Get email template for this notification type
    template = NotificationEmailTemplate.get_template(notification.notification_type)
    
    if template
      # Use custom template
      rendered = template.render(notification, @project, @user)
      @subject = rendered[:subject]
      @body_html = rendered[:body_html]
      @body_text = rendered[:body_text]
    else
      # Use default template (fallback to view templates)
      @subject = "[Redmine] #{notification.title}"
      @body_html = nil
      @body_text = notification.message
    end
    
    mail(
      to: @user.mail,
      subject: @subject,
      from: Setting.mail_from
    ) do |format|
      if @body_text.present?
        format.text { render plain: @body_text }
      else
        format.text { render 'notification_mailer/inactivity_notification' }
      end
      
      if @body_html.present?
        format.html { render html: @body_html.html_safe }
      else
        format.html { render 'notification_mailer/inactivity_notification' }
      end
    end
  end
end

