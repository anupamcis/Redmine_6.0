module OrgReports
  module WelcomeControllerPatch
    def self.included(base)
      base.send(:include, InstanceMethods)

      base.class_eval do
        unloadable
        if instance_methods.include?(:index)
          alias_method :index_without_org_reports, :index
          alias_method :index, :index_with_org_reports
        end
      end
    end

    module InstanceMethods
      def index_with_org_reports
        #Home page action existing data like news
        index_without_org_reports
        
        #Default parameters and filterd projects
        default_reports_params

        if @from.to_f > @to.to_f
          flash.now[:error] = "From filter can not be grater than to"
          return
        end

        projects_for_chart_data

        #Charts data loading methods
        technology_pie_chart_data
        cpi_and_spi_chart
        defect_density_numbers_chart_data
        percent_chart
      end
    end

    private
    def default_reports_params
      @from = params[:project_size_from] = params[:project_size_from] || Setting.plugin_org_reports['project_size_from'].to_i
      params[:enable_disable_bug_filter] = params[:enable_disable_bug_filter] || false
      params[:enable_bug_filter] = params[:enable_bug_filter] || "1"
      @to = params[:project_size_to] = params[:project_size_to] || Setting.plugin_org_reports['project_size_to'].to_i
      @issue_count = params[:number_of_bugs] = ((params[:enable_bug_filter] == "1" and params[:enable_disable_bug_filter] == "true") ? (params[:number_of_bugs] || Setting.plugin_org_reports['issue_count'].to_i) : 0)
      @percent_of_hours = params[:percent_of_hours] = ((params[:enable_bug_filter] == "2" and params[:enable_disable_bug_filter] == "true") ? (params[:percent_of_hours] || Setting.plugin_org_reports['bug_percent']+"%") : "")
      @user_involvement = params[:user_involvement] = params[:user_involvement] || Setting.plugin_org_reports['user_involvement']
    end

    def technology_pie_chart_data
      @final_data = []
      technology_wise_project_count = Project.where(id: @projects.map(&:id)).group('major_technology').count if @projects.present?
      if technology_wise_project_count.present?
        technology_wise_project_count.keys.each do |key|
          if key.present?
            @final_data << [key.to_s, technology_wise_project_count[key]]
          else
            @final_data << ["Without Technology", technology_wise_project_count[key]]
          end
        end
      end
    end

    def cpi_and_spi_chart
      @cpi_chart_projects = []
      @spi_chart_projects = []
      @cpi_chart_data = []
      @spi_chart_data = []
      if @projects.present?
        @projects.each do |project|
          cpi = project.project_spi_and_cpi.try(:cpi).to_i
          spi = project.project_spi_and_cpi.try(:spi).to_i
          @cpi_chart_projects << project.name unless cpi.nil?
          @spi_chart_projects << project.name unless spi.nil?
          cpi_color = cpi < 1 ? 'red' : 'green'
          spi_color = spi < 1 ? 'red' : 'green'
          @cpi_chart_data << {"y" => cpi, "id" => project.identifier, "color" => cpi_color}
          @spi_chart_data << {"y" => spi, "id" => project.identifier, "color" => spi_color}
        end
      end
    end

    def percent_chart
      @project_names = []
      @project_total_hours = []
      @project_bug_spent = []
      @percent_chart_data = []
      @service_total_hrs = []
      if @projects.present?
        @projects.each do |project|
          @project_names << project.name
          total_hours = project.time_entries.joins(:issue).where("issues.tracker_id <> ? ", 1).sum(:hours).round(2)
          bug_hours = project.time_entries.joins(:issue).where("issues.tracker_id = ? ", 1).sum(:hours).round(2)
          service_hours_total = project.services.first.total_hrs if project.services.present?
          # if total_hours != 0.0 && bug_hours != 0.0
            @project_total_hours << {y: total_hours, id: project.identifier }
            @project_bug_spent << {y: bug_hours, id: project.identifier }
            @service_total_hrs << {y: service_hours_total, id: project.identifier }
          # end
        end
      end
      @percent_chart_data << {name: "Total estimated hours", data: @service_total_hrs, color: 'green' }
      @percent_chart_data << {name: "Task spent hours", data: @project_total_hours, color: 'blue'}
      @percent_chart_data << {name: "Bug spent hours", data: @project_bug_spent, color: 'red' }
    end

    def defect_density_numbers_chart_data
      @project_numbers_names = []
      @project_number_of_bugs = []
      @numbers_chart_data = []
      @project_number_of_items = []
      if @projects.present?
        @projects.each do |project|
          @project_numbers_names << project.name
          project_item_count = project.issues.count
          project_bug_count = project.issues.where(tracker_id: 1).count
          @project_number_of_items << {y: (project_item_count - project_bug_count), id: project.identifier }
          @project_number_of_bugs << {y: project_bug_count, id: project.identifier}
        end
      end
      @numbers_chart_data << {name: "Other items", data: @project_number_of_items, color: 'grey'}
      @numbers_chart_data << {name: "Bug", data: @project_number_of_bugs, color: 'red'}
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

    def projects_for_chart_data
      @projects1 = User.current.admin? ? Project.where.not(id: 1) : User.current.projects.where.not(id: 1)
      @project_ids_with_hours_size = (@to.present? && @to.to_f > 0) ? @projects1.projects_with_hours_size(@to, @from).map(&:id) : []
      @indirect_project_ids = @projects1.projects_user_indirectly_connected(User.current.id).map(&:id).uniq
      @project_ids_with_count = (@issue_count.present? && @issue_count.to_i > 0) ? @projects1.projects_with_issue_count(@issue_count).map(&:id) : []
      @project_ids_with_bug_percent = (@percent_of_hours.present? && @percent_of_hours.to_i > 0) ? Project.query_with_bug_percent(@percent_of_hours.to_i, @projects1) : []

      oprator_condition = if @project_ids_with_hours_size.present? && (@project_ids_with_count | @project_ids_with_bug_percent).present?
        (:"&")
      else
        (:"|")
      end

      p1 = [@project_ids_with_hours_size, (@project_ids_with_count | @project_ids_with_bug_percent)]

      common_p = if @user_involvement == "Direct"
        p4 = @projects1.map(&:id) - @indirect_project_ids 
        p5 =  p1.inject(oprator_condition) - @indirect_project_ids
        when_only_filter(p4, p5)
      elsif @user_involvement == "Indirect"
        p4 = @indirect_project_ids
        p5 = p1.inject(oprator_condition) & @indirect_project_ids
        when_only_filter(p4, p5)
      else
        p5 = @projects1.map(&:id)
        when_only_filter(p5)
      end.uniq
      @projects = Project.where(id: common_p).joins(:services).where("services.service_type = ?", "PROJECT").uniq
    end
  end
end
