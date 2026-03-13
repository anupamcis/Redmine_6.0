# Ensure Advanced Roadmap v2 patches are applied
Rails.application.config.to_prepare do
  begin
    # Ensure Project model has Advanced Roadmap patches
    unless Project.instance_methods.include?(:project_status)
      if defined?(AdvancedRoadmap::ProjectPatch)
        Project.send(:include, AdvancedRoadmap::ProjectPatch) unless Project.included_modules.include?(AdvancedRoadmap::ProjectPatch)
        Rails.logger.info "Applied AdvancedRoadmap::ProjectPatch to Project model"
      else
        Rails.logger.warn "AdvancedRoadmap::ProjectPatch not defined"
      end
    end

    # Ensure ProjectsHelper has Advanced Roadmap patches
    if defined?(AdvancedRoadmap::ProjectsHelperPatch)
      ProjectsHelper.send(:include, AdvancedRoadmap::ProjectsHelperPatch) unless ProjectsHelper.included_modules.include?(AdvancedRoadmap::ProjectsHelperPatch)
      Rails.logger.info "Applied AdvancedRoadmap::ProjectsHelperPatch to ProjectsHelper"
    end

    # Ensure ApplicationHelper has Advanced Roadmap patches
    if defined?(AdvancedRoadmap::ApplicationHelperPatch)
      ApplicationHelper.send(:include, AdvancedRoadmap::ApplicationHelperPatch) unless ApplicationHelper.included_modules.include?(AdvancedRoadmap::ApplicationHelperPatch)
      Rails.logger.info "Applied AdvancedRoadmap::ApplicationHelperPatch to ApplicationHelper"
    end

    # Ensure Issue has Advanced Roadmap patches
    if defined?(AdvancedRoadmap::IssuePatch)
      Issue.send(:include, AdvancedRoadmap::IssuePatch) unless Issue.included_modules.include?(AdvancedRoadmap::IssuePatch)
      Rails.logger.info "Applied AdvancedRoadmap::IssuePatch to Issue model"
    end

    # Ensure Version has Advanced Roadmap patches
    if defined?(AdvancedRoadmap::VersionPatch)
      Version.send(:include, AdvancedRoadmap::VersionPatch) unless Version.included_modules.include?(AdvancedRoadmap::VersionPatch)
      Rails.logger.info "Applied AdvancedRoadmap::VersionPatch to Version model"
    end
  rescue => e
    Rails.logger.error "Failed to apply Advanced Roadmap patches: #{e.class}: #{e.message}"
  end
end
