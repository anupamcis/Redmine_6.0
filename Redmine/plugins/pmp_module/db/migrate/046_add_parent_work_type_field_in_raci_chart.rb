class AddParentWorkTypeFieldInRaciChart < ActiveRecord::Migration[4.2]
  def self.up
    add_column :raci_charts, :parent_work_type, :string
  end

  def self.down
    remove_column :raci_charts, :parent_work_type
  end
end