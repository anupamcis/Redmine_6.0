class CreatePmpTabAndLockConfigurations < ActiveRecord::Migration[4.2]
  def change
    create_table :pmp_tab_and_lock_configurations do |t|
      t.string :tab_name
      t.integer :lock_percent, default: 0, null: false
      t.boolean :default_tab, default: false
      t.integer :position
      t.text    :project_types
      t.integer :hours, default: 0
      t.datetime :created_on
      t.datetime :updated_on
    end
    ["Project process", "Hardware and software plan", "Acronyms and glossary","Staffing plan", "Training", "Communication and coordination",
    "Verification", "Risk", "Lessons learned and reusable artifacts", "Configuration and data management plan",
    "Security requirements", "Standards and guidelines", "Deployment strategy", "Project monitoring review"].each_with_index do |tab, index|
      PmpTabAndLockConfiguration.create(tab_name: tab, default_tab: true, position: index+1, lock_percent: 100)
    end
  end
end
