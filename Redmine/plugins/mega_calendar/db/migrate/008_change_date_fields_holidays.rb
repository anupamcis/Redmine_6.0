class ChangeDateFieldsHolidays < ActiveRecord::Migration[4.2]
   def change
    change_column :public_holidays, :event_date, :date
  end
end
