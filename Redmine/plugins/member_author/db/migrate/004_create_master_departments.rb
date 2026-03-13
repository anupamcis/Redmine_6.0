class CreateMasterDepartments < ActiveRecord::Migration[4.2]
  def self.up
    unless table_exists?(:master_departments)
      create_table :master_departments do |t|
        t.string :name
      end
    end
  end

  def self.down
    drop_table :master_departments if table_exists?(:master_departments)
  end
end
