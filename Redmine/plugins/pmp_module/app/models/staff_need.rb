class StaffNeed < ActiveRecord::Base

  belongs_to :project
  belongs_to :member
  validates_presence_of :role, :no_of_persons, :from_date, :to_date, :allocated_persons
  #, :technologies
  validate :experience_validate


  has_and_belongs_to_many :allocated_persons, class_name: 'User'

  def roles
    Role.where.not("name like (?) or name like (?) or name in (?)", '%CIS%', '%Client%', ["Anonymous", "Non member", "User Management", "Member"])
  end

  def add_or_update(attendees, roles, experience, to_date, id)
    self.attributes = {
      role: roles,
      no_of_persons: 1,
      from_date: Time.now,
      to_date: to_date,
      min_experience: experience,
      allocated_persons: attendees,
      member_id: id
    }
    self.save(validate: false)
  end

  def experience_validate
    if self.min_experience.present? && self.min_experience > 360
      errors.add(:min_experience, l(:staff_need_experience_validate))
    end
  end

end