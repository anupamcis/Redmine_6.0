class ServiceDetail  < ActiveRecord::Base
  belongs_to :project
  belongs_to :service, :foreign_key => 'erp_service_id', :primary_key => 'erp_service_id'
  belongs_to :employee, foreign_key: :supervisor_employee_id, primary_key: :employee_id
  belongs_to :author, :class_name => 'User', :foreign_key => 'added_by_id'

  belongs_to :parent, :class_name => 'ServiceDetail', :foreign_key => :parent_service_detail_id, :primary_key => :erp_service_detail_id
  has_one :child, :class_name => 'ServiceDetail', :foreign_key => :parent_service_detail_id, :primary_key => :erp_service_detail_id

  has_many :timesheets, :foreign_key => 'service_detail_id', :primary_key => 'erp_service_detail_id'

  # attr_accessible 'erp_service_detail_id', 'erp_service_id', 'supervisor_employee_id',
  # 'period_from', 'period_to', 'parent_service_detail_id', 'transferred_by',
  # 'transferrd_from_service_detail_id', 'is_complete', 'service_detail_type',
  # 'status', 'project_id', 'is_master', 'added_by_id' # Removed for Rails 5 compatibility

  validates_presence_of :erp_service_id, :erp_service_detail_id

  delegate :service_name, :company, :to => :service, :allow_nil => true
  delegate :name, :to => :author, :allow_nil => true

  def self.update_or_create_service_details(params)
    service_details = params[:details]
    if service_details.present?
      service_details.each do |service_detail_data|
        service_detail = ServiceDetail.find_or_initialize_by(erp_service_detail_id: service_detail_data[:service_detail_id])
        @sd = service_detail.add_service_detail(params[:service_id], service_detail_data)
        (@sd == true) ? true : (return false)
      end
    end
  end

  def add_service_detail(service_id, params)
    service = Service.find_by_erp_service_id(service_id)
    if !service.main_supervisor_id.eql?(params[:service_supervisor_id])
      params[:transferred_by] = service.main_supervisor_id
    end
    self.attributes = {
      erp_service_id: service.try(:erp_service_id),
      supervisor_employee_id: params[:service_supervisor_id],
      period_from: params[:service_detail_datefrom],
      period_to: params[:service_detail_dateto],
      parent_service_detail_id: params[:parent_service_detail_id].present? ? params[:parent_service_detail_id] : nil,
      transferred_by: params[:transferred_by].present? ? params[:transferred_by] : nil,
      transferrd_from_service_detail_id: params[:transferrd_from_service_detail_id].present? ? params[:transferrd_from_service_detail_id] : nil,
      is_complete: params[:IsComplete],
      service_detail_type: service.try(:service_type),
      status: service.try(:status)
    }
    self.save
    self.reload
    self.update_project_services
  end

  def update_project_services
    if parent.present?
      if parent.project_id.present? && parent.period_to <= Time.now.beginning_of_day
        parent.update_column(:is_disabled, true)
        self.update({ project_id: parent.project_id, added_by_id: User.first.id})
        true
      elsif parent.is_master && parent.project_id.present? && parent.period_to <= Time.now.beginning_of_day
        parent.update({is_disabled: true, is_master: false})
        self.update({ project_id: parent.project_id, is_master: true, added_by_id: User.first.id})
        true
      else
        true
      end
    elsif is_master && project_id.present?
      update_project_status(self.status, self.project)
      true
    else
      true
    end
  end

  def update_project_status(new_status, project)
    if is_master
      case new_status
      when "HOLD"
        check_project_services(Project::STATUS_ONHOLD, project)
      when "FAILED"
        check_project_services(Project::STATUS_CANCELLED, project)
      when "FINISHED"
        check_project_services(Project::STATUS_CLOSED, project)
      else
        check_project_services(Project::STATUS_ACTIVE, project)
      end
    end
  end

  def check_project_services(status, project)
    if project.descendants.present?
      project.descendants.each do |child_project|
        if !child_project.service_details.where(is_master: true).present?
          child_project.update_column(:status, status)
        end
      end
      project.update_column(:status, status)
    else
      project.update_column(:status, status)
    end
  end


  def remove_project_from_service_detail
    self.attributes = {
      is_reverted: true,
      project_id: nil
    }
    self.update(self.attributes)
  end

  #To check if is service detail is removable
  def removable?
    !self.is_master
  end

  #Method is used to combining service name with service detail id
  def service_detail_name
    "#{service_name.to_s}"
  end

  def self.group_services_by_user(service_details, employee_id, erp_client_id)
    employee = Employee.find(employee_id) if employee_id.present?
    service_details = service_details.where(supervisor_employee_id: employee.try(:employee_id)) if employee.present?
    service_details.map(&:employee).uniq.map {|employee|
      [employee.name, employee.service_details.joins(:service).where("project_id is null and erp_client_id = (?) and period_to >= (?) ", erp_client_id, Time.now.beginning_of_day).map {|sd|
        [sd.service_detail_name, sd.id,
          {:id => sd.transferred_or_project_basis}] }
          ] if employee.service_details.present?}.compact
  end

  #Check if selected project is from selected company
  def self.is_selected_company_project?(company, project)
    return false unless company.projects.present?
    company.projects.map(&:id).include?(project.id)
  end

  #Check if selected service details from selected company
  def self.is_selected_company_services?(company, service_details)
    # (company_service_details & service_details).size == service_details.size
    service_details.all? {|sd| company.service_details.include?(sd) }
  end

  def transferred_or_project_basis
    if transferred_by.present? && service_detail_type.downcase.eql?("project")
      "project_basis"
    elsif transferred_by.present? && !service_detail_type.downcase.eql?("project")
      "transferred"
    elsif !transferred_by.present? && service_detail_type.downcase.eql?("project")
      is_master ? "master_service" : "project_basis"
    else
      "master_service" if is_master
    end
  end

end