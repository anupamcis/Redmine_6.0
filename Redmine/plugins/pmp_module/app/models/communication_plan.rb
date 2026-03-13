class CommunicationPlan < ActiveRecord::Base

  belongs_to :project
  validates_presence_of :stackholder_name, :communication_need,
  :frequency_of_communication, :responsibility_of_communication
  validate :stackholder_validation

  def add_or_update(member, manager, type)
    if type == "client"
      communication_need =  CLIENT_COMMUNICATION_NEED
      means_of_communication =  CLIENT_COMMUNICATION_MEANS
      frequency_of_communication = "Fortnight"
    else
      communication_need =  MEMBER_COMMUNICATION_NEED
      means_of_communication =  MEMBER_COMMUNICATION_MEANS
      frequency_of_communication = "Daily"
    end
    self.attributes = {
      stackholder_name: member.user.name,
      communication_need: communication_need,
      means_of_communication: means_of_communication,
      frequency_of_communication: frequency_of_communication,
      responsibility_of_communication: manager.try(:user).try(:name),
      stackholder_id: member.id,
      is_system_generated: true
    }
    self.save(validate: false)
  end

  private
  def stackholder_validation
    if stackholder_name.eql?(responsibility_of_communication)
      errors.add(:stackholder_name, l(:stackholder_name_validation))
    end if stackholder_name.present? && responsibility_of_communication.present?
  end


end
