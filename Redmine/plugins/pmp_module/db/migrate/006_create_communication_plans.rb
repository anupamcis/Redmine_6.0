class CreateCommunicationPlans < ActiveRecord::Migration[4.2]
  def change
    create_table :communication_plans do |t|
      t.string :stackholder_name
      t.string :communication_need
      t.string :means_of_communication
      t.string :frequency_of_communication
      t.string :responsibility_of_communication
      t.integer :project_id
      t.integer :stackholder_id
      t.string :username
      t.boolean :is_system_generated, default: false
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
