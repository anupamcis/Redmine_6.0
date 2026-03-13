class PmpReportsController < ApplicationController

  before_action :find_project
  before_action :authorize_global, only: [:index]

  def index
  end

  def update
    project_process = ProjectProcess.find(params[:id])
    if project_process.present?
      project_process.update_column(:tailoring, params[:tailoring])
    end
    respond_to do |format|
      format.js { render js: "window.location=#{project_pmp_reports_path(@project)}" }
    end
  end

  private
  def find_project
    @project = Project.find(params[:project_id])
  end
end
