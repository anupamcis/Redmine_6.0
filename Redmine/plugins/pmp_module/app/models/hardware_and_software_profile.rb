require_relative '../../lib/pmp_module/hardware_software_mailer'
class HardwareAndSoftwareProfile < ActiveRecord::Base

  belongs_to :project
  belongs_to :author, class_name: "User", foreign_key: "user_id"
  has_many :hardware_software_plans, :dependent => :destroy
  has_many :hardware_and_software_profile_datas, :dependent => :destroy

  validates_presence_of :name
  validates_uniqueness_of :name


  def create_profile_with_hw_sw_plan(plan_param, use_as_profile)
    self.attributes = {
      user_id: User.current.id,
      use_as_profile: use_as_profile
    }
    self.save
    hardware_software_plan = self.hardware_software_plans.new(plan_param)
    hardware_software_plan.add_coordination_plan(self.project_id)
    hardware_software_plan.save
  end

  def send_mail(limit_value)
    plan_for_mail = self.hardware_software_plans.order('created_on desc').where(send_mail: true).limit(limit_value)
    if plan_for_mail.present?
      responsible_persons = plan_for_mail.map(&:responsible_person_id).uniq
      responsible_persons.each_with_index do |responsible_person_id, i|
        PmpModule::HardwareSoftwareMailer.mail_to_responsible_person(plan_for_mail.where(responsible_person_id: responsible_person_id), self).deliver
      end
    end
  end
end
