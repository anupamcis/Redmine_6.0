# Ensure DMSF plugin patches are applied
Rails.application.config.to_prepare do
  begin
    # Ensure Project model has DMSF associations
    unless Project.reflect_on_association(:dmsf_folders)
      if defined?(RedmineDmsf::Patches::ProjectPatch)
        Project.send(:include, RedmineDmsf::Patches::ProjectPatch) unless Project.included_modules.include?(RedmineDmsf::Patches::ProjectPatch)
        Rails.logger.info "Applied RedmineDmsf::Patches::ProjectPatch to Project model"
      else
        Rails.logger.warn "RedmineDmsf::Patches::ProjectPatch not defined"
      end
    end

    # Add missing is_client? method to User model for DMSF compatibility
    unless User.instance_methods.include?(:is_client?)
      User.class_eval do
        def is_client?
          # Default implementation - can be customized based on your business logic
          # For now, return false to indicate user is not a client
          false
        end
      end
      Rails.logger.info "Added is_client? method to User model for DMSF compatibility"
    end
  rescue => e
    Rails.logger.error "Failed to apply DMSF patches: #{e.class}: #{e.message}"
  end
end
