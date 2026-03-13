module ProjectAuthor
  module ProjectPatch
    def self.included(base)
      base.send(:include, InstanceMethods)

      base.class_eval do
        safe_attributes 'project_author_id'
        belongs_to :author, :class_name => 'User', :foreign_key => 'project_author_id'
      end
    end

    module InstanceMethods
    end
  end
end
