module RedmineFavoriteProjects
  module Patches

    module ProjectsHelperPatch

      def self.included(base) # :nodoc:
        base.send(:include, InstanceMethods)
      end

      module InstanceMethods
        # Include the helper from the app/helpers directory
        include ::FavoriteProjectsHelper
      end

    end
  end
end

Rails.application.config.to_prepare do  
  unless ProjectsHelper.included_modules.include?(RedmineFavoriteProjects::Patches::ProjectsHelperPatch)
    ProjectsHelper.send(:include, RedmineFavoriteProjects::Patches::ProjectsHelperPatch)
  end
end
