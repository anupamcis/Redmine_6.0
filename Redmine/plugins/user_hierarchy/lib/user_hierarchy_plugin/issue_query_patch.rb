module UserHierarchyPlugin
  module IssueQueryPatch
    def self.included(base)
      base.send(:include, InstanceMethods)

      base.class_eval do
        unloadable
        self.available_columns << QueryColumn.new(:name, :caption => :field_bug_category)
        self.available_columns << QueryColumn.new(:actual_start_date, :caption => :field_actual_start_date)
        self.available_columns << QueryColumn.new(:actual_end_date, :caption => :field_actual_end_date)

        alias_method :initialize_available_filters_without_user_hierarchies, :initialize_available_filters
        alias_method :initialize_available_filters, :initialize_available_filters_with_user_hierarchies
      end
    end

    module InstanceMethods
      def initialize_available_filters_with_user_hierarchies
        principals = []
        subprojects = []
        versions = []
        categories = []
        issue_custom_fields = []
        default_group_users = Group.where(lastname: DEFAULT_MEMBER_GROUP).first.try(:users)

        if project
          project_principals = project.principals
          principals += (project_principals.respond_to?(:visible) ? project_principals.visible : project_principals)
          unless project.leaf?
            subprojects = project.descendants.visible.to_a
            member_scope = Principal.member_of(subprojects)
            principals += (member_scope.respond_to?(:visible) ? member_scope.visible : member_scope)
          end
          versions = project.shared_versions.to_a
          categories = project.issue_categories.to_a
          issue_custom_fields = project.all_issue_custom_fields
        else
          if all_projects.any?
            member_scope = Principal.member_of(all_projects)
            principals += (member_scope.respond_to?(:visible) ? member_scope.visible : member_scope)
          end
          versions = Version.visible.where(:sharing => 'system').to_a
          issue_custom_fields = IssueCustomField.where(:is_for_all => true)
        end
        principals -= default_group_users if default_group_users.present?
        principals.uniq!
        principals.sort!
        principals.reject! {|p| p.is_a?(GroupBuiltin)}
        users = principals.select {|p| p.is_a?(User)}

        add_available_filter "status_id",
          :type => :list_status, :values => IssueStatus.sorted.collect{|s| [s.name, s.id.to_s] }

        if project.nil?
          project_values = []
          if User.current.logged? && User.current.memberships.any?
            project_values << ["<< #{l(:label_my_projects).downcase} >>", "mine"]
          end
          project_values += all_projects_values
          add_available_filter("project_id",
            :type => :list, :values => project_values
          ) unless project_values.empty?
        end

        add_available_filter "tracker_id",
          :type => :list, :values => trackers.collect{|s| [s.name, s.id.to_s] }
        add_available_filter "priority_id",
          :type => :list, :values => IssuePriority.all.collect{|s| [s.name, s.id.to_s] }

        author_values = []
        author_values << ["<< #{l(:label_me)} >>", "me"] if User.current.logged?
        author_values += users.collect{|s| [s.name, s.id.to_s] }
        add_available_filter("author_id",
          :type => :list, :values => author_values
        ) unless author_values.empty?

        assigned_to_values = []
        assigned_to_values << ["<< #{l(:label_me)} >>", "me"] if User.current.logged?
        assigned_to_values += (Setting.issue_group_assignment? ?
                                  principals : users).collect{|s| [s.name, s.id.to_s] }
        add_available_filter("assigned_to_id",
          :type => :list_optional, :values => assigned_to_values
        ) unless assigned_to_values.empty?

        group_values = Group.givable.visible.collect {|g| [g.name, g.id.to_s] if g.name != DEFAULT_MEMBER_GROUP}.compact
        add_available_filter("member_of_group",
          :type => :list_optional, :values => group_values
        ) unless group_values.empty?

        role_values = Role.givable.collect {|r| [r.name, r.id.to_s] if (!r.name.include?(SYSTEM_ROLES) && !r.has_user_management_permissions?)}.compact
        add_available_filter("assigned_to_role",
          :type => :list_optional, :values => role_values
        ) unless role_values.empty?

        add_available_filter "fixed_version_id",
          :type => :list_optional,
          :values => versions.sort.collect{|s| ["#{s.project.name} - #{s.name}", s.id.to_s] }

        add_available_filter "fixed_milestone_id",
          :type => :list_optional,
          :values => milestones.sort.collect{|m| ["#{m.project.name} - #{m.name}", m.id.to_s] }

        add_available_filter "category_id",
          :type => :list_optional,
          :values => categories.collect{|s| [s.name, s.id.to_s] }

        add_available_filter "bug_category_id",
          :type => :list_optional,
          :values => BugCategory.all.collect{|s| [s.name, s.id.to_s] }

        add_available_filter "subject", :type => :text
        add_available_filter "description", :type => :text
        add_available_filter "created_on", :type => :date_past
        add_available_filter "updated_on", :type => :date_past
        add_available_filter "closed_on", :type => :date_past
        add_available_filter "start_date", :type => :date
        add_available_filter "actual_start_date", :type => :date
        add_available_filter "actual_end_date", :type => :date
        add_available_filter "due_date", :type => :date
        add_available_filter "estimated_hours", :type => :float
        add_available_filter "done_ratio", :type => :integer if  User.current.allowed_to?(:hide_percentage_done, nil, :global => true)

        if User.current.allowed_to?(:set_issues_private, nil, :global => true) ||
          User.current.allowed_to?(:set_own_issues_private, nil, :global => true)
          add_available_filter "is_private",
            :type => :list,
            :values => [[l(:general_text_yes), "1"], [l(:general_text_no), "0"]]
        end

        if User.current.logged?
          add_available_filter "watcher_id",
            :type => :list, :values => [["<< #{l(:label_me)} >>", "me"]]
        end

        if subprojects.any?
          add_available_filter "subproject_id",
            :type => :list_subprojects,
            :values => subprojects.collect{|s| [s.name, s.id.to_s] }
        end

        add_custom_fields_filters(issue_custom_fields)

        add_associations_custom_fields_filters :project, :author, :assigned_to, :fixed_version

        IssueRelation::TYPES.each do |relation_type, options|
          add_available_filter relation_type, :type => :relation, :label => options[:name]
        end
        add_available_filter "parent_id", :type => :tree, :label => :field_parent_issue
        add_available_filter "child_id", :type => :tree, :label => :label_subtask_plural

        add_available_filter "issue_id", :type => :integer, :label => :label_issue

        Tracker.disabled_core_fields(trackers).each {|field|
          delete_available_filter field
        }
      end
    end
  end
end
