class AddAuthorInServiceDetail < ActiveRecord::Migration[4.2]
  def up
    add_column :service_details, :added_by_id, :integer
  end

  def down
    remove_column :service_details, :added_by_id
  end
end