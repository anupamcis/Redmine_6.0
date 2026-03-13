#This class provides FAQ functionality that was not present in redmine by default.
#Only Admins can create/update/delete FAQ's.  The public can view.
class FaqController < ApplicationController
 
  # prevents login action to be filtered by check_if_login_required application scope filter
  skip_before_action :check_if_login_required, only: [:index]
  before_action :find_faq, :only => [:edit, :update, :destroy, :show]
  before_action :require_admin, :only => [ :create, :new, :edit, :update, :destroy]

  #Show a list of all FAQ's in the faqs table.
  def index
    @faqs =  Faq.all.order('created_on desc')
  end

  def new
    @faq = Faq.new
  end

  #Create method that creates a new FAQ and sets the attributes.
  def create
    @faq = Faq.new(params[:faq])
    if (@faq.save)
      flash[:notice] = "FAQ created successfully..."
      redirect_to :action => 'index'
    else
      flash[:error] = "All values are required..."
      render :action => 'new'
    end
  end

  def show;end

  def edit; end

  #Update faq.
  def update
    if @faq.update(params[:faq])
      flash[:notice] = "FAQ updated successfully..."
      redirect_to :action => 'index'
    else
      flash[:error] = "All values are required..."
      render :action => 'edit'
    end
  end

  def destroy
    Faq.destroy(@faq)
    redirect_to :action => 'index'
  end

  private

  def find_faq
    @faq = Faq.find(params[:id])
  end
  
end
