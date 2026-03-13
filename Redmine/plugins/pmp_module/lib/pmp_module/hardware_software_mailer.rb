gem "actionmailer"
require "mailer"
module PmpModule
  class HardwareSoftwareMailer < Mailer
    # unloadable removed for Rails 7 compatibility
    ActionMailer::Base.prepend_view_path(File.join(File.dirname(__FILE__), '../app/views'))

    include Redmine::I18n

    def mail_to_responsible_person(hw_sw_plans, profile)
      redmine_headers 'HardwareSoftwareProfileId' => profile.id,
                      'HardwareSoftwareProfile' => profile
      message_id profile
      references profile
      @author_name = profile.try(:author).try(:name)
      @hw_sw_plans = hw_sw_plans
      recipients = hw_sw_plans.map(&:responsible_person).map(&:email).uniq
      # recipients = ["manish.prajapat@cisinlabs.com", "satyendra.s@cisinlabs.com"]
      @responsible_person_name = hw_sw_plans.first.responsible_person.name
      @project_name = profile.try(:project).try(:name)
      subject = "New Hardware and Software Requirement Added For Project - #{@project_name}"
      mail(:to => recipients, :subject => "#{subject}")
    end

    def add_more_mail_to_responsible_person(hw_sw_plan)
      redmine_headers 'HardwareSoftwarePlanId' => hw_sw_plan.id,
                      'HardwareSoftwarePlan' => hw_sw_plan
      message_id hw_sw_plan
      references hw_sw_plan
      @author_name = hw_sw_plan.hardware_and_software_profile.try(:author).try(:name)
      @project_name = hw_sw_plan.hardware_and_software_profile.try(:project).try(:name)
      @hw_sw_plans = [hw_sw_plan]
      @responsible_person_name = hw_sw_plan.responsible_person.name
      recipients = [hw_sw_plan.responsible_person.email]
      # recipients = ["manish.prajapat@cisinlabs.com", "satyendra.s@cisinlabs.com"]
      subject = "New Hardware and Software Requirement Added For Project - #{@project_name}"
      mail(:to => recipients, :subject => "#{subject}")
    end

    def risk_mail(risk)
      redmine_headers 'RiskId' => risk.id,
                      'Risk' => risk
      @risk = risk
      @risk_author = User.current.name
      @project_name = risk.project.name
      recipients = risk.exposure >= 9 ? User.current.ancestors.map(&:mail) : User.current.ancestors.last(2)
      # recipients = ["manish.prajapat@cisinlabs.com", "satyendra.s@cisinlabs.com"]
      subject = "New risk added into the - #{@project_name}"
      mail(:to => recipients, :subject => "#{subject}")
    end

    def traning_mail(traning)
      redmine_headers 'Traning' => traning.id,
                      'Traning' => traning
      hr_head = Employee.where(designation: HR_HEAD_ROLE, department_id: 10).first
      @traning = traning
      @traning_author = User.current.name
      @project_name = traning.project.name
      @responsible_person = hr_head.try(:name)
      recipients = hr_head.try(:email)
      # recipients = ["manish.prajapat@cisinlabs.com", "satyendra.s@cisinlabs.com"]
      subject = "New traning need add into the project - #{@project_name}"
      mail(:to => recipients, :subject => "#{subject}")
    end
  end
end
