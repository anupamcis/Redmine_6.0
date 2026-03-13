module RepositoryPatch
  def self.included(base)
    base.send(:include, InstanceMethods)
    base.send(:include, RepositoryObserver)  # Include observer functionality

    base.class_eval do
      safe_attributes 'repo_author_id'
      belongs_to :author, :class_name => 'User', :foreign_key => 'repo_author_id'
      validates_presence_of :identifier#, :login, :password

      def get_gitlab_repo
        repository_project = Repository.where("repo_author_id  = ? or project_id = ? ", User.current.id, self.project.id).map(&:url)
        gitlab_url = []

        if User.current.gitlab_token.present?
          projects = GitApi.new.get_all_gitlab_projects(User.current.gitlab_token)
          if projects.present? && projects.class.name == "Array"
            projects.each do |project|
              if project.present? && project["http_url_to_repo"].present?
                gitlab_url << project["http_url_to_repo"] unless repository_project.include?(project["http_url_to_repo"])
              end
            end
          end
        end
        gitlab_url
      end
    end
  end

  module InstanceMethods
  end
end
