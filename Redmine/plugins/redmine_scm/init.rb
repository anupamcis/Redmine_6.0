require 'redmine'

begin
  require 'octokit'
rescue LoadError
end

require_relative 'lib/creator/scm_creator'
require_relative 'lib/creator/subversion_creator'
require_relative 'lib/creator/mercurial_creator'
require_relative 'lib/creator/git_creator'
require_relative 'lib/creator/bazaar_creator'
require_relative 'lib/creator/github_creator'

require_relative 'lib/scm_config'
require_relative 'lib/scm_hook'

# require_dependency File.expand_path(File.join(File.dirname(__FILE__), 'app/models/repository_observer')) # Commented out - Rails observers deprecated in Rails 5

Rails.logger.info 'Starting SCM Creator Plugin for Redmine'

# ActiveRecord::Base.observers << RepositoryObserver # Commented out - Rails observers deprecated in Rails 5

Redmine::Scm::Base.add('Github')

Rails.configuration.to_prepare do
  unless Project.included_modules.include?(ScmProjectPatch)
    Project.send(:include, ScmProjectPatch)
  end
  unless RepositoriesHelper.included_modules.include?(ScmRepositoriesHelperPatch)
    RepositoriesHelper.send(:include, ScmRepositoriesHelperPatch)
  end
  unless RepositoriesController.included_modules.include?(ScmRepositoriesControllerPatch)
    RepositoriesController.send(:include, ScmRepositoriesControllerPatch)
  end
  unless User.included_modules.include?(ScmUserPatch)
    User.send(:include, ScmUserPatch)
  end
  Repository.send(:include, RepositoryPatch)
end

Redmine::Plugin.register :redmine_scm do
  name        'SCM Creator'
  author      'Andriy Lesyuk'
  author_url  'http://www.andriylesyuk.com/'
  description 'Allows creating Subversion, Git, Mercurial, Bazaar and Github repositories within Redmine.'
  url         'http://projects.andriylesyuk.com/projects/scm-creator'
  version     '0.5.0b'
end

Redmine::MenuManager.map :admin_menu do |menu|
  menu.push :find_repository, {:controller => 'repositories', :action => 'project_repository'}, :caption => :find_repository
end