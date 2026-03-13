 
module RedmineFavoriteProjects
  module Patches

    module ProjectsControllerPatch

      def self.included(base) # :nodoc:
        base.send(:include, InstanceMethods)

        base.class_eval do
          # unloadable removed for Rails 7 compatibility
          alias_method :index_without_favorite_projects, :index
          alias_method :index, :index_with_favorite_projects
        end

      end

      module InstanceMethods
        def index_with_favorite_projects
          p = request.parameters
          p.except!(:controller, :action)
          redirect_to(search_favorite_projects_path(p)) and return
        end
      end

    end
  end
end

Rails.application.config.to_prepare do
  unless ProjectsController.included_modules.include?(RedmineFavoriteProjects::Patches::ProjectsControllerPatch)
    ProjectsController.send(:include, RedmineFavoriteProjects::Patches::ProjectsControllerPatch)
  end
end
