class AddEmployeeIdToUsers < ActiveRecord::Migration[4.2][4.2]
  def self.up
    add_column :users, :employee_id, :integer    
  end

  def self.down
    remove_column :users, :employee_id, :integer
  end
end
