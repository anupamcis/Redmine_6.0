class CreateDeploymentStrategies < ActiveRecord::Migration[4.2]
  def change
    create_table :deployment_strategies do |t|
      t.string :release_plan
      t.string :details
      t.datetime :release_date
      t.integer :project_id
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
