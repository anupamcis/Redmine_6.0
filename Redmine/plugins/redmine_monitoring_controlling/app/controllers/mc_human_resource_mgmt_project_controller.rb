class McHumanResourceMgmtProjectController < ApplicationController

  layout 'base'
  before_action :find_project, :authorize
  menu_item :redmine_monitoring_controlling
  
  def index    
    #tool instance
    tool = McTools.new

    #get projects and sub projects
    stringSqlProjectsSubProjects = tool.return_ids(@project.id)    
    
    # total issues from the project and subprojects
    @totalIssues = Issue.where(:project_id => [stringSqlProjectsSubProjects]).count

    @statusesByAssigneds = Issue.find_by_sql("select assigned_to_id, users.firstname as assigned_first_name , users.lastname as assigned_last_name ,issue_statuses.id, issue_statuses.name, (select COUNT(1) from issues i  where i.project_id in (#{stringSqlProjectsSubProjects})and ((i.assigned_to_id = issues.assigned_to_id and i.assigned_to_id is not null)or(i.assigned_to_id is null and issues.assigned_to_id is null)) and i.status_id = issue_statuses.id) as totalassignedbystatuses from issues, issue_statuses,users  where project_id in (#{stringSqlProjectsSubProjects}) and users.id = assigned_to_id group by assigned_to_id,issue_statuses.id, issue_statuses.name,users.firstname, users.lastname ;") || nil  
  end

  private
  def find_project
    @project=Project.find(params[:project_id])
  end
end
