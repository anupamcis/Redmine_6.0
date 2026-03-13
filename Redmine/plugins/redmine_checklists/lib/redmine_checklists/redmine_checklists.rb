# This file is a part of Redmine Checklists (redmine_checklists) plugin,
# issue checklists management plugin for Redmine
#
# Copyright (C) 2011-2015 Kirill Bezrukov
# http://www.redminecrm.com/
#
# redmine_checklists is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# redmine_checklists is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with redmine_checklists.  If not, see <http://www.gnu.org/licenses/>.

Rails.configuration.to_prepare do
  require_relative 'hooks/controller_issue_hook'
  require_relative 'hooks/views_issues_hook'
  require_relative 'hooks/views_layouts_hook'

  require_relative 'patches/issue_patch'
  require_relative 'patches/project_patch'
  require_relative 'patches/issues_controller_patch'
  require_relative 'patches/add_helpers_for_checklists_patch'
  require_relative 'patches/compatibility_patch'
  
  # Conditionally load compatibility patches for older Redmine versions
  if Redmine::VERSION.to_s < '2.4'
    require_relative 'patches/compatibility/2.1/redmine_api_test_patch'
  end
end

module RedmineChecklists
  # Zeitwerk expects this file path to define RedmineChecklists::RedmineChecklists
  # Define an empty namespaced module to satisfy autoloading in Rails 7
  module RedmineChecklists; end

  def self.settings() Setting[:plugin_redmine_checklists].blank? ? {} : Setting[:plugin_redmine_checklists] end
  # Provide the same accessor under the nested module to satisfy internal constant lookup
  module RedmineChecklists
    def self.settings() ::RedmineChecklists.settings end
  end

end

