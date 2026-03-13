class AddTechnologyInProjects < ActiveRecord::Migration[4.2]
  def self.up
    add_column :projects, :major_technology, :string
  end

  def self.down
    remove_column :projects, :major_technology
  end
end