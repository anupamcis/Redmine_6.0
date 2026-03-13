module IssuesControllerPatch
  def self.included(base)
    base.class_eval do
      # Insert overrides here, for example:
      def create_with_plugin
        create_without_plugin
        if !@issue.id.blank?
          #if !params[:issue][:start_date].blank? && !params[:issue][:due_date].blank? && !params[:issue][:time_begin].blank? && !params[:issue][:time_end].blank?
          if !params[:issue][:start_date].blank?  && !params[:issue][:time_begin].blank?
            tbegin = params[:issue][:start_date] + ' ' + params[:issue][:time_begin]
            #tend = params[:issue][:due_date] + ' ' + params[:issue][:time_end]
            tend = params[:issue][:time_begin].to_time + (params[:issue][:estimated_hours].to_f % @project.daily_hours.to_f).hours
            TicketTime.create({:issue_id => @issue.id, :time_begin => tbegin, :time_end => tend}) rescue nil
          end
        end
      end
      def update_with_plugin
        update_without_plugin
        if !@issue.id.blank?
          if !params[:issue][:start_date].blank? && !params[:issue][:due_date].blank? && !params[:issue][:time_begin].blank? && !params[:issue][:time_end].blank?
            tbegin = params[:issue][:start_date] + ' ' + params[:issue][:time_begin]
            tend = params[:issue][:due_date] + ' ' + params[:issue][:time_end]
            tt = TicketTime.where({:issue_id => @issue.id}).first rescue nil
            if tt.blank?
              tt = TicketTime.new({:issue_id => @issue.id})
            end
            tt.time_begin = tbegin
            tt.time_end = tend
            tt.save
          end
        end
      end
      if instance_methods.include?(:update)
        alias_method :update_without_plugin, :update
        alias_method :update, :update_with_plugin
      end
      if instance_methods.include?(:create)
        alias_method :create_without_plugin, :create
        alias_method :create, :create_with_plugin # This tells Redmine to allow me to extend show by letting me call it via "show_without_plugin" above.
      end
      # I can outright override it by just calling it "def show", at which case the original controller's method will be overridden instead of extended.

      def edit_issue_description
        respond_to do |format|
          # TODO: implement non-JS journal update
          format.js
        end
      end

      def sort
        ids = params["issue"]
        ppage = params[:page].to_i
        spage = session[:per_page].to_i
        inde = 1
        inde = (spage*(ppage - 1) + 1) if (ppage > 1 )
        issues = Issue.where(id: ids)
        ids.each.with_index(inde) do |issue_id, index|
          issue = issues.detect {|issue| issue.id == issue_id.to_i}
          issue.position = index
          issue.save(:validate => false)
        end
        respond_to do |format|
          format.js
        end
      end

      def spent_time
        issue_id = params[:issue_id]
        hours = params[:hours]
        activity_id = params[:activity_id]
        p_id = params[:id]
        project = Project.find_by_identifier(p_id)
        project_id = project.id
        date = User.current.today
        spent_on=(date)
        u = User.current
        t_time_log = u.time_entries.create({:issue_id => issue_id, :project_id => project_id,:hours => hours, :activity_id => activity_id, :spent_on => date })
        t_time_log.save
        respond_to do |format|
          format.js
        end
      end

      def spent_on=(date)
        tyear = spent_on ? spent_on.year : nil
        tmonth = spent_on ? spent_on.month : nil
        tweek = spent_on ? Date.civil(spent_on.year, spent_on.month, spent_on.day).cweek : nil
      end

      def update_issue_description
        update_issue_from_params
        saved = save_issue_with_child_records
        flash[:notice] = "description updated successfully"
        redirect_to issue_path(@issue)
      end
    end
  end
end
