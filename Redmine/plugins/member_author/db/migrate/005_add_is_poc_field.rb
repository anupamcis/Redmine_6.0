class AddIsPocField < ActiveRecord::Migration[4.2]
  def self.up
    add_column :members, :is_poc, :boolean, default: false
  end

  def self.down
    remove_column :members, :is_poc
  end
end