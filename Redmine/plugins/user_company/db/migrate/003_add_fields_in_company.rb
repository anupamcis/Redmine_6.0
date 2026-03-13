class AddFieldsInCompany < ActiveRecord::Migration[4.2]
  def up
    add_column :companies, :default_company, :boolean, default: false
    if !Company.exists?
      Company.create!(name: "CIS", phone_number: 000, fax_number: 000, homepage: "www.cisin.com", default_company: true)
    end
  end

  def down
    remove_column :companies, :default_company
  end
end
