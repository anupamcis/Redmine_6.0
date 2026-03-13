class CreateRisks < ActiveRecord::Migration[4.2]
  def change
    create_table :risks do |t|
      t.string :risk_description
      t.string :risk_category
      t.string :source
      t.integer :probability
      t.integer :impact
      t.integer :exposure
      t.text :mitigation_plan
      t.text :contingency_plan
      t.string :comment
      t.boolean :is_visible_to_client, default: false
      t.integer :project_id
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
