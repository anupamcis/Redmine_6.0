class CreateServices < ActiveRecord::Migration[4.2]
  def change
    create_table :services do |t|
      t.string :erp_service_id
      t.string :service_name
      t.string :service_type
      t.string :status
      t.string :account_manager_employee_id
      t.string :erp_estimation_id
      t.string :erp_client_id
      t.string :main_supervisor_id
      t.datetime :service_date_from
      t.datetime :service_date_to
      # t.string :service_type_name
      # t.float :hours
      # t.string :service_status_name
      # t.datetime :next_date
      # t.datetime :date_from
      # t.datetime :date_to
      # t.string :is_recurr
      # t.string :recurr_days

      t.timestamp :created_on
      t.timestamp :updated_on
    end
  end
end
