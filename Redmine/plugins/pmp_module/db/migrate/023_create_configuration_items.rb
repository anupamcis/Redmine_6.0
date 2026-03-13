class CreateConfigurationItems < ActiveRecord::Migration[4.2]
  def change
    create_table :configuration_items do |t|
      t.string :phase
      t.string :configuration_id
      t.string :configuration_item
      t.string :storage_location
      t.integer :project_id
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
