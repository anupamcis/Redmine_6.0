module UserAuthor
  module AccountControllerPatch
    def self.included(base)
      base.class_eval do
        after_action :add_user_author, only: [:register]
      end
    end

    private
    def add_user_author
      if @user && @user.errors.messages.blank?
        @user.update_column('user_author_id', User.where(admin: true).first.id)
      end
    end
  end
end
