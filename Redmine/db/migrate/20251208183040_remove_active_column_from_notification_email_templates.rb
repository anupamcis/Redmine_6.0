class RemoveActiveColumnFromNotificationEmailTemplates < ActiveRecord::Migration[7.2]
  def up
    if column_exists?(:notification_email_templates, :active)
      # Copy data from active to is_active if needed
      execute "UPDATE notification_email_templates SET is_active = active WHERE is_active IS NULL AND active IS NOT NULL"
      remove_column :notification_email_templates, :active
    end
  end

  def down
    # Don't restore the column in down migration
  end
end
