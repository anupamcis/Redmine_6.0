module ServiceModule
  class ViewHooks < Redmine::Hook::ViewListener
    render_on(:view_layouts_base_html_head, :partial => "hooks/service")
  end
  
  # Zeitwerk expects Hooks::ViewHooks based on file path
  module Hooks
    ViewHooks = ServiceModule::ViewHooks
  end
end
