class CreateTrainingNeeds < ActiveRecord::Migration[4.2]
  def change
    create_table :training_needs do |t|
      t.string :training_type
      t.string :name_of_training
      t.string :training_method
      t.integer :duration
      t.datetime :expected_date
      t.datetime :actual_date
      t.string :status
      t.text :comment
      t.integer :project_id
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
