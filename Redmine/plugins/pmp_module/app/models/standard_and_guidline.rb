class StandardAndGuidline < ActiveRecord::Base

  belongs_to :project
  belongs_to :dmsf_file
  validates_presence_of :document_name, :source


end
