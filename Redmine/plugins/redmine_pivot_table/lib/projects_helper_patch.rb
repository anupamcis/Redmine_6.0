require_dependency 'projects_helper'

module RedminePivotTable
  module ProjectsHelperPatch

    def render_project_action_links
      links = []
      if User.current.admin?
        links << link_to(l(:label_project_new), new_project_path, :class => 'icon icon-add')
      end
      if User.current.allowed_to?(:view_issues, nil, :global => true)
        links << link_to(l(:label_issue_view_all), issues_path, :class => 'view_all_tasks')
        if User.current.allowed_to?(:view_pivottables, nil, :global => true)
          links << link_to(l(:label_pivottables), pivottables_path, :class => 'pivot')
        end
      end
      if !@query.new_record? && @query.editable_by?(User.current)
       links << link_to(l(:button_projects_edit_query), edit_favorite_project_query_path(@query), :class => 'icon icon-edit')
       links << link_to(l(:button_projects_delete_query), favorite_project_query_path(@query), :confirm => l(:text_are_you_sure), :method => :delete, :class => 'icon icon-del')
      end
      if User.current.allowed_to?(:view_time_entries, nil, :global => true)
        links << link_to(l(:label_overall_spent_time), time_entries_path, :class => 'view_overall_spent_time')
      end
      links << link_to(l(:label_overall_activity), activity_path, :class => 'view_overall_activity')
      links.join(" | ").html_safe
    end
  end
end

module ProjectsHelper
  prepend RedminePivotTable::ProjectsHelperPatch
end

# Zeitwerk expects ProjectsHelperPatch at root level based on file path
ProjectsHelperPatch = RedminePivotTable::ProjectsHelperPatch