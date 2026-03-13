class CreateHardwareSoftwareSupliedByClients < ActiveRecord::Migration[4.2]
  def change
    create_table :hardware_software_suplied_by_clients do |t|
      t.string :client_supplied_item
      t.string :remarks
      t.integer :project_id
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
