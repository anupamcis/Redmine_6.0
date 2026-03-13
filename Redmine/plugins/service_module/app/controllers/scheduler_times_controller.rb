class SchedulerTimesController < ApplicationController
  before_action :require_admin_or_api_request
  layout 'admin'
  def index
    @scheduler_times = SchedulerTime.all
  end

  def edit
    @scheduler_time = SchedulerTime.find(params[:id])
  end

  def update
    scheduler_time = SchedulerTime.find(params[:id])
    scheduler_time.description = params[:scheduler_time][:description] if params[:scheduler_time][:description].present?
    scheduler_time.save
    redirect_to scheduler_times_path
  end
end