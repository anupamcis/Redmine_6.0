class ResponsibilityAssignmentMatrix < ActiveRecord::Base

  belongs_to :project
  belongs_to :user
  belongs_to :role, class_name: "RaciRole", foreign_key: "role_id"
  validates_presence_of :project_id


  serialize :responsibility

  def work_type_responsibility
    [["Accountable", "A"], ["Consult", "C"], ["Inform", "I"], ["Responsible", "R"]]
  end

  def self.tooltip_title(value)
    case value
    when "A"
      "Accountable"
    when "C"
      "Consult"
    when "I"
      "Inform"
    else
      "Responsible"
    end
  end

  def create_update_raci_chart(params, project)
    params[:responsibility_assignment_matrix].each do |key, value|
      responsibility_assignment_matrix = if self.new_record?
        project.responsibility_assignment_matrices.build
      else
        matrix_by = if params[:filter_type].eql?("User")
          user_matrix = project.responsibility_assignment_matrices.where(user_id: value[:user_id]).first
          new_matrix = if user_matrix.present?
            user_matrix
          else
            project.responsibility_assignment_matrices.build
          end
        else
          role_matrix = project.responsibility_assignment_matrices.where(role_id: value[:role_id]).first
          new_matrix = if role_matrix.present?
            role_matrix
          else
            project.responsibility_assignment_matrices.build
          end
        end
      end
      if responsibility_assignment_matrix.present?
        if params[:filter_type].eql?("User")
          responsibility_assignment_matrix.user_id = value[:user_id]
        else
          responsibility_assignment_matrix.role_id = value[:role_id]
        end
        if value[:responsibility].present?
          responsibility_assignment_matrix.responsibility = value[:responsibility]
          responsibility_assignment_matrix.save
        else
          responsibility_assignment_matrix.destroy
        end
      end
    end
  end
end
