class CreateTypeOfTestings < ActiveRecord::Migration[4.2]
  def change
    create_table :type_of_testings do |t|
      t.string :type_of_testing
      t.text :testing_method
      t.string :stakeholder
      t.integer :project_id
      t.integer :global_type_of_testing_id
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
