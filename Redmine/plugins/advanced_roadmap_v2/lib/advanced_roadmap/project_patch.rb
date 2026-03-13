module AdvancedRoadmap
  module ProjectPatch
    def self.included(base)
      base.class_eval do
        has_many :milestones

        def project_status(status)
          case status
          when Project::STATUS_ACTIVE
            I18n.t(:project_status_active)
          when Project::STATUS_CLOSED
            I18n.t(:project_status_closed)
          when Project::STATUS_ARCHIVED
            I18n.t(:project_status_archived)
          when Project::STATUS_SCHEDULED_FOR_DELETION
            I18n.t(:project_status_scheduled_for_deletion)
          else
            I18n.t(:project_status_unknown)
          end
        end
      end
    end
  end
end
