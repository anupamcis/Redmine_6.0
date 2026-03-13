class HardwareSoftwarePlan < ActiveRecord::Base

  belongs_to :hardware_and_software_profile
  has_one :coordination_plan, as: :planable, :dependent => :destroy
  belongs_to :responsible_person, class_name: "Employee", foreign_key: 'responsible_person_id'

  validates_presence_of :profile_type, :resource, :environment,
  :responsible_person_id

  validates_inclusion_of :critical_resource, in: [true, false]


  def add_coordination_plan(project_id)
    self.build_coordination_plan({stackholder_name: responsible_person.try(:name),
        coordination_need: "HW/SW related task",
        planed_date_of_receivables: end_date,
        project_id: project_id})
  end

  def add_more_send_mail
    PmpModule::HardwareSoftwareMailer.add_more_mail_to_responsible_person(self).deliver
  end
end
