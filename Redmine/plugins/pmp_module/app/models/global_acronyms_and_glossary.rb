class GlobalAcronymsAndGlossary < ActiveRecord::Base

  validates_presence_of :abbreviation, :full_form
  validates_uniqueness_of :full_form

end
