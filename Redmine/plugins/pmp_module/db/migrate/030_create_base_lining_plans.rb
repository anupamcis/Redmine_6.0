class CreateBaseLiningPlans < ActiveRecord::Migration[4.2]
  def change
    create_table :base_lining_plans do |t|
      t.string :when_to_baseline
      t.string :trigger_for_baseline
      t.string :what_to_baseline
      t.integer :project_id
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
