
# TODO: Obsolete class, must be deleted after database migrate refactoring.
# TODO: Really?

class ExecutionResult < ActiveRecord::Base

	unloadable
	# #attr_protected :id # Removed for Rails 5 compatibility

end

