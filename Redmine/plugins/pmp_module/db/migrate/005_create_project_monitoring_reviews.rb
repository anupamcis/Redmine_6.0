class CreateProjectMonitoringReviews < ActiveRecord::Migration[4.2]
  def change
    create_table :project_monitoring_reviews do |t|
      t.integer :milestone_id
      t.string :frequency
      t.string :remarks
      t.integer :project_id
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
