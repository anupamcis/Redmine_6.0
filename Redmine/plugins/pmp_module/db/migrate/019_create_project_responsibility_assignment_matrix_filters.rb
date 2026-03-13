class CreateProjectResponsibilityAssignmentMatrixFilters < ActiveRecord::Migration[4.2]
  def change
    create_table :project_responsibility_assignment_matrix_filters do |t|
      t.string :matrix_type
      t.text :matrix_filter, array: true
      t.integer :project_id
      t.datetime :created_on
      t.datetime :updated_on
    end
      ["Requirement Understanding", "Design", "Development", "Testing"].each do |value|
        RaciChart.create(work_type: value)
      end
  end
end
