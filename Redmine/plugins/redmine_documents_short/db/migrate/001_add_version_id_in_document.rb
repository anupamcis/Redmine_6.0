class AddVersionIdInDocument < ActiveRecord::Migration[4.2]
  def change
    add_column :documents, :version_id, :integer
  end
end
