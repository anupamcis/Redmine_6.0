class CreateStakeholderManagementPlans < ActiveRecord::Migration[4.2]
  def change
    create_table :stakeholder_management_plans do |t|
      t.integer :user_id
      t.text :unaware
      t.text :resistant
      t.text :netural
      t.text :supportive
      t.text :leading
      t.boolean :is_visible_to_client, defualt: false
      t.integer :project_id
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
