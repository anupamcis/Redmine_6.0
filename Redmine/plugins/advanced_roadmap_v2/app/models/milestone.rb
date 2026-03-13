class Milestone < ActiveRecord::Base

  belongs_to :user
  belongs_to :project
  # has_many :milestone_versions, :dependent => :destroy
  belongs_to :version
  has_many :fixed_issues, :class_name => 'Issue', :foreign_key => 'fixed_milestone_id', :dependent => :nullify
  has_many :milestone_comments, :dependent => :destroy
  has_one :coordination_plan, as: :planable, :dependent => :destroy

  validates_presence_of :name
  validates_uniqueness_of :name, :case_sensitive => false, :scope => [:project_id]
  validates_length_of :name, :maximum => 60
  validates_presence_of :effective_date, :message => "^ Planed start date cannot be blank"
  validates :effective_date, :date => true, :allow_nil => true
  validates_presence_of :version
  validate :check_milestone_due_date
  validate :check_assocaited_issues_date, on: :update
  validate :version_check
  validate :check_plan_dates

  # safe_attributes :name, :description, :effective_date, :version_id,
  # :actual_start_date, :actual_end_date, :planed_end_date # Removed for Rails 5 compatibility

  scope :named, lambda {|arg| where("LOWER(#{table_name}.name) = LOWER(?)", arg.to_s.strip)}

  def to_s
    name
  end

  def start_date
    @start_date ||= fixed_issues.minimum('start_date')
  end

  def due_date
    effective_date
  end

  def deletable?
    fixed_issues.empty?
  end

  def check_plan_dates
    if effective_date.present? && planed_end_date.present?
      errors.add(:base, l(:check_milestone_plan_dates)) if (effective_date > planed_end_date)
    end
  end
  private :check_plan_dates

  def check_assocaited_issues_date
    if effective_date_changed? && Milestone.joins(:fixed_issues).where("(issues.start_date > ? or issues.due_date > ?)  and issues.fixed_milestone_id = ?", effective_date, effective_date,id).present?
      errors.add(:base, l(:assocaited_planed_start_date_errors))
    elsif planed_end_date_changed? && Milestone.joins(:fixed_issues).where("(issues.start_date > ? or issues.due_date > ?) and issues.fixed_milestone_id = ?", planed_end_date,planed_end_date,id).present?
      errors.add(:planed_end_date, l(:assocaited_date_errors))
    end
  end
  private :check_assocaited_issues_date

  def check_milestone_due_date
    if version.present? && version_id.present? && effective_date.present? && version.effective_date.present?
      if effective_date > version.effective_date
        errors.add(:base, l(:check_milestone_planed_date))
      elsif planed_end_date.present? && planed_end_date > version.effective_date
        errors.add(:planed_end_date, l(:check_milestone_due_date))
      end
    end
  end
  private :check_milestone_due_date

  def version_check
    if !project.versions.include?(version) && !version.nil?
      self.errors.add(:base, "Please don't try to add version from other projects")
    end
  end
  private :version_check

  def <=>(milestone)
    if self.effective_date
      milestone.effective_date ? (self.effective_date == milestone.effective_date ? self.name <=> milestone.name : self.effective_date <=> milestone.effective_date) : -1
    else
      milestone.effective_date ? 1 : (self.name <=> milestone.name)
    end
  end

  def versions?(version)
    versions.index(version) != nil
  end

  def completed?
    effective_date && (effective_date <= Date.today)
  end

  def add_coordination_plan
    stackholder = project.client_poc_for_project
    stackholder = stackholder.present? ? stackholder : ""
    self.build_coordination_plan({stackholder_name: stackholder,
        coordination_need: COORDINATION_NEED_MILESTONE + name.to_s,
        planed_date_of_receivables: planed_end_date,
        project_id: project_id})
  end

  def estimated_speed
    calculate_advance_info unless @progress_factor
    @progress_factor
  end

  def spent_hours
    @spent_hours ||= TimeEntry.joins(:issue).where("#{Issue.table_name}.fixed_milestone_id = ?", id).sum(:hours).to_f
  end

  def estimated_hours
    @estimated_hours ||= fixed_issues.sum(:estimated_hours).to_f
  end

  def parallel_factor
    factor = 1.0
    factor
  end

  def completed_percent
    calculate_advance_info unless @total_ratio
    @total_ratio
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

  def parallel_rest_hours
    rest_hours / parallel_factor
  end

  def parallel_speed_rest_hours
    speed_rest_hours / parallel_factor
  end

  def rest_hours
    calculate_advance_info unless @total_pending
    @total_pending
  end

  def speed_rest_hours
    calculate_advance_info unless @total_speed_pending
    @total_speed_pending
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

  def calculate_advance_info
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
          if fixed_issues.size > 0
            fixed_issues.each do |issue|
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

  def self.calculate_totals(milestone)
          totals = {}
          totals[:estimated_hours] = 0.0
          totals[:spent_hours] = 0.0
          totals[:rest_hours] = 0.0
          totals[:speed_rest_hours] = 0.0
          totals[:parallel_rest_hours] = 0.0
          totals[:parallel_speed_rest_hours] = 0.0
          totals[:completed_percent] = 0.0
          totals[:closed_percent] = 0.0
          totals[:estimated_hours] += milestone.estimated_hours
          totals[:spent_hours] += milestone.spent_hours
          totals[:rest_hours] += milestone.rest_hours
          totals[:speed_rest_hours] += milestone.speed_rest_hours
          totals[:parallel_rest_hours] += milestone.parallel_rest_hours
          totals[:parallel_speed_rest_hours] += milestone.parallel_speed_rest_hours
          totals[:completed_percent] += milestone.spent_hours
          totals[:closed_percent] += milestone.closed_spent_hours
          totals[:total] = totals[:spent_hours] + totals[:rest_hours]
          if totals[:total] > 0.0
            totals[:completed_percent] = (totals[:completed_percent] * 100.0) / totals[:total]
            totals[:closed_percent] = (totals[:closed_percent] * 100.0) / totals[:total]
          end
          totals
        end
end
