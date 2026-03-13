class CreateHardwareSoftwarePlans < ActiveRecord::Migration[4.2]
  def change
    create_table :hardware_software_plans do |t|
      t.string :profile_type
      t.string :environment
      t.string :resource
      t.string :configuration
      t.integer :quantity
      t.string :version
      t.string :action
      t.integer :responsible_person_id
      t.boolean :critical_resource, defualt: false
      t.string :remarks
      t.datetime :start_date
      t.datetime :end_date
      t.boolean :is_visible_to_client, defualt: false
      t.boolean :send_mail, defualt: false
      t.integer :hardware_and_software_profile_id
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
