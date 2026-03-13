module BugCategories
  module IssuePatch
    def self.included(base)
      base.send(:include, InstanceMethods)

      base.class_eval do
        # unloadable removed for Rails 7 compatibility
        belongs_to :bug_category
        delegate :name, :to => :bug_category, :allow_nil => true
      end
    end

    module InstanceMethods
    end

  end
end
