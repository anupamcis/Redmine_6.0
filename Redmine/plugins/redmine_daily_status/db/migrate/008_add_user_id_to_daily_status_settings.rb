class AddUserIdToDailyStatusSettings < ActiveRecord::Migration[4.2]
  def change
    add_column :daily_status_settings, :user_id, :integer
  end
end
