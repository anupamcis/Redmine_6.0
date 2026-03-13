# Ensure Service Module patches are applied
Rails.application.config.to_prepare do
  begin
    # Ensure User model has Service Module patches
    unless User.instance_methods.include?(:get_services_with_hierarchy)
      if defined?(ServiceModule::UserPatch)
        User.send(:include, ServiceModule::UserPatch) unless User.included_modules.include?(ServiceModule::UserPatch)
        Rails.logger.info "Applied ServiceModule::UserPatch to User model"
      else
        Rails.logger.warn "ServiceModule::UserPatch not defined"
      end
    end

    # Add missing employee association to User model for service_module compatibility
    unless User.reflect_on_association(:employee)
      User.class_eval do
        belongs_to :employee, optional: true
      end
      Rails.logger.info "Added employee association to User model for service_module compatibility"
    end

    # Ensure Project model has Service Module patches
    if defined?(ServiceModule::ProjectPatch)
      Project.send(:include, ServiceModule::ProjectPatch) unless Project.included_modules.include?(ServiceModule::ProjectPatch)
      Rails.logger.info "Applied ServiceModule::ProjectPatch to Project model"
    end

    # Ensure Issue model has Service Module patches
    if defined?(ServiceModule::IssuePatch)
      Issue.send(:include, ServiceModule::IssuePatch) unless Issue.included_modules.include?(ServiceModule::IssuePatch)
      Rails.logger.info "Applied ServiceModule::IssuePatch to Issue model"
    end

    # Ensure ProjectsHelper has Service Module patches
    if defined?(ServiceModule::ProjectsHelperPatch)
      ProjectsHelper.send(:include, ServiceModule::ProjectsHelperPatch) unless ProjectsHelper.included_modules.include?(ServiceModule::ProjectsHelperPatch)
      Rails.logger.info "Applied ServiceModule::ProjectsHelperPatch to ProjectsHelper"
    end

    # Ensure ProjectsController has Service Module patches
    if defined?(ServiceModule::ProjectsControllerPatch)
      ProjectsController.send(:include, ServiceModule::ProjectsControllerPatch) unless ProjectsController.included_modules.include?(ServiceModule::ProjectsControllerPatch)
      Rails.logger.info "Applied ServiceModule::ProjectsControllerPatch to ProjectsController"
    end
  rescue => e
    Rails.logger.error "Failed to apply Service Module patches: #{e.class}: #{e.message}"
  end
end
