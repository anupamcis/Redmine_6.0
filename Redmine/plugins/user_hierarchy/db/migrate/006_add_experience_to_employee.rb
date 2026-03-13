class AddExperienceToEmployee < ActiveRecord::Migration[4.2][4.2]
  def self.up
    add_column :employees, :experience, :float, default: 0.0
  end

  def self.down
    remove_column :employees, :experience
  end
end
