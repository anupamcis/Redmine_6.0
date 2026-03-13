class CreateDataRetentionPlans < ActiveRecord::Migration[4.2]
  def change
    create_table :data_retention_plans do |t|
      t.string :record_name
      t.string :min_retention
      t.string :type_of_record
      t.string :storage_path
      t.string :disposal
      t.string :remarks
      t.integer :project_id
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
