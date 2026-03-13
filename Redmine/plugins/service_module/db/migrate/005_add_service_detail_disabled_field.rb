class AddServiceDetailDisabledField < ActiveRecord::Migration[4.2]
  def up
    add_column :service_details, :is_disabled, :boolean, default: false
  end

  def down
    remove_column :service_details, :is_disabled
  end
end