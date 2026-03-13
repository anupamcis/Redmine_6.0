class AddErpClientId < ActiveRecord::Migration[4.2]
  def up
    add_column :companies, :erp_client_id, :string
  end

  def down
    remove_column :companies, :erp_client_id
  end
end
