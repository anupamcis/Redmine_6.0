# ActiveRecord::Observer was removed in Rails 5
# Converting to ActiveSupport::Concern with after_destroy callback
module RepositoryObserver
  extend ActiveSupport::Concern

  included do
    before_destroy :execute_scm_pre_delete
  end

  def execute_scm_pre_delete
    if created_with_scm
      project   = self.project
      interface = SCMCreator.interface(self)
      if interface
        name = interface.repository_name(self.root_url)
        if name
          path = interface.existing_path(name, self)
          if path
            interface.execute(ScmConfig['pre_delete'], path, project) if ScmConfig['pre_delete']
            interface.delete_repository(path)
            interface.execute(ScmConfig['post_delete'], path, project) if ScmConfig['post_delete']
          end
        end
      end
    end
  end
end
