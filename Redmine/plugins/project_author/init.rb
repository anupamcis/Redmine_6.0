Redmine::Plugin.register :project_author do
  name 'Project Author plugin'
  author 'Author name'
  description 'This is a plugin for Redmine'
  version '0.0.1'
  url 'http://example.com/path/to/plugin'
  author_url 'http://example.com/about'

  permission :remove_company_from_project, {projects: [:remove_company]}
end

Rails.application.config.to_prepare do
  require_dependency 'project_author/project_patch'
  require_dependency 'project_author/projects_controller_patch'
  require_dependency 'project_author/admin_controller_patch'
  
  Project.send(:include, ProjectAuthor::ProjectPatch)
  ProjectsController.send(:include, ProjectAuthor::ProjectsControllerPatch)
  AdminController.send(:include, ProjectAuthor::AdminControllerPatch)
end
