class AddFieldToProjectProcess < ActiveRecord::Migration[4.2]
   def self.up
    add_column :project_processes, :tailoring, :text
   end

  def self.down
    remove_column :project_processes, :tailoring
  end
end
