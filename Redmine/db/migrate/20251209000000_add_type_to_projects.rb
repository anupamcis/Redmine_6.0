class AddTypeToProjects < ActiveRecord::Migration[7.2]
  def change
    add_column :projects, :project_type, :string, default: 'Hourly'
  end
end
