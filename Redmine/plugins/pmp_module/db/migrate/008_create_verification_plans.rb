class CreateVerificationPlans < ActiveRecord::Migration[4.2]
  def change
    create_table :verification_plans do |t|
      t.string :sdlc_phase
      t.string :work_product
      t.string :verification_method
      t.string :validation_technique
      t.integer :project_id
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
