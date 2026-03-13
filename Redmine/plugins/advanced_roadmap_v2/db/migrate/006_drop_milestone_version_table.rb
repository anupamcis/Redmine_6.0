class DropMilestoneVersionTable < ActiveRecord::Migration[4.2]
   def up
    drop_table :milestone_versions
   end
end
