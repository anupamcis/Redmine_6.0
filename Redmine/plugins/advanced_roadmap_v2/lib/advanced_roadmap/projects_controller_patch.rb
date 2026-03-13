module AdvancedRoadmap
  module ProjectsControllerPatch
    def self.included(base)
      base.class_eval do

        def show_with_plugin
          # try to redirect to the requested menu item
          if params[:jump] && redirect_to_project_menu_item(@project, params[:jump])
            return
          end
          @users_by_role = @project.principals_by_role
          @principals_by_role = @users_by_role
          @subprojects = @project.children.visible.to_a
          @news = @project.news.limit(5).includes(:author, :project).reorder("#{News.table_name}.created_on DESC").to_a
          @trackers = @project.rolled_up_trackers.visible

          cond = @project.project_condition(Setting.display_subprojects_issues?)
          bug_category_ids = @project.issues.where.not(bug_category_id: nil).distinct.pluck(:bug_category_id)
          @bug_categories = BugCategory.where(id: bug_category_ids)

          @total_issues_by_tracker = Issue.visible.where(cond).group(:tracker).count
          @open_issues_by_tracker = Issue.visible.open.where(cond).group(:tracker).count

          @total_issues_by_milestone = Issue.visible.where(cond).where.not(fixed_milestone_id: nil).group(:fixed_milestone).count
          @open_issues_by_milestone = Issue.visible.open.where(cond).where.not(fixed_milestone_id: nil).group(:fixed_milestone).count

          @total_issues_by_priority = Issue.visible.where(cond).group(:priority).count
          @total_issues_by_assigned_to = Issue.visible.where(cond).group(:assigned_to_id).count
          if User.current.allowed_to_view_all_time_entries?(@project)
            @total_hours = TimeEntry.visible.where(cond).sum(:hours).to_f
          end

          @key = User.current.respond_to?(:rss_key) ? User.current.rss_key : nil

          @milestones = @project.milestones
          @priorities = IssuePriority.all.reverse

          @assignees = (Setting.issue_group_assignment? ? @project.principals : @project.users).sort
          @issues_by_priority = Issue.by_priority(@project)
          @issues_by_assigned_to = Issue.by_assigned_to(@project)
          @issues_by_subproject = Issue.by_subproject(@project) || []
          bugs =  @project.issues.where('tracker_id = 1')
          if bugs.present?
            bug_count = {}
            id_to_name = BugCategory.where(id: bugs.where.not(bug_category_id: nil).distinct.pluck(:bug_category_id)).pluck(:id, :name).to_h
            bugs.group_by(&:bug_category_id).each do |bug_cat_id, list|
              if bug_cat_id.nil?
                bug_count['Logic error'] = (bug_count['Logic error'].to_f + list.count)
              else
                name = id_to_name[bug_cat_id] || 'Unknown'
                bug_count[name] = (bug_count[name].to_f + list.count)
              end
            end
            @issue_with_bug_percent = bug_count.map{|k,v| [k, (v.to_f*100/bugs.size.to_f).round(2)]}.to_h
          end

          array =  [{'id': '0.0',
            'parent': '',
            'name': @project.name}]

            versions = @project.versions
            i = '1.0'
            k = '2.0'
            j ='3.0'

            versions.each_with_index do |version, index|
              i = i.split('.').first+ '.' + (i.split('.').last.to_i + 1).to_s
              data  = {'id': i, 'parent': '0.0', 'name': version.name }
              array.push(data)
              version.milestones.each do |milestone|
                k = k.split('.').first+ '.' + (k.split('.').last.to_i + 1).to_s

                miles = {'id': k, 'parent': i, 'name': milestone.name, value: milestone.fixed_issues.open.size}
                array.push(miles);
                # milestone.fixed_issues.each do |issue|
                #   j = j.split('.').first+ '.' + (j.split('.').last.to_i + 1).to_s
                #   iss = {'id': j, 'parent': k, 'name': issue.subject}
                #   array.push(iss)
                # end
              end
            end
            @data_sunburst= array.to_json
          #end
          respond_to do |format|
            format.html
            format.api
          end
        end

        def report_details
          @statuses = IssueStatus.sorted.to_a
          case params[:detail]
          when "tracker"
            @field = "tracker_id"
            @rows = @project.rolled_up_trackers(false).visible
            @data = Issue.by_tracker(@project)
            @report_title = l(:field_tracker)
          when "version"
            @field = "fixed_version_id"
            @rows = @project.shared_versions.sort
            @data = Issue.by_version(@project)
            @report_title = l(:field_version)
          when "priority"
            @field = "priority_id"
            @rows = IssuePriority.all.reverse
            @data = Issue.by_priority(@project)
            @report_title = l(:field_priority)
          when "category"
            @field = "category_id"
            @rows = @project.issue_categories
            @data = Issue.by_category(@project)
            @report_title = l(:field_category)
          when "assigned_to"
            @field = "assigned_to_id"
            @rows = (Setting.issue_group_assignment? ? @project.principals : @project.users).sort
            @data = Issue.by_assigned_to(@project)
            @report_title = l(:field_assigned_to)
          when "author"
            @field = "author_id"
            @rows = @project.users.sort
            @data = Issue.by_author(@project)
            @report_title = l(:field_author)
          when "subproject"
            @field = "project_id"
            @rows = @project.descendants.visible
            @data = Issue.by_subproject(@project) || []
            @report_title = l(:field_subproject)
          end

          respond_to do |format|
            if @field
              format.html {}
            else
              format.html { redirect_to :action => 'show', :id => @project }
            end
          end
        end

        def close_with_plugin
          @project.update_project_status(params[:project_status].to_i)
          redirect_to project_path(@project)
        end

        if instance_methods.include?(:close)
          alias_method :close_without_plugin, :close
          alias_method :close, :close_with_plugin
        end
        if instance_methods.include?(:show)
          alias_method :show_without_plugin, :show
          alias_method :show, :show_with_plugin
        end
      end
    end
  end
end
