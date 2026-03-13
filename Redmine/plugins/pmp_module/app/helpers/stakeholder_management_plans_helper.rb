module StakeholderManagementPlansHelper
  def is_checked(project, user_id, field, val)
    plan = project.stakeholder_management_plans.find_by_user_id(user_id)
    if plan.present?
      plan[field].present? && plan[field].include?(val)
    end
  end

  def button_label(project)
    project.stakeholder_management_plans.blank? ? l(:button_create) : l(:button_update)
  end

  def header_label(project)
    project.stakeholder_management_plans.blank? ? l(:add_stakeholder_management_plan) : l(:edit_stakeholder_management_plan)
  end
end
