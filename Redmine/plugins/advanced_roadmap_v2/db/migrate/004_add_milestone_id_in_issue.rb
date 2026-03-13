class AddMilestoneIdInIssue < ActiveRecord::Migration[4.2]
   def up
    add_column :issues, :fixed_milestone_id, :integer
   end

  def down
    remove_column :issues, :fixed_milestone_id
  end
end
