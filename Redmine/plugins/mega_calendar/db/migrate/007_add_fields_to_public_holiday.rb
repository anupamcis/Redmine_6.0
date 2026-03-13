class AddFieldsToPublicHoliday < ActiveRecord::Migration[4.2]
  def up
    add_column :public_holidays, :event_date, :datetime
    add_column :public_holidays, :created_on, :datetime
    add_column :public_holidays, :updated_on, :datetime
  end

  def down
    remove_column :public_holidays, :event_date
    remove_column :public_holidays, :created_on
    remove_column :public_holidays, :updated_on
  end
end
