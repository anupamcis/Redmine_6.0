class CreateGlobalWorkProducts < ActiveRecord::Migration[4.2]
  def change
    create_table :global_work_products do |t|
      t.string :work_product
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
