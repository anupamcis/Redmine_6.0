class CreateProjectDailyStatusSettings < ActiveRecord::Migration[4.2]
  def change
    create_table :daily_status_settings do |t|
      t.integer :project_id, :null => false
    end
  end
end