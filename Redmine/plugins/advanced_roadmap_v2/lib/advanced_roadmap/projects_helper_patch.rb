require_dependency "projects_helper"

module AdvancedRoadmap
  module ProjectsHelperPatch
    def self.included(base)
      base.class_eval do

        def project_status_drop_down_values(selected)
          options = []
          options << [l(:project_status_active), Project::STATUS_ACTIVE] if defined?(Project::STATUS_ACTIVE)
          options << [l(:project_status_closed), Project::STATUS_CLOSED] if defined?(Project::STATUS_CLOSED)
          options << [l(:project_status_onhold), Project::STATUS_ONHOLD] if defined?(Project::STATUS_ONHOLD)
          options << [l(:project_status_complete), Project::STATUS_COMPLETE] if defined?(Project::STATUS_COMPLETE)
          options << [l(:project_status_cancel), Project::STATUS_CANCELLED] if defined?(Project::STATUS_CANCELLED)
          options_for_select(options, selected.to_s)
        end

        def project_settings_tabs_with_more_tabs
          tabs = project_settings_tabs_without_more_tabs
          index = tabs.index { |t| t[:name].to_s == 'versions' }
          if index
            tabs.insert(index, {:name => "milestones", :action => :manage_milestones, :partial => "projects/settings/milestones", :label => :label_milestone_plural})
            tabs.select {|tab| User.current.allowed_to?(tab[:action], @project)}     
          end
          return(tabs)
        end

        def aggregate_path(project, field, row, options={})
          parameters = {:set_filter => 1, :subproject_id => '!*', field => row.id}.merge(options)
          project_issues_path(row.is_a?(Project) ? row : project, parameters)
        end

          def aggregate(data, criteria)
            a = 0
            data.each { |row|
              match = 1
              criteria.each { |k, v|
                match = 0 unless (row[k].to_s == v.to_s) || (k == 'closed' &&  (v == 0 ? ['f', false] : ['t', true]).include?(row[k]))
              } unless criteria.nil?
              a = a + row["total"].to_i if match == 1
            } unless data.nil?
            a
          end

          def aggregate_link(data, criteria, *args)
            a = aggregate data, criteria
            a > 0 ? link_to(h(a), *args) : '-'
          end

        if instance_methods.include?(:project_settings_tabs)
          alias_method :project_settings_tabs_without_more_tabs, :project_settings_tabs
          alias_method :project_settings_tabs, :project_settings_tabs_with_more_tabs
        end
      end
    end
  end
end
