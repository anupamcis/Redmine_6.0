class CreateProjectProcesses < ActiveRecord::Migration[4.2]
  def change
    create_table :project_processes do |t|
      t.integer :project_id
      t.integer :pmp_tab_and_lock_configuration_id
      t.boolean :is_enabled
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
