class CreateProjectFolderStructures < ActiveRecord::Migration[4.2]
  def change
    create_table :project_folder_structures do |t|
      t.string :folder_name
      t.string :configuration_item
      t.string :access_details
      t.integer :project_id
      t.integer :dmsf_file_id
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
