class AcronymsAndGlossary < ActiveRecord::Base

  belongs_to :project
  validates_presence_of :abbreviation, :full_form
  validates :full_form, uniqueness: { scope: :project }


end
