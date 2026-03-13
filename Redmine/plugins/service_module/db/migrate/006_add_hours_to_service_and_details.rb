class AddHoursToServiceAndDetails < ActiveRecord::Migration[4.2]
  def up
    add_column :services, :total_hrs, :float, default: 0.0
    add_column :services, :consume_hrs, :float, default: 0.0
    add_column :services, :remaining_hrs, :float, default: 0.0
  end

  def down
    remove_column :services, :total_hrs
    remove_column :services, :consume_hrs
    remove_column :services, :remaining_hrs
  end
end