class AddVersionIdInMilestone < ActiveRecord::Migration[4.2]
   def up
    add_column :milestones, :version_id, :integer
   end

  def down
    remove_column :milestones, :version_id
  end
end
