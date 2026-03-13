# require_dependency 'application_helper' # Not needed in Rails 7

module RedmineFavoriteProjects
  module Patches

    module ApplicationHelperPatch

      def self.included(base) # :nodoc:
        base.send(:include, InstanceMethods)

        base.class_eval do
          # unloadable removed for Rails 7 compatibility
          alias_method :render_project_jump_box_without_only_favorites, :render_project_jump_box
          alias_method :render_project_jump_box, :render_project_jump_box_with_only_favorites
        end
      end

      module InstanceMethods
        def project_launch_page_url(project)
          # project_hrl = if User.current.allowed_to?(:view_home_monitoring_controlling, project, global: true)
          #   monitoring_controlling_project_path(project)
          # else
          #   project_path(project)
          # end
          project_url = project_path(project)
        end

        def render_project_issues_count(project, open_issues=nil)
          s = ''
          open_issues ||= project.issues.open
          if open_issues.any?
            s << "<div>" + l(:label_issue_plural) + ": " +
              link_to(l(:label_x_open_issues_abbr, :count => open_issues.count), :controller => 'issues', :action => 'index', :project_id => project, :set_filter => 1) +
              " <small>(" + l(:label_total) + ": #{project.issues.count})</small> "
            s << "</div>"
          end
          s.html_safe
        end

        # Adds a rates tab to the user administration page
        def render_project_jump_box_with_only_favorites
          return unless User.current.logged?
          favorite_projects_ids = FavoriteProject.where(:user_id => User.current.id).map(&:project_id)
          projects = Project.visible.where(:id => favorite_projects_ids)

          # If no favorites, fall back to original behavior
          if projects.empty?
            return render_project_jump_box_without_only_favorites
          end

          if projects.any?
            current_path = request.fullpath if respond_to?(:request) && request
            options_html = ''.html_safe
            options_html << content_tag(:option, l(:label_jump_to_a_project), :value => '')
            options_html << content_tag(:option, '---', :value => '', :disabled => 'disabled')
            options_html << project_tree_options_for_select(projects, :selected => @project) do |p|
              # Always jump to the selected project's root page as requested
              value_url = project_path(p)
              { :value => value_url }
            end
            content_tag(:select, options_html, :onchange => "var v=this.value; if(v&&v!==''){window.location=v;}")
          end        
        end
        
      end

    end
  end
end


# Ensure the patch is applied
Rails.configuration.to_prepare do
  unless ApplicationHelper.included_modules.include?(RedmineFavoriteProjects::Patches::ApplicationHelperPatch)
    ApplicationHelper.send(:include, RedmineFavoriteProjects::Patches::ApplicationHelperPatch)
  end
end
