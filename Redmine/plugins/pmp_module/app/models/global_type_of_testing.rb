class GlobalTypeOfTesting < ActiveRecord::Base

  validates_presence_of :type_of_testing_name, :testing_method


  has_one :type_of_testing
end
