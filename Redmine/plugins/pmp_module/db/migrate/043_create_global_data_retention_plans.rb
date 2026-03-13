class CreateGlobalDataRetentionPlans < ActiveRecord::Migration[4.2]
  def change
    create_table :global_data_retention_plans do |t|
      t.string :record_name
      t.string :min_retention
      t.string :type_of_record
      t.string :storage_path
      t.string :disposal
      t.string :remarks
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
