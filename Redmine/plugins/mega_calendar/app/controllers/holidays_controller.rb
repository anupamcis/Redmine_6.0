class HolidaysController < ApplicationController
  layout 'admin', only: [:index]
  before_action(:check_plugin_right)
  before_action :require_admin, :only => [ :sync_hoildays]
  
  def check_plugin_right
    right =  (((User.current.company.nil? || (User.current.company.default_company)) || User.current.admin?) && User.current.logged?)
    # right = (!Setting.plugin_mega_calendar['allowed_users'].blank? && Setting.plugin_mega_calendar['allowed_users'].include?(User.current.id.to_s) ? true : false)
    if !right
      flash[:error] = translate 'no_right'
      redirect_to({:controller => :welcome})
    end
  end

  def index
    limit = 20
    offset = 0
    @new_page = 1
    @last_page = 0
    if !params[:page].blank? && params[:page].to_i >= 1
      offset = params[:page].to_i * limit
      @new_page = params[:page].to_i + 1
      @last_page = params[:page].to_i - 1
    end
    @res = User.current.admin? ? Holiday.limit(limit).offset(offset).order('created_on desc') : User.current.holidays.order('created_on desc')
    @public_holidays = PublicHoliday.all.order('event_date')
    @pagination = (Holiday.count.to_f / 20.to_f) > 1.to_f
  end

  def new
    @holiday = Holiday.new
  end

  def show
    @holiday = Holiday.where(:id => params[:id]).first rescue nil
    if @holiday.blank?
      redirect_to(:controller => 'holidays', :action => 'index')
    end
  end

  def create
    @holiday = Holiday.new(params[:holiday])
    if @holiday.save
      flash[:notice] = "Leave Added Successfully"
      redirect_to(controller: 'holidays', action: 'index', tab: 'leaves')
    else
      respond_to do |format|
        format.html { render :action => 'new' }
        format.api  { render_validation_errors(@holiday) }
      end
    end
  end

  def edit
    @holiday = Holiday.find(params[:id])
    if !allow_edit
      flash[:error] = l(:leave_updateion_error)
      redirect_to(:controller => 'holidays', :action => 'index', :tab => 'leaves')
    end
  end

  def update
    @holiday = Holiday.find(params[:id])
    @holiday.assign_attributes(params[:holiday])
    if @holiday.save
      flash[:notice] = "Leave Updated Successfully"
      redirect_to(:controller => 'holidays', :action => 'index', tab: 'leaves')
    else
      respond_to do |format|
        format.html { render :action => 'edit' }
        format.api  { render_validation_errors(@holiday) }
      end
    end
  end

  def destroy
    holiday = Holiday.where(:id => params[:id]).first rescue nil
    holiday.destroy()
    redirect_to(:controller => 'holidays', :action => 'index', :tab => 'leaves')
  end

  def sync_hoildays
    if PublicHoliday.add_public_holidays
      flash[:notice] = l(:holiday_synced)
    else
      flash[:error] = l(:holiday_list_not_synced)
    end
    redirect_to holidays_url
  end

  private
  def allow_edit
    User.current.id == @holiday.try(:user_id) || User.current.admin?
  end
end
