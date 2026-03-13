class BugCategory < ActiveRecord::Base
  # unloadable removed for Rails 7 compatibility
  has_many :issues, :dependent => :nullify
  validates_presence_of :name
  include Redmine::SafeAttributes
  safe_attributes 'name', 'position'
end
