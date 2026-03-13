module MyControllerPatch
  def self.included(base)

    base.send(:include, InstanceMethods)
    base.class_eval do
      # include ProjectAndVersionValue
      # alias_method_chain :index, :org_reports
      def page
        @user = User.current
        # @blocks = @user.pref[:my_page_layout] ||  {'left' => ['issuesassignedtome'],'right' => ['issuesreportedbyme']}.freeze
        # default_reports_params
        # projects_for_chart_data
        @uhs = UserHierarchy.joins("INNER JOIN users AS child ON user_hierarchies.child_id = child.id INNER JOIN users AS parent ON user_hierarchies. parent_id = parent.id").select("user_hierarchies.*, CONCAT(parent.firstname, ' ', SUBSTRING(parent.lastname, 1, 1)) AS pname, CONCAT(child.firstname, ' ', SUBSTRING(child.lastname, 1, 1)) AS cname")
        valid_manager =  User.current.self_and_descendents.map(&:id).include?(params[:project_manager].try(:to_i)) unless User.current.admin?
        @all_projects = if params[:project_manager] && !User.current.is_client? && (User.current.admin? || valid_manager)
          Project.joins(memberships: :member_roles).where("member_roles.role_id=9 AND members.user_id=#{params[:project_manager]}")
        elsif User.current.admin?
           Project.where.not(id: 1)
        else
           User.current.projects.where.not(id: 1)
        end

        #if User.current.allowed_to?(:project_paid_hours_reports, nil, global: true)
          # pm = "SELECT projects.id, CONCAT(users.firstname, ' ', SUBSTRING(users.lastname, 1, 1))  FROM users LEFT JOIN members ON members.user_id = users.id LEFT JOIN member_roles ON member_roles.member_id = members.id LEFT JOIN projects ON projects.id = members.project_id WHERE (member_roles.role_id = 9)"
          # @project_managers = ActiveRecord::Base.connection.exec_query(pm).rows.to_h
          #if User.current.admin?
           # @projects = @all_projects.where(status: 1).includes(:services, :time_entries ,issues: :status)
           # @hierarchy_projects = []
          #else
            #project_ids = User.current.group_hierarchies.pluck(:project_id)
            #@projects = @all_projects.where.not(id: project_ids).where(status: 1).includes(:company, :services, :time_entries, issues: :status)
            # @hierarchy_projects = User.current.projects.where.not(id: 1).where(id: project_ids, status: 1).includes(:company, :services, :time_entries, issues: :status)
            # @hierarchy_project_count = @hierarchy_projects.size
            # @hierarchy_project_limit = per_page_option
            # @hierarchy_project_pages =  Redmine::Pagination::Paginator.new @hierarchy_project_count, @hierarchy_project_limit, params['page']
            # @hierarchy_project_offset ||= @hierarchy_project_pages.offset
            # @hierarchy_projects = @hierarchy_projects.offset(@hierarchy_project_offset).limit(@hierarchy_project_limit)
          #end
          #@project_count = @projects.size
          #@limit = per_page_option
          #@project_pages = Redmine::Pagination::Paginator.new @project_count, @limit, params['page']
          #@offset ||= @project_pages.offset
          #@projects = @projects.offset(@offset).limit(@limit)
        #end
        technology_pie_chart_data
      end
    end
  end

  module InstanceMethods
    def technology_pie_chart_data
      all_projects = params[:project_manager].present? ?  (User.current.admin? ? Project.where.not(id: 1) : User.current.projects.where.not(id: 1)) : @all_projects
      @org_active_projects_chart_data, @org_all_projects_chart_data =
        User.current.admin? ? get_project(all_projects) : get_project(Project.where.not(id: 1))
      @active_projects_chart_data = get_project(all_projects, true)
    end

    def get_project(projects, active_only = false)
      active_project =  projects.select{|p| p.status == 1 }
      active_project_ids = active_project.map(&:id).join(',')
      query = active_only ? "SELECT ISNULL(p.major_technology, 'Others') AS major_technology, SUM(i.estimated_hours) * 100.0 / SUM(SUM(i.estimated_hours)) OVER () AS Percentage FROM projects p INNER JOIN issues i ON p.id =i.project_id where estimated_hours is not null AND p.id IN (#{active_project_ids}) group by p.major_technology" :
      "SELECT * FROM OrgActiveProjects oap"
      query1 = "SELECT * FROM OrgAllProjects oap"
      begin
         active_projects_chart_data = ActiveRecord::Base.connection.exec_query(query).rows if active_project_ids.present?
      rescue
        active_projects_chart_data = 0
      end   
      all_projects_chart_data = ActiveRecord::Base.connection.exec_query(query1).rows unless active_only
      active_only ? active_projects_chart_data : [active_projects_chart_data, all_projects_chart_data]
    end

    def default_reports_params
      @from = params[:project_size_from] = params[:project_size_from] || Setting.plugin_org_reports['project_size_from'].to_i
      params[:enable_disable_bug_filter] = params[:enable_disable_bug_filter] || false
      params[:enable_bug_filter] = params[:enable_bug_filter] || "1"
      @to = params[:project_size_to] = params[:project_size_to] || Setting.plugin_org_reports['project_size_to'].to_i
      @issue_count = params[:number_of_bugs] = ((params[:enable_bug_filter] == "1" and params[:enable_disable_bug_filter] == "true") ? (params[:number_of_bugs] || Setting.plugin_org_reports['issue_count'].to_i) : 0)
      @percent_of_hours = params[:percent_of_hours] = ((params[:enable_bug_filter] == "2" and params[:enable_disable_bug_filter] == "true") ? (params[:percent_of_hours] || Setting.plugin_org_reports['bug_percent']+"%") : "")
      @user_involvement = params[:user_involvement] = params[:user_involvement] || Setting.plugin_org_reports['user_involvement']
    end


    def when_only_filter(p4=[], p5)
      if (!@issue_count.present? or @issue_count.to_i == 0) && (!@percent_of_hours.present? or @percent_of_hours.to_i == 0) and (@to.present? and @to.to_f > 0) and !@user_involvement.present?
        @project_ids_with_hours_size
      elsif (!@to.present? or @to.to_f == 0) and (!@percent_of_hours.present? or @percent_of_hours.to_i == 0) and (@issue_count.present? and @issue_count.to_i > 0) and !@user_involvement.present?
        @project_ids_with_count
      elsif (!@to.present? or @to.to_f == 0) and (!@issue_count.present? or @issue_count.to_i == 0) and (@percent_of_hours.present? and @percent_of_hours.to_i > 0) and !@user_involvement.present?
        @project_ids_with_bug_percent
      elsif (!@to.present? or @to.to_f == 0) and (!@issue_count.present? or @issue_count.to_i == 0) and (!@percent_of_hours.present? or @percent_of_hours.to_i == 0) and @user_involvement.present?
        p4
      else
        p5
      end
    end
  end
end

