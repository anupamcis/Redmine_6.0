class CreateCustomerSpecificSecurityRequirements < ActiveRecord::Migration[4.2]
  def change
    create_table :customer_specific_security_requirements do |t|
      t.string :security_requirement
      t.string :remarks
      t.boolean :is_visible_to_client, defualt: false
      t.integer :project_id
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
