require_dependency "version"

module AdvancedRoadmap
  module VersionPatch
    def self.included(base)
      base.class_eval do
  
        # has_many :milestone_versions, :dependent => :destroy
        has_many :milestones#, :through => :milestone_versions
        validates_presence_of :effective_date
        # validate :check_assocaited_milestones_date, on: :update

        def deletable_with_advance_info?
          milestones.empty? && !referenced_by_a_custom_field?
        end
        alias_method :deletable_without_advance_info?, :deletable?
        alias_method :deletable?, :deletable_with_advance_info?

        def check_assocaited_milestones_date
          if Version.joins(:milestones).where("milestones.effective_date > ? or milestones.planed_end_date > ? and milestones.version_id = ?", effective_date, effective_date, id).present?
            errors.add(:effective_date, l(:due_date_grater_than_milestone_date))
          end
        end
        private :check_assocaited_milestones_date

        def load_issue_counts_with_advanced_info
          unless @issue_count
            @open_issues_count = 0
            @closed_issues_count = 0
            Issue.where(fixed_milestone_id: milestones.ids).group(:status).count.each do |status, count|
              if status.is_closed?
                @closed_issues_count += count
              else
                @open_issues_count += count
              end
            end
            @issue_count = @open_issues_count + @closed_issues_count
          end
        end
        if instance_methods.include?(:load_issue_counts)
          alias_method :load_issue_counts_without_advanced_info, :load_issue_counts
          alias_method :load_issue_counts, :load_issue_counts_with_advanced_info
          private :load_issue_counts
        end
  
        def milestones?(milestone)
          milestones.index(milestone) != nil
        end

        def estimated_hours_with_advanced_info
          @estimated_hours ||= milestones.collect {|milestone| milestone.fixed_issues.sum(:estimated_hours).to_f}.sum
        end
        if instance_methods.include?(:estimated_hours)
          alias_method :estimated_hours_without_advanced_info, :estimated_hours
          alias_method :estimated_hours, :estimated_hours_with_advanced_info
        end

        def spent_hours_with_advanced_info
          @spent_hours ||= TimeEntry.joins(:issue).where("#{Issue.table_name}.fixed_milestone_id IN (?)", milestones.ids).sum(:hours).to_f
        end
        if instance_methods.include?(:spent_hours)
          alias_method :spent_hours_without_advanced_info, :spent_hours
          alias_method :spent_hours, :spent_hours_with_advanced_info
        end
  
        def completed_percent_with_advanced_info
          calculate_advance_info unless @total_ratio
          @total_ratio
        end
        if instance_methods.include?(:completed_percent)
          alias_method :completed_percent_without_advanced_info, :completed_percent
          alias_method :completed_percent, :completed_percent_with_advanced_info
        end
  
        def closed_percent_with_advanced_info
          calculate_advance_info unless @total_finished_ratio
          @total_finished_ratio
        end
        if instance_methods.include?(:closed_percent)
          alias_method :closed_percent_without_advanced_info, :closed_percent
          alias_method :closed_percent, :closed_percent_with_advanced_info
        end
  
        def rest_hours
          calculate_advance_info unless @total_pending
          @total_pending
        end
  
        def estimated_speed
          calculate_advance_info unless @progress_factor
          @progress_factor
        end
  
        def closed_spent_hours
          if !@closed_spent_hours
            @closed_spent_hours = 0.0
            fixed_issues.each do |issue|
              if issue.closed?
                @closed_spent_hours += issue.spent_hours
              end
            end
          end
          @closed_spent_hours
        end
  
        def calculate_advance_info
          fixed_issues1 = []
          milestones.collect {|m| fixed_issues1 << m.fixed_issues }
          total_estimated = 0.0
          total_spent = 0.0
          @total_pending = 0.0
          @total_speed_pending = 0.0
          total_partial_pending = 0.0
          total_full_pending = 0.0
          @total_finished_ratio = 0.0
          @total_ratio = 0.0
          solved_issues = 0
          total_solved_estimated = 0.0
          total_solved_spent = 0.0
          if fixed_issues1.flatten.size > 0
            fixed_issues1.flatten.each do |issue|
              if issue.children.empty?
                if issue.estimated_hours && issue.done_ratio
                  ratio = issue.spent_hours / ((issue.estimated_hours * issue.done_ratio) / 100.0)
                end
                total_estimated += issue.estimated_hours ? issue.estimated_hours : 0.0
                total_spent += issue.spent_hours ? issue.spent_hours : 0.0
                if issue.spent_hours and issue.spent_hours > 0.0
                  total_partial_pending += issue.rest_hours ? issue.rest_hours : 0.0
                else
                  total_full_pending += issue.rest_hours ? issue.rest_hours : 0.0
                end
                if issue.closed?
                  solved_issues += 1
                  total_solved_estimated += issue.estimated_hours ? issue.estimated_hours : 0.0
                  total_solved_spent += issue.spent_hours ? issue.spent_hours : 0.0
                end
                if issue.spent_hours && issue.rest_hours
                  issue_time = (issue.spent_hours + issue.rest_hours) * issue.done_ratio
                  if issue.closed?
                    @total_finished_ratio += issue_time
                  end
                  @total_ratio += issue_time
                end
              end
            end
            if solved_issues < Setting.plugin_advanced_roadmap_v2["solved_issues_to_estimate"].to_i or total_solved_estimated == 0.0
              @progress_factor = nil
            else
              @progress_factor = total_solved_spent / total_solved_estimated
            end
            if total_spent + total_partial_pending + total_full_pending > 0.0
              @total_pending = total_partial_pending + total_full_pending
              @total_speed_pending = total_partial_pending + (total_full_pending * (@progress_factor.nil? ? 1.0 : @progress_factor))
              @total_finished_ratio /= (total_spent + @total_pending)
              @total_ratio /= (total_spent + @total_pending)
            else
              @total_finished_ratio = 0.0
              @total_ratio = 0.0
            end
          end
        end
  
        def sorted_fixed_issues(options = {})
          issues = []
          conditions = {:parent_id => options[:parent]}
          conditions[:tracker_id] = options[:trackers] if options[:trackers]
          fixed_issues.visible.where(conditions)\
                      .joins([:status, :tracker, :priority])\
                      .order("#{Tracker.table_name}.position, #{Issue.table_name}.subject")\
                      .find_each do |issue|
            issues << issue
            issues += sorted_fixed_issues(options.merge(:parent => issue))
          end
          issues
        end
  
        def parallel_factor
          factor = 1.0
          factor
        end
  
        def parallel_rest_hours
          rest_hours / parallel_factor
        end
  
        def speed_rest_hours
          calculate_advance_info unless @total_speed_pending
          @total_speed_pending
        end
  
        def parallel_speed_rest_hours
          speed_rest_hours / parallel_factor
        end
  
        def self.sort_versions(versions)
          if versions.is_a? Array
            versions.sort!{|a, b|
              if !a.effective_date.nil? and !b.effective_date.nil?
                a.effective_date <=> b.effective_date
              elsif a.effective_date.nil? and !b.effective_date.nil?
                1
              elsif !a.effective_date.nil? and b.effective_date.nil?
                -1
              elsif a.rest_hours != b.rest_hours
                a.rest_hours <=> b.rest_hours
              else
                a.name.downcase <=> b.name.downcase
              end
            }
          else
            versions.order([:effective_date, :rest_hours, :name])
          end
        end
        
        def self.calculate_totals(versions)
          totals = {}
          totals[:estimated_hours] = 0.0
          totals[:spent_hours] = 0.0
          totals[:rest_hours] = 0.0
          totals[:speed_rest_hours] = 0.0
          totals[:parallel_rest_hours] = 0.0
          totals[:parallel_speed_rest_hours] = 0.0
          totals[:completed_percent] = 0.0
          totals[:closed_percent] = 0.0
          versions.each do |version|
            totals[:estimated_hours] += version.estimated_hours
            totals[:spent_hours] += version.spent_hours
            totals[:rest_hours] += version.rest_hours
            totals[:speed_rest_hours] += version.speed_rest_hours
            totals[:parallel_rest_hours] += version.parallel_rest_hours
            totals[:parallel_speed_rest_hours] += version.parallel_speed_rest_hours
            totals[:completed_percent] += version.spent_hours
            totals[:closed_percent] += version.closed_spent_hours
          end
          totals[:total] = totals[:spent_hours] + totals[:rest_hours]
          if totals[:total] > 0.0
            totals[:completed_percent] = (totals[:completed_percent] * 100.0) / totals[:total]
            totals[:closed_percent] = (totals[:closed_percent] * 100.0) / totals[:total]
          end
          totals
        end
        
      end
    end
  end
end
