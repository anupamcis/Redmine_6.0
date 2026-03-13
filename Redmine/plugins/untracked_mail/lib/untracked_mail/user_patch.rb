module UntrackedMailUserPatch
  def self.included(base)
    base.class_eval do
      has_many :release_notifications, as: :user, dependent: :destroy
    end
  end
end

# Zeitwerk expects UntrackedMail::UserPatch based on file path
# Since UntrackedMail is a class, we open it to define the constant
class UntrackedMail
  UserPatch = UntrackedMailUserPatch
end

Rails.application.config.to_prepare do
  User.send(:include, UntrackedMailUserPatch)
end
