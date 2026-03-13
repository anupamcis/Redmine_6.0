class CreateHolidays < ActiveRecord::Migration[4.2]
  def up
    create_table :holidays do |t|
      t.datetime :start
      t.datetime :end
      t.integer :user_id
    end
  end
  def down
    drop_table(:holidays)
  end
end
