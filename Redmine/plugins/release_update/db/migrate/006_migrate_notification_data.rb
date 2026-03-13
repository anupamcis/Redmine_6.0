class MigrateNotificationData < ActiveRecord::Migration[4.2]
  def change
  	ReleaseNotification.where("release_update_id is not null" ).each do |release_notification|
  		release_notification.notifiable_id = release_notification.release_update_id
  		release_notification.notifiable_type = "ReleaseUpdate"
  		release_notification.save
  	end
  	remove_column :release_notifications, :release_update_id
  end
end
