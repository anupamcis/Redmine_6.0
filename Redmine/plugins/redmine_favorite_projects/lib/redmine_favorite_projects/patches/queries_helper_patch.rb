module RedmineFavoriteProjects
  module Patches
    module QueriesHelperPatch
      def self.included(base)
        base.send(:include, InstanceMethods)

        base.class_eval do
          # unloadable removed for Rails 7 compatibility
          alias_method :column_value_without_favorite_projects, :column_value
          alias_method :column_value, :column_value_with_favorite_projects
        end
      end

      module InstanceMethods
        def column_value_with_favorite_projects(column, list_object, value)
          if column.name == :id  && list_object.is_a?(Project)
            project_url = respond_to?(:project_launch_page_url) ? project_launch_page_url(list_object) : project_path(list_object)
            link_to value, project_url
          elsif column.name == :name && list_object.is_a?(Project)
            project_url = respond_to?(:project_launch_page_url) ? project_launch_page_url(list_object) : project_path(list_object)
            link_to value, project_url
          elsif column.name == :description && list_object.is_a?(Project)
            # content_tag(:span, list_object.short_description.html_safe)
            list_object.short_description.present? ? content_tag('div', textilizable(list_object.description.html_safe), :class => "wiki") : ''
          elsif column.name == :created_on && list_object.is_a?(Project)
            format_date(list_object.created_on)
          elsif column.name == :status && list_object.is_a?(Project)
            case value
            when Project::STATUS_ACTIVE
              l(:project_status_active)
            when Project::STATUS_CLOSED
              l(:project_status_closed)
            when Project::STATUS_ARCHIVED
              l(:project_status_archived)
            else
              value
            end
          elsif column.name == :estimated_hours || column.name == :total_estimated_hours || column.name == :spent_hours || column.name == :total_spent_hours
            value.nil? ? format_object(0.0) : format_object(value.to_f)
          elsif column.name == :tags && list_object.is_a?(Project)
            project_tags = []
            value.each do |tag|
              project_tags << tag.name
            end
            project_tags.join(", ")
          else
            column_value_without_favorite_projects(column, list_object, value)
          end
        end

      end

    end
  end
end

unless QueriesHelper.included_modules.include?(RedmineFavoriteProjects::Patches::QueriesHelperPatch)
  QueriesHelper.send(:include, RedmineFavoriteProjects::Patches::QueriesHelperPatch)
end
