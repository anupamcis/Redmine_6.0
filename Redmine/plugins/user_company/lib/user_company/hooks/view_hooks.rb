module UserCompany
  class ViewHooks < Redmine::Hook::ViewListener
    render_on(:view_users_form, :partial => "hooks/user_form")
  end
  
  # Zeitwerk expects Hooks::ViewHooks based on file path
  module Hooks
    ViewHooks = UserCompany::ViewHooks
  end
end
