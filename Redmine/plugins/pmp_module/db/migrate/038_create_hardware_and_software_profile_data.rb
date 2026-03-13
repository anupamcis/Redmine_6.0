class CreateHardwareAndSoftwareProfileData < ActiveRecord::Migration[4.2]
  def change
    create_table :hardware_and_software_profile_data do |t|
      t.string :profile_type
      t.string :resource
      t.string :configuration
      t.string :environment
      t.string :quantity
      t.string :version
      t.string :action
      t.integer :hardware_and_software_profile_id
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
