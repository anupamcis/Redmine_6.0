Redmine::Plugin.register :user_hierarchy do
  name 'User Hierarchy plugin'
  author 'CIS ROR TEAM'
  description 'This is a plugin for Redmine'
  version '0.0.1'
  url ''
  author_url ''
end

Rails.application.config.to_prepare do
  User.send(:include, UserHierarchyPlugin::UserPatch)
  Principal.send(:include, UserHierarchyPlugin::PrincipalPatch)
  Project.send(:include, UserHierarchyPlugin::ProjectPatch)
  Member.send(:include, UserHierarchyPlugin::MemberPatch)
  Issue.send(:include, UserHierarchyPlugin::IssuePatch)
  IssueQuery.send(:include, UserHierarchyPlugin::IssueQueryPatch)
  IssuesHelper.send(:include, UserHierarchyPlugin::IssuesHelperPatch)
  ProjectsController.send(:include, UserHierarchyPlugin::ProjectsControllerPatch)
  MembersController.send(:include, UserHierarchyPlugin::MembersControllerPatch)
end
