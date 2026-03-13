require 'redmine'

Redmine::Plugin.register :bug_category do
  name 'Bug Category plugin'
  author 'CIS ROR TEAM'
  description 'This is a plugin for Redmine'
  version '0.0.1'
  url ''
  author_url ''


  menu :admin_menu, :bug_category, { :controller => 'bug_categories', :action => 'index' },
  :caption => :bug_category

  permission :view_bug_category_chart, {:bug_category_charts => [:index]}

end

Rails.application.config.to_prepare do
  require_relative 'lib/bug_categories/issue_patch'
  unless Issue.included_modules.include?(BugCategories::IssuePatch)
    Issue.send(:include, BugCategories::IssuePatch)
  end
  # Ensure the association exists even if the patch didn’t attach (e.g., autoload edge cases)
  unless Issue.reflect_on_association(:bug_category)
    Issue.belongs_to :bug_category, optional: true
  end
end