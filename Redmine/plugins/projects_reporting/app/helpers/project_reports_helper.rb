module ProjectReportsHelper

	def project_reports_settings_tabs
    tabs = []
	tabs << {:name => 'projects', :partial => 'project_reports/projects', :label => :label_projects}
	tabs << {:name => 'hierarchy_projects', :partial => 'project_reports/hierarchy_projects', :label => :label_hierarchy_projects}
    tabs << {:name => 'untouched_projects', :partial => 'project_reports/untouched_projects', :label => :label_untouched_projects}
    tabs << {:name => 'delayed_by', :partial => 'project_reports/delayed_by', :label => :label_delayed_by_projects}
    tabs << {:name => 'user_projects', :partial => 'project_reports/user_projects', :label => :label_user_projects}
    tabs
  end

	def due_date_tag(date)
		content_tag(:time, due_date_distance_in_words(date), :class => (date < Date.today ? 'progressive-overdue' : nil), :title => date)
	end

	def user_roles(project,user_id)
		project.members.where(user_id: user_id).first.roles.where("roles.name not like (?)", "%#{'CIS -'}%").join(", ")
	end

	def build_hierarchy target_array, n, level
		@uhs.select { |h| h[:parent_id] == n }.map do |h|
		  { "data-value" => h[:child_id], name: h.cname, level: level, children: build_hierarchy([], h[:child_id], level+1)}
		end
	end
	
	def all_value(users_hash)
		@all_records ||= []
		users_hash.each do |key|
		  classes = params[:project_manager].eql?(key['data-value'].to_s) ? "level-#{key[:level]} active"  : "level-#{key[:level]}"
		  @all_records << "<li data-value=#{key['data-value']} data-level=#{key[:level]} class=#{classes}><a href=#{project_reports_path}?tab=projects&project_manager=#{key['data-value']} class='onclick' id=#{key['data-value']}> #{key[:name]}</a> </li>"
		  all_value(key[:children]) if key[:children].present?
		end
		@all_records
	  end

end
