# encoding: UTF-8

# Copyright © Emilio González Montaña
# Licence: Attribution & no derivates
#   * Attribution to the plugin web page URL should be done if you want to use it.
#     https://redmine.ociotec.com/projects/redmine-plugin-scrum
#   * No derivates of this plugin (or partial) are allowed.
# Take a look to licence.txt file at plugin root folder for further details.

# This plugin should be reloaded in development mode.
# Commented out for Rails 7 compatibility - autoload_once_paths is frozen in Ruby 3.x
# if (Rails.env == 'development')
#   ActiveSupport::Dependencies.autoload_once_paths.reject!{|x| x =~ /^#{Regexp.escape(File.dirname(__FILE__))}/}
# end

# Ensure patch files are loaded explicitly under Zeitwerk
require_relative 'lib/scrum/application_helper_patch'
require_relative 'lib/scrum/calendars_controller_patch'
require_relative 'lib/scrum/issue_patch'
require_relative 'lib/scrum/issue_query_patch'
require_relative 'lib/scrum/issues_controller_patch'
require_relative 'lib/scrum/issue_status_patch'
require_relative 'lib/scrum/journal_patch'
require_relative 'lib/scrum/project_patch'
require_relative 'lib/scrum/projects_helper_patch'
require_relative 'lib/scrum/query_patch'
require_relative 'lib/scrum/tracker_patch'
require_relative 'lib/scrum/user_patch'

require_relative 'lib/scrum/helper_hooks'
require_relative 'lib/scrum/view_hooks'

# Patch core classes in a to_prepare block for Rails 7
Rails.application.config.to_prepare do
  ApplicationHelper.send(:include, Scrum::ApplicationHelperPatch) unless ApplicationHelper.included_modules.include?(Scrum::ApplicationHelperPatch)
  CalendarsController.send(:include, Scrum::CalendarsControllerPatch) unless CalendarsController.included_modules.include?(Scrum::CalendarsControllerPatch)
  Issue.send(:include, Scrum::IssuePatch) unless Issue.included_modules.include?(Scrum::IssuePatch)
  IssueQuery.send(:include, Scrum::IssueQueryPatch) unless IssueQuery.included_modules.include?(Scrum::IssueQueryPatch)
  IssuesController.send(:include, Scrum::IssuesControllerPatch) unless IssuesController.included_modules.include?(Scrum::IssuesControllerPatch)
  IssueStatus.send(:include, Scrum::IssueStatusPatch) unless IssueStatus.included_modules.include?(Scrum::IssueStatusPatch)
  Journal.send(:include, Scrum::JournalPatch) unless Journal.included_modules.include?(Scrum::JournalPatch)
  Project.send(:include, Scrum::ProjectPatch) unless Project.included_modules.include?(Scrum::ProjectPatch)
  ProjectsHelper.send(:include, Scrum::ProjectsHelperPatch) unless ProjectsHelper.included_modules.include?(Scrum::ProjectsHelperPatch)
  Query.send(:include, Scrum::QueryPatch) unless Query.included_modules.include?(Scrum::QueryPatch)
  Tracker.send(:include, Scrum::TrackerPatch) unless Tracker.included_modules.include?(Scrum::TrackerPatch)
  User.send(:include, Scrum::UserPatch) unless User.included_modules.include?(Scrum::UserPatch)
end

Redmine::Plugin.register :scrum do
  name              'Scrum Redmine plugin'
  author            'Emilio González Montaña'
  description       'This plugin for Redmine allows to follow Scrum methodology with Redmine projects'
  version           '0.14.0'
  url               'https://redmine.ociotec.com/projects/redmine-plugin-scrum'
  author_url        'http://ociotec.com'
  requires_redmine  :version_or_higher => '3.0.0'

  project_module    :scrum do
    permission      :manage_sprints,
                    {:sprints => [:new, :create, :edit, :update, :destroy, :edit_effort, :update_effort]},
                    :require => :member
    permission      :view_sprint_board,
                    {:sprints => [:index, :show]}
    permission      :edit_sprint_board,
                    {:sprints => [:change_task_status, :sort],
                     :scrum => [:change_story_points, :change_pending_effort, :change_assigned_to,
                                :new_pbi, :create_pbi, :edit_pbi, :update_pbi,
                                :new_task, :create_task, :edit_task, :update_task]},
                    :require => :member
    permission      :sort_sprint_board,
                    {:sprints => [:sort]},
                    :require => :member
    permission      :view_sprint_burndown,
                    {:sprints => [:burndown_index, :burndown]}
    permission      :view_sprint_stats, {:sprints => [:stats_index, :stats]}
    permission      :view_sprint_stats_by_member, {}
    permission      :view_product_backlog,
                    {:product_backlog => [:index, :check_dependencies]}
    permission      :edit_product_backlog,
                    {:product_backlog => [:new_pbi, :create_pbi],
                     :scrum => [:edit_pbi, :update_pbi, :move_to_last_sprint,
                                :move_to_product_backlog]},
                    :require => :member
    permission      :sort_product_backlog,
                    {:product_backlog => [:sort],
                     :scrum => [:move_pbi]},
                    :require => :member
    permission      :view_product_backlog_burndown,
                    {:product_backlog => [:burndown]}
    permission      :view_release_plan,
                    {:scrum => [:release_plan]}
    permission      :view_scrum_stats,
                    {:scrum => [:stats]}
  end

  menu              :project_menu, :product_backlog, {:controller => :product_backlog, :action => :index},
                    :caption => :label_menu_product_backlog, :after => :activity, :param => :project_id
  menu              :project_menu, :sprint, {:controller => :sprints, :action => :index},
                    :caption => :label_menu_sprint, :after => :activity, :param => :project_id

  settings          :default => {:create_journal_on_pbi_position_change => '0',
                                 :doer_color => 'post-it-color-5',
                                 :pbi_status_ids => [],
                                 :pbi_tracker_ids => [],
                                 :reviewer_color => 'post-it-color-3',
                                 :blocked_color => 'post-it-color-6',
                                 :story_points_custom_field_id => nil,
                                 :blocked_custom_field_id => nil,
                                 :task_status_ids => [],
                                 :task_tracker_ids => [],
                                 :verification_activity_ids => [],
                                 :inherit_pbi_attributes => '1',
                                 :render_position_on_pbi => '0',
                                 :render_category_on_pbi => '1',
                                 :render_version_on_pbi => '1',
                                 :render_author_on_pbi => '1',
                                 :render_updated_on_pbi => '0',
                                 :check_dependencies_on_pbi_sorting => '0',
                                 :product_burndown_sprints => '4',
                                 :render_pbis_speed => '1',
                                 :render_tasks_speed => '1',
                                 :lowest_speed => 70,
                                 :low_speed => 80,
                                 :high_speed => 140,
                                 :render_plugin_tips => '1'},
                    :partial => 'settings/scrum_settings'
end
