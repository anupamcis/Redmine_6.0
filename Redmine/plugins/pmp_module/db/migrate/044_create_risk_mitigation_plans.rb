class CreateRiskMitigationPlans < ActiveRecord::Migration[4.2]
  def change
    create_table :risk_mitigation_plans do |t|
      t.integer :risk_id
      t.datetime :date_occurred
      t.datetime :closed_date
      t.integer :assigned_to
      t.string :action_taken
      t.string :comment
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
