class MasterDepartmentsController < ApplicationController
  layout 'admin'
  before_action :find_master_department, :except => [:index, :create, :new]
  before_action :require_admin

  helper :sort
  include SortHelper

  def index
  	sort_init 'name', 'asc'
  	sort_update %w(name)
  	@limit = per_page_option
  	
  	@master_departments =  if params[:name].present?
      MasterDepartment.where("Lower(name) like (?) ", "%#{params[:name].downcase}%")
    else
     	MasterDepartment.all
    end

  	@master_department_count = @master_departments.count
    @master_department_pages = Paginator.new @master_department_count, @limit, params['page']
    @offset ||= @master_department_pages.offset
    @master_departments =  @master_departments.order(sort_clause).limit(@limit).offset(@offset).to_a
  end

  def new
  	@master_department = MasterDepartment.new
  end

  def show
  end

  def create
  	@master_department = MasterDepartment.new(params[:master_department])
    if @master_department.save
      render :action => 'show', :status => :created, :location => master_department_url(@master_department)
    else
      render 'new'
    end
  end

  def edit
  	@master_department = MasterDepartment.find(params[:id])
  end

  def update
  	if @master_department.update_attributes(params[:master_department])
      render :action => 'show', :status => :updated, :location => master_department_url(@master_department)
    else
      render 'edit'
    end
  end

  def destroy
  	@master_department.destroy
  	flash[:notice] = l(:notice_success_delete_master_department)
  	redirect_to master_departments_url
  end

  private

  def find_master_department
    @master_department = MasterDepartment.find(params[:id])
  end
end
