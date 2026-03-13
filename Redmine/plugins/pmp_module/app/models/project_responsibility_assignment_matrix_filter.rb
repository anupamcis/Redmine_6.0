class ProjectResponsibilityAssignmentMatrixFilter < ActiveRecord::Base
  belongs_to :project

  before_validation do |model|
    model.matrix_filter.reject!(&:blank?) if model.matrix_filter
  end

  
  serialize :matrix_filter
end
