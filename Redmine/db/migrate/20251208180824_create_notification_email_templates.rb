class CreateNotificationEmailTemplates < ActiveRecord::Migration[7.2]
  def up
    unless table_exists?(:notification_email_templates)
      create_table :notification_email_templates do |t|
        t.string :name, null: false
        t.string :template_type, null: false
        t.string :subject, null: false
        t.text :body_html
        t.text :body_text
        t.boolean :is_active, default: true, null: false

        t.timestamps
      end

      add_index :notification_email_templates, :template_type unless index_exists?(:notification_email_templates, :template_type)
      add_index :notification_email_templates, :is_active unless index_exists?(:notification_email_templates, :is_active)
      add_index :notification_email_templates, [:template_type, :is_active] unless index_exists?(:notification_email_templates, [:template_type, :is_active])
    else
      # Table exists, just add missing columns/indexes if needed
      change_column_null :notification_email_templates, :name, false if column_exists?(:notification_email_templates, :name)
      change_column_null :notification_email_templates, :template_type, false if column_exists?(:notification_email_templates, :template_type)
      change_column_null :notification_email_templates, :subject, false if column_exists?(:notification_email_templates, :subject)
      
      # Add missing columns
      unless column_exists?(:notification_email_templates, :is_active)
        add_column :notification_email_templates, :is_active, :boolean, default: true, null: false
      end
      
      # Add indexes only if columns exist
      add_index :notification_email_templates, :template_type unless index_exists?(:notification_email_templates, :template_type) || !column_exists?(:notification_email_templates, :template_type)
      add_index :notification_email_templates, :is_active unless index_exists?(:notification_email_templates, :is_active) || !column_exists?(:notification_email_templates, :is_active)
      add_index :notification_email_templates, [:template_type, :is_active] unless index_exists?(:notification_email_templates, [:template_type, :is_active]) || !column_exists?(:notification_email_templates, :template_type) || !column_exists?(:notification_email_templates, :is_active)
    end
  end

  def down
    # Don't drop table in down migration to preserve data
    # if table_exists?(:notification_email_templates)
    #   drop_table :notification_email_templates
    # end
  end
end
