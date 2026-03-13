module ProjectsReporting
  module ProjectPatch
    STATUS_ONHOLD     = 10
    STATUS_CANCELLED  = 11
    STATUS_COMPLETE   = 12
    def self.included(base)
      base.send(:include, InstanceMethods)

      base.class_eval do
        def self.project_status(value)
          case value
          when Project::STATUS_CLOSED
            l(:project_status_close)
          when Project::STATUS_ONHOLD
            l(:project_status_onhold)
          when Project::STATUS_CANCELLED
            l(:project_status_cancel)
          when Project::STATUS_COMPLETE
            l(:project_status_complete)
          when Project::STATUS_ARCHIVED
            l(:project_status_archived)
          else
            "Active"
          end
        end

        def self.group_projects_by_status(projects)
          grouped_hash = projects.uniq.group_by(&:status)
          grouped_hash.keys.each do |key|
            values = []
            grouped_hash[key.to_i].each do |value|
              values << [value.name, value.identifier]
            end
            grouped_hash[Project.project_status(key.to_i).to_sym] = values
            grouped_hash.delete(key)
          end
          grouped_hash
        end

      end
    end

    module InstanceMethods
      def start_date
       self[:start_date] ||= created_on
      end

      def daily_hours
       self[:daily_hours] ||= 9
      end
      def end_date
        self[:end_date] ||= get_service_or_issues_end_date
       end
    	def project_manager
    		manager = self.memberships.joins(:member_roles).where('role_id = 9').last
    		manager.present? ? manager.name : "-"
    	end

    	def project_leader
    		leader = self.memberships.joins(:member_roles).where('role_id = 10').last
    		leader.present? ? leader.name : "-"
    	end

      def project_last_daily_status_or_issues_date
        max_issue_date = self.issues.map(&:created_on).max
        max_daily_status_date = self.daily_statuses.map(&:created_on).max
      end

      def calculate_project_percent
        if issues.present?
          total_issues = issues.size
          close_issues  = (total_issues - issues.open.size).to_f
          ((close_issues/total_issues)*100).round
        else
          0
        end
      end

      def opened_due_date
        @opened_due_date ||= [
         issues.open.maximum('due_date'),
         shared_versions.maximum('effective_date'),
         Issue.open.fixed_version(shared_versions).maximum('due_date')
         ].compact.max
      end

      def update_project_status(new_status)
        self_and_descendants.update_all :status => new_status
      end

      def project_status(value)
        case value
        when Project::STATUS_CLOSED
          l(:project_status_close)
        when Project::STATUS_ONHOLD
          l(:project_status_onhold)
        when Project::STATUS_CANCELLED
          l(:project_status_cancel)
        when Project::STATUS_COMPLETE
          l(:project_status_complete)
        else
          ""
        end
      end

      def project_issues_with_count
        issues.group_by(&:status).map{ |k,v| [k.try(:name), v.try(:count)] }.to_h
      end

      def estimated_hours_sum
        issues.map {|issue| issue.estimated_hours if issue.status.name == 'Closed'}.compact.sum
      end

      def project_total_time_entries

        # time_entries.map(&:hours).compact.sum
        issues.includes(:time_entries).where(status_id: 5).map {|issue| issue.time_entries.map(&:hours).compact.sum}.compact.sum
      end

      def get_service_or_issues_end_date
        service_date = respond_to?(:services) ? services.map(&:service_date_to).compact.max : nil
        return service_date if service_date.present?

        issue_date = issues.map(&:updated_on).compact.max
        issue_date || (Time.now + 1.month)
      end
      # time_duration = estimated or spent hours total count.
      def calculate_paid_and_spent_hours(time_duration, calculation_type)
        begin
          effective_end = (respond_to?(:end_date) && end_date.present?) ? end_date : created_on
          project_end_date = effective_end > Time.now ? Time.now : effective_end
          project_start = (respond_to?(:start_date) && start_date.present?) ? start_date : created_on
          total_days = (project_end_date.to_date - project_start.to_date).to_i + 1
          return 0.0 if time_duration.blank?

          denominator = daily_hours.to_f * total_days.to_f
          return 0.0 if denominator <= 0.0

          ratio = time_duration.to_f / denominator
          if calculation_type == 'estimated'
            (((ratio) - 1.0) * 100.0).round(2)
          elsif calculation_type == 'spent'
            ((1.0 - ratio) * 100.0).round(2)
          else
            0.0
          end
        rescue ZeroDivisionError
          0.0
        end
      end
  end
end
end
