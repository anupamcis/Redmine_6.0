class AddCompanyIdToProject < ActiveRecord::Migration[4.2]
  def up
    add_column :projects, :erp_client_id, :string
  end

  def down
    remove_column :projects, :erp_client_id
  end
end