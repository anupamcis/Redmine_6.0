module RedmineFavoriteProjects
  module Hooks
    class ViewsProjectFormHook < Redmine::Hook::ViewListener
      render_on :view_projects_form, :partial => "projects/tags"
    end
    
    # Zeitwerk expects ViewsProjectsFormHook (plural Projects) based on file path
    ViewsProjectsFormHook = ViewsProjectFormHook
  end
end