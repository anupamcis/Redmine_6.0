
class Redcase::EnvironmentsController < ApplicationController

	unloadable
	helper RedcaseHelper
	before_action :find_project, :authorize

	def index
		environment = ExecutionEnvironment.find(
			params[:execution_environment_id]
		)
		render(
			:partial => 'redcase/management_environments',
			:locals => { :project => @project, :environment => environment }
		)
	end

	def create
		params[:execution_environment][:name] = params[:execution_environment][:name].strip
		environment = ExecutionEnvironment.new(params[:execution_environment])
		environment.project_id = @project.id
		if environment.save
			render :json => environment
		else
			return
		end
	end

	def update
		params[:execution_environment][:name] = params[:execution_environment][:name].strip
		environment = ExecutionEnvironment.find(params[:id])
		environment.update_attributes params[:execution_environment]
		if params[:execution_environment][:project_id]
			environment.project_id = params[:execution_environment][:project_id]
		end
		# TODO: Properly handle the case when this fails.
		if environment.save
			render :json => { :success => true }
		else
			return
		end
	end

	def destroy
		environment = ExecutionEnvironment.find(params[:id])
		environment.destroy
		# TODO: Properly handle the case when this fails.
		render :json => { :success => true }
	end

	# TODO: This one is being used across all the controllers, a good sign for
	#       creating a common (parent) controller with this method in it to
	#       share in descendants.
	def find_project
		@project = Project.find(params[:project_id])
	end

end

