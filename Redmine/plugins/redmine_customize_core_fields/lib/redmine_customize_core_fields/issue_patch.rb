module RedmineCustomizeCoreFields
  module IssuePatch
    def self.included(base)
      base.class_eval do
        def disabled_core_fields
          disabled_core_fields = tracker ? tracker.disabled_core_fields : []
          disabled_core_fields | CoreField.not_visible(project).map(&:identifier).uniq
        end
      end
    end
  end
end

# Include the patch into Issue
Issue.send(:include, RedmineCustomizeCoreFields::IssuePatch) unless Issue.included_modules.include?(RedmineCustomizeCoreFields::IssuePatch)
