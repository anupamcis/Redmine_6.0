class MasterDepartment < ActiveRecord::Base
  # #attr_accessible 'name'

  has_many :members

  validates_presence_of :name
  validates_uniqueness_of :name, :case_sensitive => false
end
