Rails.application.config.after_initialize do
  begin
    trackers_needing_update = Tracker.all.select do |tracker|
      tracker.disabled_core_fields.include?('priority_id')
    end

    trackers_needing_update.each do |tracker|
      enabled_fields = tracker.core_fields
      tracker.core_fields = enabled_fields + ['priority_id']
      tracker.save(validate: false)
      Rails.logger.info "[ensure_priority_field_enabled] Re-enabled 'priority_id' for tracker #{tracker.name} (##{tracker.id})"
    end
  rescue => e
    Rails.logger.error "[ensure_priority_field_enabled] Failed to ensure priority is enabled: #{e.class}: #{e.message}"
  end
end

