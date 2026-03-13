desc <<-END_DESC
  Enable default modules for all projects.
Example:
  rake redmine:enable_default_modules RAILS_ENV="production"
END_DESC

namespace :redmine do
  task enable_default_modules: :environment do
    if Project.exists?
      Project.all.each do |project|
        if project.identifier != GLOBAL_PERMISSIONS_MODULE_NAME
          project.enabled_module_names = Setting.default_projects_modules
        end
      end
      puts "DONE"
    end
  end
end
