class CreateSchedulerTimes < ActiveRecord::Migration[4.2]
  def change
    create_table :scheduler_times do |t|
      t.text :description
      t.datetime :start_date
      t.datetime :end_date
      t.string :cron_name
    end
  end
end
