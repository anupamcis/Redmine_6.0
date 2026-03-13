
module ScmRepositoriesControllerPatch

  def self.included(base)
    base.extend(ClassMethods)
    base.send(:include, InstanceMethods)
    base.class_eval do
      before_action :delete_scm, :only => :destroy

      alias_method :destroy_without_confirmation, :destroy
      alias_method :destroy, :destroy_with_confirmation

      if Project.method_defined?(:repositories)
        alias_method :new_without_scm, :new
        alias_method :new, :new_with_scm
        alias_method :create_without_scm, :create
        alias_method :create, :create_with_scm
        alias_method :update_without_scm, :update
        alias_method :update, :update_with_scm
        alias_method :show_without_scm, :show
        alias_method :show, :show_with_scm
      else
        alias_method :edit_without_scm, :edit
        alias_method :edit, :edit_with_scm
      end
    end
  end

  module ClassMethods
  end

  module InstanceMethods
    def delete_scm
      if @repository.created_with_scm && ScmConfig['deny_delete']
        Rails.logger.info "Deletion denied: #{@repository.root_url}"
        render_403
      end
    end

      # Redmine >= 1.4.x
      if Project.method_defined?(:repositories)
        def new_with_scm
          scm = params[:repository_scm] || (Redmine::Scm::Base.all & Setting.enabled_scm).first
          scm = "Github" if params[:repository_scm] == "Other"
          @repository = Repository.factory(scm)
          @repository.is_default = @project.repository.nil?
          @repository.project = @project
        end
        # Original function
        #def create
        #    attrs = pickup_extra_info
        #    @repository = Repository.factory(params[:repository_scm])
        #    @repository.safe_attributes = params[:repository]
        #    if attrs[:attrs_extra].keys.any?
        #        @repository.merge_extra_info(attrs[:attrs_extra])
        #    end
        #    @repository.project = @project
        #    if request.post? && @repository.save
        #        redirect_to settings_project_path(@project, :tab => 'repositories')
        #    else
        #        render :action => 'new'
        #    end
        #end

        def create_with_scm
          unless scm_url_check
            @repository = Repository.factory("Github")
            error_message = params[:repository_scm] == "Github" ? "Please enter cis git lab url" : "Please enter github/bitbucket url"
            flash[:error] = l(:wrong_url, :error_message => error_message)
            render 'new'
            return
          end
          old_repository_scm = params[:repository_scm]
          params[:repository_scm] = "Github" if params[:repository_scm] == "Other"

          interface = SCMCreator.interface(params[:repository_scm])

          if (interface && (interface < SCMCreator) && interface.enabled? &&
            ((params[:operation].present? && params[:operation] == 'add') || ScmConfig['only_creator'])) ||
          !ScmConfig['allow_add_local']

          attributes = {}
          extra_attrs = {}
          params[:repository].each do |name, value|
            if name =~ %r{^extra_}
              extra_attrs[name] = value
            else
              attributes[name] = value
            end
          end

          if params[:operation].present? && params[:operation] == 'add'
            attributes = interface.sanitize(attributes)
          end

          @repository = Repository.factory(params[:repository_scm])
          if @repository.respond_to?(:safe_attribute_names) && @repository.safe_attribute_names.any?
            @repository.safe_attributes = attributes
              else # Redmine < 2.2
                @repository.attributes = attributes
              end
              if extra_attrs.any?
                @repository.merge_extra_info(extra_attrs)
              end

              if @repository
                @repository.project = @project

                if @repository.valid? && params[:operation].present? && params[:operation] == 'add'
                  if !ScmConfig['max_repos'] || ScmConfig['max_repos'].to_i == 0 ||
                    @project.repositories.select{ |r| r.created_with_scm }.size < ScmConfig['max_repos'].to_i
                    scm_create_repository(@repository, interface, attributes['url'])
                  else
                    @repository.errors.add(:base, :scm_repositories_maximum_count_exceeded, :max => ScmConfig['max_repos'].to_i)
                  end
                end

                if ScmConfig['only_creator'] && request.post? && @repository.errors.empty? && !@repository.created_with_scm
                  @repository.errors.add(:base, :scm_only_creator)
                elsif !ScmConfig['allow_add_local'] && request.post? && @repository.errors.empty? && !@repository.created_with_scm &&
                  attributes['url'] =~ %r{^(file://|([a-z]:)?\.*[\\/])}i
                  @repository.errors.add(:base, :scm_local_repositories_denied)
                end

                if request.post? && @repository.errors.empty? && @repository.save
                  redirect_to(settings_project_path(@project, :tab => 'repositories'))
                else
                  params[:repository_scm] = old_repository_scm
                  render(:action => 'new')
                end
              else
                params[:repository_scm] = old_repository_scm
                render(:action => 'new')
              end
            else
              create_without_scm
            end
          end

          def update_with_scm
            # update_without_scm
            attrs = pickup_extra_info
            @repository.safe_attributes = attrs[:attrs]
            if attrs[:attrs_extra].keys.any?
              @repository.merge_extra_info(attrs[:attrs_extra])
            end
            @repository.project = @project
            unless @repository.url.include?("cisin.com")
              @repository.update_remote_for
            end
            if @repository.save
              redirect_to settings_project_path(@project, :tab => 'repositories')
            else
              render :action => 'edit'
            end
            if @repository.is_a?(Repository::Github) && # special case for Github
              params[:repository][:extra_register_hook] == '1' && !@repository.extra_hook_registered
              flash[:warning] = l(:warning_github_hook_registration_failed)
            end
          end

          def show_with_scm
            if File.directory?(LOCAL_GIT_FOLDER_PATH)
              @repository.fetch_changesets if @project.active? && Setting.autofetch_changesets? && @path.empty?
              a = Redmine::Scm::Adapters::GitAdapter.status_code

              @entries = @repository.entries(@path, @rev)
              @changeset = @repository.find_changeset_by_name(@rev)
              if a && a.exitstatus == 0
                if request.xhr?
                  @entries ? render(:partial => 'dir_list_content') : render(:nothing => true)
                else
                  (show_error_not_found; return) unless @entries
                  @changesets = @repository.latest_changesets(@path, @rev)
                  @properties = @repository.properties(@path, @rev)
                  @repositories = @project.repositories
                  render :action => 'show'
                end
              else
                @changesets = @repository.latest_changesets(@path, @rev)
                @properties = @repository.properties(@path, @rev)
                @repositories = @project.repositories
                flash.now[:error] = "Unable to fetch new commits, Please check your project repository settings"
                render :action => 'show'
              end
            else
              flash[:error] = l(:mount_path_issue_message)
              redirect_to home_url
            end
          end

      # Redmine < 1.4.x or ChiliProject
    else
        # Original function
        #def edit
        #    @repository = @project.repository
        #    if !@repository && !params[:repository_scm].blank?
        #        @repository = Repository.factory(params[:repository_scm])
        #        @repository.project = @project if @repository
        #    end
        #    if request.post? && @repository
        #        p1 = params[:repository]
        #        p       = {}
        #        p_extra = {}
        #        p1.each do |k, v|
        #            if k =~ /^extra_/
        #                p_extra[k] = v
        #            else
        #                p[k] = v
        #            end
        #        end
        #        @repository.attributes = p
        #        @repository.merge_extra_info(p_extra)
        #        @repository.save
        #    end
        #    render(:update) do |page|
        #        page.replace_html("tab-content-repository", :partial => 'projects/settings/repository')
        #        if @repository && !@project.repository
        #            @project.reload
        #            page.replace_html("main-menu", render_main_menu(@project))
        #        end
        #    end
        #end

        def edit_with_scm
          interface = SCMCreator.interface(params[:repository_scm])

          if (interface && (interface < SCMCreator) && interface.enabled? &&
            ((params[:operation].present? && params[:operation] == 'add') || ScmConfig['only_creator'])) ||
          !ScmConfig['allow_add_local']

          @repository = @project.repository
          if !@repository && !params[:repository_scm].blank?
            @repository = Repository.factory(params[:repository_scm])
            @repository.project = @project if @repository
          end

          if request.post? && @repository
            attributes = params[:repository]
            attrs = {}
            extra = {}
            attributes.each do |name, value|
              if name =~ %r{^extra_}
                extra[name] = value
              else
                attrs[name] = value
              end
            end
            if params[:operation].present? && params[:operation] == 'add'
              attrs = interface.sanitize(attrs)
            end
            @repository.attributes = interface.sanitize(attrs)

            if @repository.valid? && params[:operation].present? && params[:operation] == 'add'
              scm_create_repository(@repository, interface, attrs['url']) if attrs
            end

            if ScmConfig['only_creator'] && @repository.errors.empty? && !@repository.created_with_scm
              @repository.errors.add(:base, :scm_only_creator)
            elsif !ScmConfig['allow_add_local'] && @repository.errors.empty? && !@repository.created_with_scm &&
              attrs['url'] =~ %r{^(file://|([a-z]:)?\.*[\\/])}i
              @repository.errors.add(:base, :scm_local_repositories_denied)
            end

            if @repository.errors.empty?
              @repository.merge_extra_info(extra) if @repository.respond_to?(:merge_extra_info)
              @repository.save
            end
          end

          render(:update) do |page|
            page.replace_html("tab-content-repository", :partial => 'projects/settings/repository')
            if @repository && !@project.repository
              @project.reload
              page.replace_html("main-menu", render_main_menu(@project))
            end
          end
        else
          edit_without_scm
        end
      end
    end

    def destroy_with_confirmation
      if @repository.created_with_scm
        if params[:confirm]
          unless params[:confirm_with_scm]
            @repository.created_with_scm = false
          end
          destroy_without_confirmation
        end
      else
        destroy_without_confirmation
      end
    end

    private

    def scm_create_repository(repository, interface, url)
      name = interface.repository_name(url)
      if name
        path = interface.default_path(name)
        if interface.repository_exists?(name)
          repository.errors.add(:url, :already_exists)
        else
          Rails.logger.info "Creating reporitory: #{path}"
          interface.execute(ScmConfig['pre_create'], path, @project) if ScmConfig['pre_create']
          if result = interface.create_repository(path, repository)
            path = result if result.is_a?(String)
            interface.execute(ScmConfig['post_create'], path, @project) if ScmConfig['post_create']
            repository.created_with_scm = true
          else
            repository.errors.add(:base, :scm_repository_creation_failed)
            Rails.logger.error "Repository creation failed"
          end
        end

        repository.root_url = interface.access_root_url(path, repository)
        repository.url      = interface.access_url(path, repository)

        if interface.local? && !interface.belongs_to_project?(name, @project.identifier)
          flash[:warning] = l(:text_cannot_be_used_redmine_auth)
        end
      else
        repository.errors.add(:url, :should_be_of_format_local, :repository_format => interface.repository_format)
      end

        # Otherwise input field will be disabled
        if repository.errors.any?
          repository.root_url = nil
          repository.url = nil
        end
      end

      def scm_url_check
        if params[:repository_scm] == "Github" && (params[:repository][:url].include?("github.com") || params[:repository][:url].include?("bitbucket.org"))
          false
        elsif params[:repository_scm] == "Other" && params[:repository][:url].include?("cisin.com")
          false
        else
          true
        end
      end
    end
  end
