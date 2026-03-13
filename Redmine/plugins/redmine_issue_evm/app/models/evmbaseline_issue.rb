# baseline issue model
class EvmbaselineIssue < ActiveRecord::Base

  # Relations
  belongs_to :evmbaseline

  # attribute
  # attr_protected :id # Removed for Rails 5 compatibility
end
