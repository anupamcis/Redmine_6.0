class CreateDailyStatuses < ActiveRecord::Migration[4.2]
  def change
    create_table :daily_statuses do |t|
      t.integer :project_id, :null => false
      t.text :content
      t.boolean :is_email_sent, :default => false
      t.timestamps
    end
  end
end
