class AddDatesToMilestone < ActiveRecord::Migration[4.2]
   def self.up
    add_column :milestones, :actual_start_date, :date
    add_column :milestones, :actual_end_date, :date
    add_column :milestones, :planed_end_date, :date
   end

  def self.down
    remove_column :milestones, :actual_start_date
    remove_column :milestones, :actual_end_date
    remove_column :milestones, :planed_end_date
  end
end