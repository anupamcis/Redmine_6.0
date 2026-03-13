require_dependency "issue"

module AdvancedRoadmap
  module IssuePatch
    def self.included(base)
      base.class_eval do
        safe_attributes 'fixed_milestone_id', 'actual_start_date',
                        'actual_end_date'
        belongs_to :fixed_milestone, :class_name => 'Milestone'
        validate :check_issue_due_date
        after_save :add_version
        validate :milestone_check

        def rest_hours
          if !@rest_hours
            @rest_hours = 0.0
            if children.empty?
              if !(closed?)
                if (spent_hours > 0.0) && (done_ratio > 0.0)
                  if done_ratio < 100.0
                    @rest_hours = ((100.0 - done_ratio.to_f) * spent_hours.to_f) / done_ratio.to_f
                  end
                else
                  @rest_hours = ((100.0 - done_ratio.to_f) * estimated_hours.to_f) / 100.0
                end
              end
            else
              children.each do |child|
                @rest_hours += child.rest_hours
              end
            end
          end
          @rest_hours
        end

        def parents_count
          parent.nil? ? 0 : 1 + parent.parents_count
        end

        def add_actual_dates(is_status_changed)
          if is_status_changed
            if status_id == 2
              self.actual_start_date = Time.now
              self.actual_end_date = nil
            elsif status_id.in?([5,6])
              self.actual_end_date = Time.now
            else
              self.actual_end_date, self.actual_start_date = nil
            end
          end
        end

        def check_issue_due_date
          if fixed_milestone_id.present? && fixed_milestone.effective_date.present? && fixed_milestone.planed_end_date.present?
            if start_date.present? && !(start_date.in? (fixed_milestone.effective_date..fixed_milestone.planed_end_date))
              errors.add(:start_date, "can not be greater than milestone date")
            elsif due_date.present? && !(due_date.in? (fixed_milestone.effective_date..fixed_milestone.planed_end_date))
              errors.add(:due_date, "can not be greater than milestone date")
            end
          end
        end
        private :check_issue_due_date

        def add_version
          self.update_column('fixed_version_id', fixed_milestone.version_id) if fixed_milestone.present?
        end
        private :add_version

        def milestone_check
          if project.present? && fixed_milestone.present?
            if !project.milestones.include?(fixed_milestone)
              self.errors.add(:base, "Please don't try to add milestone from other projects")
            end
          end
        end
        private :milestone_check

        def self.by_milestone(project)
          count_and_group_by(:project => project, :association => :fixed_milestone)
        end
      end
    end
  end
end
