namespace :redmine do
  namespace :notifications do
    desc "Check project inactivity and send notifications to project managers"
    task check_inactivity: :environment do
      puts "Checking project inactivity..."
      
      # Get all active projects
      projects = Project.where(status: Project::STATUS_ACTIVE)
      
      projects.each do |project|
        # Get last activity date from project activities:
        # 1. Task/Issue status updates (when issue is updated)
        # 2. Task comments (journals - comments on issues)
        # 3. Daily status updates
        
        # Task status updates - when any issue is updated (status change, assignment, etc.)
        last_issue = project.issues.order(updated_on: :desc).first
        
        # Task comments - get the latest journal entry from all issues in the project
        # Journals contain both comments and status change notes
        last_journal = nil
        if project.issues.exists?
          # Get the latest journal from all issues in this project
          last_journal = Journal.joins(:issue)
                                .where(issues: { project_id: project.id })
                                .order(created_on: :desc)
                                .first
        end
        
        # Daily status updates - if daily status plugin is available
        last_daily_status = nil
        if project.respond_to?(:daily_statuses) && project.daily_statuses.respond_to?(:order)
          begin
            last_daily_status = project.daily_statuses.order(created_at: :desc).first
          rescue => e
            # Daily statuses might not be available, ignore error
            Rails.logger.debug("Could not fetch daily statuses for project #{project.id}: #{e.message}")
          end
        end
        
        # Compile all activity dates - use the most recent one
        activity_dates = [
          last_issue&.updated_on,
          last_journal&.created_on,
          last_daily_status&.created_at
        ].compact
        
        last_activity_date = activity_dates.max
        
        # If no activity at all, use project creation date
        last_activity_date ||= project.created_on
        
        next unless last_activity_date
        
        # Calculate days inactive
        days_inactive = (Date.today - last_activity_date.to_date).to_i
        
        # Determine inactivity category
        inactivity_category = case days_inactive
        when 0
          nil # Active today
        when 1
          'inactivity_1_day'
        when 2
          'inactivity_2_days'
        when 3..6
          'inactivity_1_week'
        when 7..14
          'inactivity_1_week'
        when 15..29
          'inactivity_15_days'
        when 30..364
          'inactivity_1_month'
        else
          'inactivity_1_year'
        end
        
        # Check if project has no activity at all
        if last_activity_date == project.created_on && days_inactive > 0
          inactivity_category = 'inactivity_no_activity'
        end
        
        next unless inactivity_category
        
        # Get project manager
        project_manager = Notification.get_project_manager(project)
        next unless project_manager
        
        # Create notification
        begin
          Notification.create_inactivity_notification(
            project,
            inactivity_category,
            days_inactive
          )
          puts "Created notification for project: #{project.name} (#{inactivity_category}, #{days_inactive} days)"
        rescue => e
          puts "Error creating notification for project #{project.name}: #{e.message}"
        end
      end
      
      puts "Inactivity check completed."
    end
  end
end

