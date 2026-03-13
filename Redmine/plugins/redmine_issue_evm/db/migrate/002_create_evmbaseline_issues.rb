class CreateEvmbaselineIssues < ActiveRecord::Migration[4.2]
  def change
    create_table :evmbaseline_issues do |t|
      t.integer :evmbaseline_id
      t.integer :issue_id
      t.date :start_date
      t.date :due_date
      t.float :estimated_hours
      t.boolean :leaf
    end
  end
end
