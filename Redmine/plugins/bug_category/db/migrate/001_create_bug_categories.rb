class CreateBugCategories < ActiveRecord::Migration[4.2]
  def change
    create_table :bug_categories do |t|
      t.string :name
      t.integer :position
    end
    ["Oversight", "Environment related issue", "Nonadherence to coding standards",
    "Ambiguos requirements", "Source code", "Design issues", "Database error",
    "Boundary conditions neglected", "Logic error", "Typographical error",
    "Non function requirement", "Error handling", "Performance error",
    "User interface related", "Extra input"].each_with_index do |bug_category_name, index|
      BugCategory.create(name: bug_category_name, position: index+1)
    end
  end
end
