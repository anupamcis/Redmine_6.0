Rails.configuration.to_prepare do
  Redmine::MenuManager.map :project_menu do |menu|
 
    # ----------------------------
    # SETTINGS TAB (admin only for global-permissions)
    # ----------------------------
    settings_item = menu.find(:settings)
    if settings_item
      original_settings_condition =
        settings_item.instance_variable_get(:@condition)
 
      settings_item.instance_variable_set(
        :@condition,
        Proc.new do |project|
          allowed =
            original_settings_condition.nil? ||
            original_settings_condition.call(project)
 
          if project&.identifier == 'global-permissions'
            allowed && User.current.admin?
          else
            allowed
          end
        end
      )
    end
 
    # ----------------------------
    # ACTIVITY TAB (hidden for everyone for global-permissions)
    # ----------------------------
    activity_item = menu.find(:activity)
    if activity_item
      original_activity_condition =
        activity_item.instance_variable_get(:@condition)
 
      activity_item.instance_variable_set(
        :@condition,
        Proc.new do |project|
          allowed =
            original_activity_condition.nil? ||
            original_activity_condition.call(project)
 
          if project&.identifier == 'global-permissions'
            false
          else
            allowed
          end
        end
      )
    end
 
  end
end