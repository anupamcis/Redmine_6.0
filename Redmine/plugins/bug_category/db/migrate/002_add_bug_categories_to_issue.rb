class AddBugCategoriesToIssue < ActiveRecord::Migration[4.2]
  def change
    add_column :issues, :bug_category_id, :integer
  end
end