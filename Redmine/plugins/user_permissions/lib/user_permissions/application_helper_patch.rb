module UserPermissions
  module ApplicationHelperPatch
    def self.included(base)
      base.extend(ClassMethods)
      base.send(:include, InstanceMethods)

      base.class_eval do
        alias_method :link_to_project_without_user_permissions, :link_to_project
        alias_method :link_to_project, :link_to_project_with_user_permissions
        alias_method :render_project_jump_box_without_user_permissions, :render_project_jump_box
        alias_method :render_project_jump_box, :render_project_jump_box_with_user_permissions
      end
    end

    module ClassMethods
    end

    module InstanceMethods
      def link_to_project_with_user_permissions(project, options={}, html_options = {})
        if project.identifier != GLOBAL_PERMISSIONS_MODULE_NAME
          if project.archived?
            h(project.name)
          else
            link_to project.name,
              project_url(project, {:only_path => true}.merge(options)),
              html_options.merge({:title => strip_tags(project.try(:description))})
          end
        end
      end

      # Renders the project quick-jump box
      def render_project_jump_box_with_user_permissions
        return unless User.current.logged?
        projects = User.current.projects.where.not(identifier: GLOBAL_PERMISSIONS_MODULE_NAME).active.select(:id, :name, :identifier, :lft, :rgt).to_a
        if projects.any?
          options =
            ("<option value=''>#{ l(:label_jump_to_a_project) }</option>" +
             '<option value="" disabled="disabled">---</option>').html_safe

          options << project_tree_options_for_select(projects, :selected => @project) do |p|
            { :value => project_path(p) }
          end

          content_tag( :span, nil, :class => 'jump-box-arrow') +
          select_tag('project_quick_jump_box', options, :onchange => 'if (this.value != \"\") { window.location = this.value; }')
        end
      end
    end
  end
end
