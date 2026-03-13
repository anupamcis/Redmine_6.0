class CreateTimesheets < ActiveRecord::Migration[4.2]
  def change
    create_table :timesheets do |t|
      t.string :service_id
      t.string :service_detail_id
      t.integer :item_id
      t.integer :project_id
      t.float :filled_hrs
      t.datetime :filled_date
      t.string :erp_employee_id
      t.integer :user_id
    end
  end
end
