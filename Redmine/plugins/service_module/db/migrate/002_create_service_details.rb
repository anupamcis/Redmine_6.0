class CreateServiceDetails < ActiveRecord::Migration[4.2]
  def change
    create_table :service_details do |t|
      t.string :erp_service_detail_id
      t.string :erp_service_id
      t.string :supervisor_employee_id
      t.datetime :period_from
      t.datetime :period_to
      t.string :parent_service_detail_id
      t.string :transferred_by
      t.string :transferrd_from_service_detail_id
      t.boolean :is_complete
      t.string :service_detail_type
      t.string :status
      t.integer :project_id, limit: 8
      t.boolean :is_master, default: false
      t.timestamp :created_on
      t.timestamp :updated_on
    end
  end
end
