class RaciChartsController < ApplicationController
  layout 'admin'

  before_action :require_admin
  before_action :get_raci_chart, only: [:edit, :update, :destroy]

  def index
    @raci_charts = RaciChart.all.group_by(&:parent_work_type)
  end

  def new
    @raci_chart = RaciChart.new
  end

  def create
    @raci_chart = RaciChart.new(params[:raci_chart])
    if @raci_chart.save
      respond_to do |format|
        flash.now[:notice] = "Work type added successfully"
        format.html { redirect_back_or_default(raci_charts_path) }
        format.js
      end
    else
      respond_to do |format|
        format.html { render action: 'new' }
        format.js
      end
    end
  end

  def destroy
    @raci_chart.destroy
    flash[:notice] = "Work type deleted successfully"
    redirect_to raci_charts_path
  end

  def update
    respond_to do |format|
      if @raci_chart.update(params[:raci_chart])
        format.html { redirect_back_or_default(raci_charts_path) }
        format.js
      else
        format.html { render action: 'edit' }
        format.js
      end
    end
  end

  private

  def get_raci_chart
   @raci_chart = RaciChart.find(params[:id])
  end
end
