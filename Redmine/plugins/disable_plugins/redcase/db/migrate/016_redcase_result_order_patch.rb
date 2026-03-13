
class RedcaseResultOrderPatch < ActiveRecord::Migration[4.2]

  def self.up
    rename_column :execution_results, :order_num, :order_number
  end

  def self.down
    rename_column :execution_results, :order_number, :order_num
  end

end
