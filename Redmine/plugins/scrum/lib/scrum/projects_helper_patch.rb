# Copyright © Emilio González Montaña
# Licence: Attribution & no derivates
#   * Attribution to the plugin web page URL should be done if you want to use it.
#     https://redmine.ociotec.com/projects/redmine-plugin-scrum
#   * No derivates of this plugin (or partial) are allowed.
# Take a look to licence.txt file at plugin root folder for further details.


module Scrum
  module ProjectsHelperPatch
    def self.included(base)
      base.class_eval do

        def project_settings_tabs_with_scrum
          tabs = project_settings_tabs_without_scrum
          if User.current.allowed_to?(:manage_sprints, @project)
            index = tabs.index({:name => "versions", :action => :manage_versions,
                                :partial => "projects/settings/versions",
                                :label => :label_version_plural})
            if index
              tabs.insert(index,
                          {:name => "sprints", :action => :edit_sprints,
                           :partial => "projects/settings/sprints",
                           :label => :label_sprint_plural})
              tabs.select {|tab| User.current.allowed_to?(tab[:action], @project)}
            end
          end
          return(tabs)
        end
        alias_method :project_settings_tabs_without_scrum, :project_settings_tabs
        alias_method :project_settings_tabs, :project_settings_tabs_with_scrum

      end
    end
  end
end
