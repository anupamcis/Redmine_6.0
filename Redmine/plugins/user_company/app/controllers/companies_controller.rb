class CompaniesController < ApplicationController
  menu_item :company
  layout 'admin'

  before_action :find_company, :except => [:index, :create, :new]
  before_action :authorize_global, if: :is_admin?
  before_action :authorize, unless: :is_admin?, except: [:index, :show]

  # after_action :set_default_company, only: [:destroy]
  after_action :add_author_to_company, only: [:create]

  helper :sort
  include SortHelper

  def index
    sort_init 'name', 'asc'
    sort_update %w(name phone_number fax_number homepage)

    @limit = per_page_option

    scope = Company.all

    if params[:name].present?
      scope = scope.where(
        "LOWER(name) LIKE :q OR LOWER(homepage) LIKE :q",
        q: "%#{params[:name].downcase}%"
      )
    end

    scope = scope.includes(:author)

    @company_count = scope.count
    @company_pages = Redmine::Pagination::Paginator.new(
      @company_count,
      @limit,
      params['page']
    )
    @offset ||= @company_pages.offset

    @companies = scope
      .order(sort_clause)
      .limit(@limit)
      .offset(@offset)
      .to_a
  end

  def show
  end

  def new
    @company = Company.new
  end

  def create
    @company = Company.new(params[:company])
    if @company.save
      render :action => 'show', :status => :created, :location => company_url(@company)
    else
      render 'new'
    end
  end

  def edit
  end

  def update
    if @company.update_attributes(params[:company])
      render :action => 'show', :status => :updated, :location => company_url(@company)
    else
      render 'edit'
    end
  end

  def destroy
    if @company.deletable?
      @company.destroy
    else
      flash[:error] = l(:notice_unable_delete_company)
    end
    redirect_to companies_url
  end

  private

  def find_company
    @company = Company.find(params[:id])
  end

  def is_admin?
      User.current.admin?
  end

  # def set_default_company
  #   @company.users.update_all(company_id:  Company.where(default_company: true).first.id)
  # end

  def add_author_to_company
    if @company.errors.messages.blank?
      @company.update_column('author_id', User.current.id)
    end
  end

end
