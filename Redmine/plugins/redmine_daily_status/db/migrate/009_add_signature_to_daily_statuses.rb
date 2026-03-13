class AddSignatureToDailyStatuses < ActiveRecord::Migration[4.2]
  def change
    add_column :daily_statuses, :signature, :text
  end
end
