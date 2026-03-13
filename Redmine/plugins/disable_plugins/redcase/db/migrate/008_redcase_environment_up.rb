
class RedcaseEnvironmentUp < ActiveRecord::Migration[4.2]

  def self.up
    change_table :execution_environments do |t|
      t.change :project_id, :integer, :null => false
    end
  end
  
  def self.down
    change_table :execution_environments do |t|
      t.change :project_id, :integer, :null => true
    end
  end
  
end
