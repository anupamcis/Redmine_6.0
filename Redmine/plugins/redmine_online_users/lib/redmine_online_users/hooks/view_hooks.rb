module RedmineOnlineUsers
  class ViewHooks < Redmine::Hook::ViewListener
    # render_on :view_layouts_base_sidebar, :partial => "hooks/online_users_list"
    # render_on(:view_projects_show_sidebar_bottom, :partial => "hooks/online_users_list") comment this to remove the who is online portion.
    #render_on(:view_issues_sidebar_planning_bottom, :partial => "hooks/online_users_list") comment this to remove the who is online portion.
    # render_on(:view_issues_show_details_bottom, :partial => "hooks/online_users_list")
  end
  
  # Zeitwerk expects Hooks::ViewHooks based on file path
  module Hooks
    ViewHooks = RedmineOnlineUsers::ViewHooks
  end
end
