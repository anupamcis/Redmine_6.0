class TrainingNeed < ActiveRecord::Base

  belongs_to :project
  has_one :coordination_plan, as: :planable, :dependent => :destroy
  validates_presence_of :training_type, :name_of_training, :attendees


  has_and_belongs_to_many :attendees, class_name: 'User'

  def add_coordination_plan
    stackholder = Employee.where(designation: HR_HEAD_ROLE, department_id: 10).first.try(:name)
    stackholder = stackholder.present? ? stackholder : ""
    self.build_coordination_plan({stackholder_name: stackholder,
        coordination_need: COORDINATION_NEED_TRANING + name_of_training.to_s,
        planed_date_of_receivables: expected_date,
        project_id: project_id})
  end

  def send_mail
    if self.training_method == "External"
      PmpModule::HardwareSoftwareMailer.traning_mail(self).deliver
    end
  end

end
