# Ensure Project Author patches are applied
require_dependency File.join(Rails.root, 'plugins', 'project_author', 'lib', 'project_author', 'admin_controller_patch')

Rails.application.config.to_prepare do
  begin
    # Ensure Project model has Project Author patches
    unless Project.reflect_on_association(:author)
      if defined?(ProjectAuthor::ProjectPatch)
        Project.send(:include, ProjectAuthor::ProjectPatch) unless Project.included_modules.include?(ProjectAuthor::ProjectPatch)
        Rails.logger.info "Applied ProjectAuthor::ProjectPatch to Project model"
      else
        Rails.logger.warn "ProjectAuthor::ProjectPatch not defined"
      end
    end

    # Ensure ProjectsController has Project Author patches
    if defined?(ProjectAuthor::ProjectsControllerPatch)
      ProjectsController.send(:include, ProjectAuthor::ProjectsControllerPatch) unless ProjectsController.included_modules.include?(ProjectAuthor::ProjectsControllerPatch)
      Rails.logger.info "Applied ProjectAuthor::ProjectsControllerPatch to ProjectsController"
    end

    # Ensure AdminController has Project Author patches
    if defined?(ProjectAuthor::AdminControllerPatch)
      AdminController.send(:include, ProjectAuthor::AdminControllerPatch) unless AdminController.included_modules.include?(ProjectAuthor::AdminControllerPatch)
      Rails.logger.info "Applied ProjectAuthor::AdminControllerPatch to AdminController"
    else
      Rails.logger.warn "ProjectAuthor::AdminControllerPatch not defined"
    end
  rescue => e
    Rails.logger.error "Failed to apply Project Author patches: #{e.class}: #{e.message}"
  end
end
