Redmine::Plugin.register :issue_sorting_and_chart do
  name 'Issue Sorting And Chart plugin'
  author 'Author name'
  description 'This is a plugin for Redmine'
  version '0.0.1'
  url 'http://example.com/path/to/plugin'
  author_url 'http://example.com/about'
end
Rails.application.config.to_prepare do
  Issue.send(:include, IssueSortingAndCharts::IssuePatch)
  IssueQuery.send(:include, IssueSortingAndCharts::IssueQueryPatch)
  MyController.send(:include, IssueSortingAndCharts::MyControllerPatch)
end
