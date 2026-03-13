class CreateHardwareAndSoftwareProfiles < ActiveRecord::Migration[4.2]
  def change
    create_table :hardware_and_software_profiles do |t|
      t.string :name
      t.boolean :use_as_profile
      t.integer :project_id
      t.integer :user_id
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
