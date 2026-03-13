class EmployeesController < ApplicationController
  unloadable
  accept_api_auth :update

  def update
    employee = Employee.find_by_employee_id(params[:employee_id])
    respond_to do |format|
      format.api  {
        if employee.nil?
          render json: {
            "status" => 404,
            "success" => false
          }
          return
        end
        parent_emp = employee.parent_employee_id
        if employee.update(params)
          unless parent_emp == params[:parent_employee_id]
            update_parent(employee, params[:parent_employee_id])
          end
           render json: {
              "status" => 200,
              "success" => true
            }
        else
          render json: {
              "status" => 422,
              "success" => false,
               "errors" => employee.errors.to_json
          }
        end
      }
    end
  end

  private

  def update_parent(employee, updated_parent_id)
    user = employee.user if employee.user.present?
    return if user.nil?
    parent_user_id = Employee.find_by_employee_id(updated_parent_id).try(:user).try(:id)
    user.parent_child_relationship.update(parent_id: parent_user_id)
  end

end
