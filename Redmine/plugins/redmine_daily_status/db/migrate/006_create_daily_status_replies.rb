class CreateDailyStatusReplies < ActiveRecord::Migration[4.2]
  def change
    create_table :daily_status_replies do |t|
      t.text :message
      t.integer :author_id
      t.integer :daily_status_id
      t.boolean :is_email_sent, :default => false
      t.timestamps
    end
  end
end
