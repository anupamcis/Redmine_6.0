class TimesheetsController < ApplicationController
  before_action :find_project, only: [:index]

  accept_api_auth :pms_timesheet

  def index
    @timesheets = Timesheet.where("project_id = #{@project.id}")
    @items = @timesheets.map(&:issue).compact.uniq

    @timesheets = if params[:item].present?
      @timesheets.where("item_id = '#{params[:item]}'")
    else
       @timesheets
    end.order('filled_date desc').to_a.uniq {|i| i.item_id}
    @users = @timesheets.map(&:user).compact.uniq
    @services = @timesheets.map(&:service_detail).compact.uniq
  end

  def item_timesheet
    @item = Issue.find(params[:id])
    @timesheets = @item.timesheets
  end

  def service_timesheet
    @service_detail = ServiceDetail.find(params[:id])
    @timesheets = @service_detail.timesheets.where(item_id: params[:item_id].to_i)
  end

  def pms_timesheet
    if params[:type] == "get_item_ids"
      if params[:timesheet].present?
        item_list = Timesheet.new.send_item_ids(params)
        if item_list.class == Array
          render json: {
              "status" => 200,
              "success" => true,
              "data" => item_list
            }, status: 200
        else
          render json: {
            "status" => 404,
            "success" => false,
            "message" => l(:item_not_found)
          }, status: 404 
        end
      else
        render json: {
          "status" => 405,
          "success" => false,
          "message" => l(:invalid_params_hash)
        }, status: 405
      end
    elsif params[:type] == "submit_timesheet"
      if params[:timesheet].present?
        submitted =  Timesheet.new.submit_timesheet(params[:timesheet])
        if !submitted.map(&:class).include?(ActiveModel::Errors)
          render json: {
            "status" => 200,
            "success" => true,
            "message" => "Timesheet submitted successfully"
          },status: 200
        else
          render json: {
            "status" => 422,
            "success" => false,
            "errors" => submitted.to_json
          }, status: 422
        end
      else
        render json: {
          "status" => 405,
          "success" => false,
          "message" => l(:invalid_params_hash)
        }, status: 405
      end
    else
      render json: {
        "status" => 405,
        "success" => false,
        "message" => l(:invalid_type)
      }, status: 405 
    end
  end

  private
  def find_project
    @project = Project.find(params[:id]) if params[:id].present?
  end
end
