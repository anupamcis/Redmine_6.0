require_dependency "versions_controller"

module AdvancedRoadmap
  module VersionsControllerPatch
    def self.included(base)
      base.class_eval do
  
        def index_with_plugin
          index_without_plugin
          @totals = Version.calculate_totals(@versions)
          Version.sort_versions(@versions)
        end
        if instance_methods.include?(:index)
          alias_method :index_without_plugin, :index
          alias_method :index, :index_with_plugin
        end
  
        def show
          @issues = @version.sorted_fixed_issues
        end

        def update_with_plugin
          if params[:version]
            params[:version][:name] = params[:version][:name].strip
            attributes = params[:version].dup
            attributes.delete('sharing') unless @version.allowed_sharings.include?(attributes['sharing'])
            @version.safe_attributes = attributes
            unless params[:version][:status] == "closed" && !@version.fixed_issues.open.empty?
              if @version.save
                respond_to do |format|
                  format.html {
                    flash[:notice] = l(:notice_successful_update)
                    redirect_back_or_default settings_project_path(@project, :tab => 'versions')
                  }
                  format.api  { render_api_ok }
                end
              else
                respond_to do |format|
                  format.html { render :action => 'edit' }
                  format.api  { render_validation_errors(@version) }
                end
              end
            else
              respond_to do |format|
                  format.html {
                    flash[:error] = "There are still open issues in versions"
                    render :action => 'edit'
                  }
              end
            end
          end
        end
        if instance_methods.include?(:update)
          alias_method :update_without_plugin, :update
          alias_method :update, :update_with_plugin
        end
      
      end
    end
  end
end
