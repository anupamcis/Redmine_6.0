module UserAuthor
  module UsersControllerPatch
    def self.included(base)
      base.class_eval do
        after_action :add_user_author, only: [:create]
      end
    end

    private
    def add_user_author
      if @user && @user.errors.messages.blank? && @user.auth_source_id.nil?
        @user.update_column('user_author_id', User.current.id)
      end
    end
  end
end
