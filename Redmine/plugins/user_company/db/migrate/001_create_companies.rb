class CreateCompanies < ActiveRecord::Migration[4.2]
  def self.up
    create_table :companies do |t|
      t.string :name, null: false
      t.string :phone_number
      t.string :fax_number
      t.text :address
      t.string :homepage

    end
  end

  def self.down
    drop_table :companies
  end
end
