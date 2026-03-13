# Ensure PMP module patches are applied
Rails.application.config.to_prepare do
  begin
    # Ensure Project model has PMP associations
    unless Project.reflect_on_association(:project_processes)
      if defined?(PmpModule::ProjectPatch)
        Project.send(:include, PmpModule::ProjectPatch) unless Project.included_modules.include?(PmpModule::ProjectPatch)
        Rails.logger.info "Applied PmpModule::ProjectPatch to Project model"
      else
        Rails.logger.warn "PmpModule::ProjectPatch not defined"
      end
    end

    # Ensure User model has PMP patches
    if defined?(PmpModule::UserPatch)
      User.send(:include, PmpModule::UserPatch) unless User.included_modules.include?(PmpModule::UserPatch)
      Rails.logger.info "Applied PmpModule::UserPatch to User model"
    end

    # Add missing company association to User model for PMP compatibility
    unless User.reflect_on_association(:company)
      User.class_eval do
        belongs_to :company, optional: true
      end
      Rails.logger.info "Added company association to User model for PMP compatibility"
    end

    # Ensure Role model has PMP patches
    if defined?(PmpModule::RolePatch)
      Role.send(:include, PmpModule::RolePatch) unless Role.included_modules.include?(PmpModule::RolePatch)
      Rails.logger.info "Applied PmpModule::RolePatch to Role model"
    end

    # Ensure ApplicationController has PMP patches
    if defined?(PmpModule::ApplicationControllerPatch)
      ApplicationController.send(:include, PmpModule::ApplicationControllerPatch) unless ApplicationController.included_modules.include?(PmpModule::ApplicationControllerPatch)
      Rails.logger.info "Applied PmpModule::ApplicationControllerPatch to ApplicationController"
    end
  rescue => e
    Rails.logger.error "Failed to apply PMP patches: #{e.class}: #{e.message}"
  end
end
