class CreateCoordinationPlans < ActiveRecord::Migration[4.2]
  def change
    create_table :coordination_plans do |t|
      t.string :stackholder_name
      t.string :coordination_need
      t.datetime :planed_date_of_receivables
      t.integer :project_id
      t.integer :planable_id
      t.string :planable_type
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
