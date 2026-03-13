class AddMissingColumnsToNotificationEmailTemplates < ActiveRecord::Migration[7.2]
  def up
    # Add name column if it doesn't exist
    unless column_exists?(:notification_email_templates, :name)
      add_column :notification_email_templates, :name, :string
      # Set default name for existing rows
      execute "UPDATE notification_email_templates SET name = template_type WHERE name IS NULL" if table_exists?(:notification_email_templates)
      change_column_null :notification_email_templates, :name, false
    end
    
    # Other columns already exist based on the table structure
    # Just ensure they have the right constraints (only if no NULL values exist)
    if column_exists?(:notification_email_templates, :template_type)
      # Check if there are any NULL values before making it NOT NULL
      null_count = connection.select_value("SELECT COUNT(*) FROM notification_email_templates WHERE template_type IS NULL")
      if null_count == 0
        change_column_null :notification_email_templates, :template_type, false
      end
    end
    
    if column_exists?(:notification_email_templates, :subject)
      null_count = connection.select_value("SELECT COUNT(*) FROM notification_email_templates WHERE subject IS NULL")
      if null_count == 0
        change_column_null :notification_email_templates, :subject, false
      end
    end
    
    # Handle the 'active' column - rename to 'is_active' if it exists
    if column_exists?(:notification_email_templates, :active) && !column_exists?(:notification_email_templates, :is_active)
      rename_column :notification_email_templates, :active, :is_active
    end
    
    if column_exists?(:notification_email_templates, :is_active)
      # Set default for NULL values
      execute "UPDATE notification_email_templates SET is_active = 1 WHERE is_active IS NULL" if table_exists?(:notification_email_templates)
      change_column_default :notification_email_templates, :is_active, true
      change_column_null :notification_email_templates, :is_active, false
    end
  end

  def down
    # Don't remove columns in down migration
  end
end
