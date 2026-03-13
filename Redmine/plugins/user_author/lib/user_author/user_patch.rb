module UserAuthor
  module UserPatch
    def self.included(base)
      base.send(:include, InstanceMethods)

      base.class_eval do
        safe_attributes 'user_author_id'
        belongs_to :author, :class_name => 'User', :foreign_key => 'user_author_id'
      end
    end

    module InstanceMethods
    end
  end
end
