class Service < ActiveRecord::Base

  # attr_accessible 'erp_service_id', 'service_name', 'service_type', 'status',
  # 'account_manager_employee_id', 'erp_estimation_id', 'erp_client_id',
  # 'main_supervisor_id', 'service_date_from', 'service_date_to', 'total_hrs',
  # 'consume_hrs', 'remaining_hrs' # Removed for Rails 5 compatibility

  has_many :service_details, :foreign_key => 'erp_service_id', :primary_key => 'erp_service_id'
  has_many :projects, through: :service_details
  belongs_to :company, foreign_key: 'erp_client_id', primary_key: 'erp_client_id'

  validates_presence_of :erp_service_id

  delegate :name, :to => :company, :allow_nil => true


  def self.update_or_create_service(params)
    service = Service.find_or_initialize_by(erp_service_id: params[:service_id])
    service.add_service(params)
  end

  def add_service(params)
    self.attributes = {
      service_name: params[:service_name],
      service_type: params[:service_type],
      status: params[:service_status],
      account_manager_employee_id: params[:account_manager_id],
      erp_estimation_id: params[:estimation_id],
      erp_client_id: params[:client_id],
      main_supervisor_id: params[:maintl_id],
      service_date_from: params[:service_date_from],
      service_date_to: params[:service_date_to],
      total_hrs: params[:tot_hrs].to_f,
      consume_hrs: params[:con_hrs].to_f,
      remaining_hrs: params[:rem_hrs].to_f
    }

    self.save
  end

  def self.project_creation_mail_for_service
    st = SchedulerTime.find_or_initialize_by(cron_name: "project_creation_mail_for_service")
    st.start_date = Time.now
    all_services = Service.joins(:service_details).includes(:company).where("service_details.project_id IS NULL and service_details.status = ? and service_details.period_to >= ? ", "IN-PROGRESS", Time.now.beginning_of_day)

    main_supervisor_ids = all_services.pluck(:main_supervisor_id).flatten.compact
    main_supervisors = Employee.includes(:user).where(employee_id: main_supervisor_ids).uniq

    account_manager_employee_ids = all_services.pluck(:account_manager_employee_id).flatten.compact
    account_managers = Employee.includes(:user).where(employee_id: account_manager_employee_ids).uniq

    send_mail_to_employees_main_supervisors(main_supervisors, account_managers, all_services)
    send_mail_to_employees_account_managers(main_supervisors, account_managers, all_services)
    st.end_date = Time.now
    st.save
  end

  def self.send_mail_to_employees_main_supervisors(employees, account_managers, all_services)
    employees.each do |employee|
      user = employee.user
      if user.present?
        services = []
        active_services = all_services.select {|service| service.main_supervisor_id == employee.employee_id }
        active_services.each do |service|
          account_manager_emp =  account_managers.detect{|employee| employee.employee_id == service.account_manager_employee_id}
          account_manager_user = account_manager_emp.try(:user)
          company = service.company
          url = company ? Rails.application.routes.url_helpers.services_url(host: Setting.host_name, selected_client_company: company.id) : Rails.application.routes.url_helpers.services_url(host: Setting.host_name)
          services << {name: service.service_name, url: url, account_manager: account_manager_user.try(:name), user: user.try(:name)}

        end
        Mailer.service_creation_notification(services, user).deliver if services.present? && user.present?
      end
    end
  end

  def self.send_mail_to_employees_account_managers(employees, account_managers, all_services)
    account_managers.each do |employee|
      account_manager_user = employee.user
      if account_manager_user.present?
        services = []
        active_services = all_services.select {|service| service.account_manager_employee_id == employee.employee_id }
        active_services.each do |service|
          main_supervisor_emp =  employees.detect{|employee| employee.employee_id == service.main_supervisor_id}
          user = main_supervisor_emp.try(:user)
          company = service.company
          services << {name: service.service_name, account_manager: account_manager_user.try(:name), user: user.try(:name)}

        end
        Mailer.service_creation_notification_for_account_managers(services, account_manager_user).deliver if services.present? && account_manager_user.present?
      end
    end
  end
end

