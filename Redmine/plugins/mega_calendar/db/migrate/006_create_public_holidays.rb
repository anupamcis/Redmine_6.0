class CreatePublicHolidays < ActiveRecord::Migration[4.2]
  def change
    create_table :public_holidays do |t|

      t.string :name


    end

  end
end
