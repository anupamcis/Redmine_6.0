class AddNewTimestamps < ActiveRecord::Migration[4.2]
  def change
    add_column :daily_statuses, :created_on, :timestamp
    add_column :daily_statuses, :updated_on, :timestamp
    add_column :daily_status_replies, :created_on, :timestamp
    add_column :daily_status_replies, :updated_on, :timestamp
  end
end
