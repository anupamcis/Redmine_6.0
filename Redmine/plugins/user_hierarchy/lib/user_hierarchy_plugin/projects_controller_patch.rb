module UserHierarchyPlugin
  module ProjectsControllerPatch
    def self.included(base)
      base.class_eval do
        after_action :add_top_level_hierarchy, only: [:create]
      end
    end

    private

    def add_top_level_hierarchy
      Project.find_project_owner(User.current, @project) if @project.present? && @project.errors.messages.empty?
    end
  end
end
