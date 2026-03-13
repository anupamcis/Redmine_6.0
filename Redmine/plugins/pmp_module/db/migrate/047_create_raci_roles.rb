class CreateRaciRoles < ActiveRecord::Migration[4.2]
  def change
    create_table :raci_roles do |t|
      t.string :name
      t.datetime :created_on
      t.datetime :updated_on
    end
    ["Responsible", "Accountable", "Consulted", "Informed"].each do |role|
      RaciRole.create(name: role)
    end
  end
end
