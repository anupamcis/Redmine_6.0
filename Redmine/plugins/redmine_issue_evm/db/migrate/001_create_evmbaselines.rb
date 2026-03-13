class CreateEvmbaselines < ActiveRecord::Migration[4.2]
  def change
    create_table :evmbaselines do |t|
      t.integer :project_id
      t.string :subject
      t.text :description
      t.string :state
      t.datetime :created_on
    end
  end
end
