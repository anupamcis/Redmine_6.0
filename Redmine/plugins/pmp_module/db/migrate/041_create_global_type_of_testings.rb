class CreateGlobalTypeOfTestings < ActiveRecord::Migration[4.2]
  def change
    create_table :global_type_of_testings do |t|
      t.string :type_of_testing_name
      t.text :testing_method
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
