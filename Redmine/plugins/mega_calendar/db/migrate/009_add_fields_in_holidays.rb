class AddFieldsInHolidays < ActiveRecord::Migration[4.2]
  def up
    add_column :holidays, :created_on, :datetime
    add_column :holidays, :updated_on, :datetime
  end

  def down
    remove_column :holidays, :created_on
    remove_column :holidays, :updated_on
  end
end
