require_dependency "issues_controller"

module AdvancedRoadmap
  module IssuesControllerPatch
    def self.included(base)
      base.class_eval do
      protected
  
        def render(options = nil, extra_options = {}, &block)
          if ((@action_name == "show") and
              (!(User.current.allowed_to?(:view_issue_estimated_hours, @project))) and
              (!(@journals.nil?)))
            @journals.each do |journal|
              journal.details.delete_if{|detail| detail.prop_key == "estimated_hours"}
            end
            @journals.delete_if{|journal| journal.details.empty?}
          end
          super(options, extra_options)
        end
  
      end
    end

    private
    def add_milestone_actual_dates(is_status_changed, issue, old_status)
      milestone = issue.fixed_milestone
      if !milestone.actual_start_date.present? && is_status_changed && !issue.status_id.eql?(1)
        milestone.update_column(:actual_start_date, issue.updated_on)
      end
      if milestone.present? && !milestone.actual_end_date.present? && issue.status.name == "Closed" && milestone.fixed_issues.open.count == 0
        milestone.milestone_comments.build(comment: MILESTONE_CLOSING_COMMENT, changed_date: issue.updated_on, previous_date: milestone.actual_end_date,
        author_id: User.current.id, field_name: "actual_end_date")
        milestone.actual_end_date = issue.updated_on
        milestone.save
      elsif milestone.present? && old_status.name = "Closed" && issue.status.name != "Closed" && milestone.actual_end_date.present? && milestone.fixed_issues.open.count > 0
        milestone.milestone_comments.build(comment: MILESTONE_REOPEN_COMMENT, changed_date: nil, previous_date: milestone.actual_end_date,
        author_id: User.current.id, field_name: "actual_end_date")
        milestone.actual_end_date = nil
        milestone.save
      end
    end
  end
end
