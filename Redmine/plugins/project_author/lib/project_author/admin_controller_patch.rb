module ProjectAuthor
  module AdminControllerPatch
    def self.included(base)
      base.send(:include, InstanceMethods)
    end

    module InstanceMethods
      def projects
        retrieve_query(ProjectAdminQuery, false, :defaults => @default_columns_names)
        @entry_count = @query.result_count
        @entry_pages = Paginator.new @entry_count, per_page_option, params['page']
        @projects = @query.results_scope(:limit => @entry_pages.per_page, :offset => @entry_pages.offset).to_a
        
        # Set variables expected by project_author view
        @project_pages = @entry_pages
        @project_count = @entry_count
        @users = User.active.order(:firstname, :lastname)
        @status = params[:status] || 'all'

        render :action => "projects", :layout => false if request.xhr?
      end
    end
  end
end
