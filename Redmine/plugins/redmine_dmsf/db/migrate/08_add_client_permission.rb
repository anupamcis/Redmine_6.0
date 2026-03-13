class AddClientPermission < ActiveRecord::Migration[4.2]
  def up
    add_column :dmsf_folders, :is_visible_to_client, :boolean, default: false
    add_column :dmsf_files, :is_visible_to_client, :boolean, default: false
  end

  def down
    remove_column :dmsf_folders, :is_visible_to_client
    remove_column :dmsf_files, :is_visible_to_client
  end
end