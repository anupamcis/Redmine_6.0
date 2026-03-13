# Ensure Scrum plugin patches are applied
Rails.application.config.to_prepare do
  begin
    # Ensure Issue model has sprint association
    unless Issue.reflect_on_association(:sprint)
      if defined?(Scrum::IssuePatch)
        Issue.send(:include, Scrum::IssuePatch) unless Issue.included_modules.include?(Scrum::IssuePatch)
        Rails.logger.info "Applied Scrum::IssuePatch to Issue model"
      else
        Rails.logger.warn "Scrum::IssuePatch not defined"
      end
    end

    # Ensure Project model has scrum associations
    unless Project.reflect_on_association(:open_sprints_and_product_backlog)
      if defined?(Scrum::ProjectPatch)
        Project.send(:include, Scrum::ProjectPatch) unless Project.included_modules.include?(Scrum::ProjectPatch)
        Rails.logger.info "Applied Scrum::ProjectPatch to Project model"
      else
        Rails.logger.warn "Scrum::ProjectPatch not defined"
      end
    end

    # Ensure Tracker model has scrum methods
    unless Tracker.instance_methods.include?(:is_task?)
      if defined?(Scrum::TrackerPatch)
        Tracker.send(:include, Scrum::TrackerPatch) unless Tracker.included_modules.include?(Scrum::TrackerPatch)
        Rails.logger.info "Applied Scrum::TrackerPatch to Tracker model"
      else
        Rails.logger.warn "Scrum::TrackerPatch not defined"
      end
    end
  rescue => e
    Rails.logger.error "Failed to apply Scrum patches: #{e.class}: #{e.message}"
  end
end
