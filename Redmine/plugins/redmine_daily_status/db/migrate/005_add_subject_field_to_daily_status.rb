class AddSubjectFieldToDailyStatus < ActiveRecord::Migration[4.2]
  def change
    add_column :daily_statuses, :subject, :string
  end
end
