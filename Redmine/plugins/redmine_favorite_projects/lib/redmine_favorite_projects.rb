Rails.configuration.to_prepare do
  # Don't load the lib helper - use the app helper instead
  # require_relative 'helpers/favorite_projects_helper'

  require_relative 'hooks/views_projects_form_hook'

  require_relative 'patches/application_helper_patch'
  require_relative 'patches/project_patch'
  require_relative 'patches/projects_controller_patch'
  require_relative 'patches/projects_helper_patch'
  require_relative 'patches/auto_completes_controller_patch'
  require_relative 'patches/queries_helper_patch'
  
  # Directly include the helper in ProjectsHelper
  unless ProjectsHelper.included_modules.include?(FavoriteProjectsHelper)
    ProjectsHelper.send(:include, FavoriteProjectsHelper)
  end
end

module RedmineFavoriteProjects
  def self.settings() Setting[:plugin_redmine_favorite_projects].blank? ? {} : Setting[:plugin_redmine_favorite_projects] end

  def self.favorite_projects_list_default_columns
    RedmineFavoriteProjects.settings["favorite_projects_list_default_columns"].to_a
  end

  def self.default_list_style
    return (%w(list list_cards) && [RedmineFavoriteProjects.settings["default_list_style"]]).first || "list"
  end

end
