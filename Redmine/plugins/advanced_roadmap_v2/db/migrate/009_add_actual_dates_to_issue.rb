class AddActualDatesToIssue < ActiveRecord::Migration[4.2]
   def self.up
    add_column :issues, :actual_start_date, :date
    add_column :issues, :actual_end_date, :date
   end

  def self.down
    remove_column :issues, :actual_start_date
    remove_column :issues, :actual_end_date
  end
end