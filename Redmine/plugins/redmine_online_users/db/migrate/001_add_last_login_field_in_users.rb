class AddLastLoginFieldInUsers < ActiveRecord::Migration[4.2]

  def up
    add_column :users, :last_login, :boolean, deafalt: false
  end

   def down
    remove_column :users, :last_login
  end
end
