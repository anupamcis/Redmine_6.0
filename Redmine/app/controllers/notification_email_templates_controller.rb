class NotificationEmailTemplatesController < ApplicationController
  layout 'admin'
  self.main_menu = false
  menu_item :notification_email_templates

  before_action :require_admin
  before_action :find_template, only: [:show, :edit, :update, :destroy]

  def index
    @templates = NotificationEmailTemplate.order(:template_type, :name)
  end

  def show
  end

  def new
    @template = NotificationEmailTemplate.new
    @template.template_type = params[:template_type] if params[:template_type]
    @template.is_active = true
  end

  def create
    @template = NotificationEmailTemplate.new(template_params)
    
    if @template.save
      flash[:notice] = l(:notice_successful_create)
      redirect_to notification_email_templates_path
    else
      render :action => 'new'
    end
  end

  def edit
  end

  def update
    if @template.update(template_params)
      flash[:notice] = l(:notice_successful_update)
      redirect_to notification_email_templates_path
    else
      render :action => 'edit'
    end
  end

  def destroy
    @template.destroy
    flash[:notice] = l(:notice_successful_delete)
    redirect_to notification_email_templates_path
  end

  private

  def find_template
    @template = NotificationEmailTemplate.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render_404
  end

  def template_params
    params.require(:notification_email_template).permit(:name, :template_type, :subject, :body_html, :body_text, :is_active)
  end
end

