module ServiceModule
  module UserPatch
    def self.included(base)
      base.send(:include, InstanceMethods)

      base.class_eval do
        has_many :service_details,
        through: :employee, foreign_key: :supervisor_employee_id,
        primary_key: :employee_id
        has_many :services, through: :service_details
      end
    end

    module InstanceMethods

      def get_service_details_with_hierarchy(erp_client_id=nil)
        unless self.admin?
          if employee.present?
            # Optimize: Get employee IDs more efficiently
            employee_ids = if respond_to?(:self_and_descendents)
              # Cache the employee IDs to avoid multiple queries
              @_employee_ids_cache ||= self_and_descendents.includes(:employee).map { |u| u.employee&.employee_id }.compact
            else
              [employee.employee_id].compact
            end
            
            if employee_ids.present?
              if erp_client_id.present?
                ServiceDetail.joins(:service)
                  .where("supervisor_employee_id IN (?) AND services.erp_client_id = ? AND project_id IS NULL AND period_to >= ? AND service_details.status = ?", 
                         employee_ids, erp_client_id, Time.now.beginning_of_day, "IN-PROGRESS")
              else
                ServiceDetail.where(supervisor_employee_id: employee_ids, project_id: nil)
                  .where("period_to >= ? AND service_details.status = ?", Time.now.beginning_of_day, "IN-PROGRESS")
              end
            else
              ServiceDetail.none
            end
          else
            ServiceDetail.none
          end
        else
          # Admin path - already optimized
          if erp_client_id.present?
            ServiceDetail.joins(:service)
              .where("project_id IS NULL AND services.erp_client_id = ? AND period_to >= ? AND service_details.status = ?", 
                     erp_client_id, Time.now.beginning_of_day, "IN-PROGRESS")
          else
            ServiceDetail.where("project_id IS NULL AND period_to >= ? AND service_details.status = ?", 
                               Time.now.beginning_of_day, "IN-PROGRESS")
          end
        end
      end

      def get_services_with_hierarchy
        # Optimize: Use subquery instead of pluck to avoid loading all IDs into memory
        service_details = get_service_details_with_hierarchy
        if service_details.present?
          # Use select instead of pluck for better performance
          erp_service_ids = service_details.select(:erp_service_id).distinct.pluck(:erp_service_id)
          if erp_service_ids.present?
            Service.joins(:service_details)
              .where("services.erp_service_id IN (?) AND service_details.project_id IS NULL AND service_details.status = ?", 
                     erp_service_ids, "IN-PROGRESS")
              .distinct
          else
            Service.none
          end
        else
          Service.none
        end
      end

      def get_supervisors(erp_client_id)
        if erp_client_id.present?
          service_details = get_service_details_with_hierarchy(erp_client_id)
          return unless service_details.present?
          employees = Employee.where(employee_id: service_details.map(&:supervisor_employee_id))
          return unless employees.present?
          employees.map(&:user).compact
        end
      end


      #Methods for Existing Projects Migration.
      def get_services_for_user
        if self.admin?
          Service.joins(:service_details).where("service_details.project_id is null and service_details.status = ? ", "IN-PROGRESS")
        else
          self.services.joins(:service_details).where("service_details.project_id is null and service_details.period_to >= ? and service_details.status = ?", Time.now.beginning_of_day, "IN-PROGRESS" ).uniq
        end
      end

      def get_companies
        if self.admin?
          admin_services  = get_services_with_hierarchy
          if admin_services.present?
            admin_services.map(&:company).uniq.compact
          end
        else
          self.get_services_for_user.map(&:company).uniq.compact
        end
      end

      def get_unassigned_service_details_for_company(company_id)
        if self.admin?
          ServiceDetail.joins(:service).where("project_id is null and services.erp_client_id = (?) and period_to >= ? and service_details.status = ?", company_id, Time.now.beginning_of_day, "IN-PROGRESS" )
        else
          self.service_details.joins(:service).where("project_id is null and services.erp_client_id = (?) and period_to >= ? and service_details.status = ?", company_id, Time.now.beginning_of_day, "IN-PROGRESS")
        end
      end

      def get_company_projects(company)
        if self.admin?
          Project.where(id: company.try(:projects).try(:ids).uniq)
        else
          Project.joins(:memberships).where("members.user_id = ? and projects.id in (?)", User.current.id, company.projects.ids.uniq)
        end
      end
    end
  end
end
