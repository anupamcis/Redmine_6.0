module UserCompany
  module UserPatch
    def self.included(base)
      base.send(:include, InstanceMethods)

      base.class_eval do
        safe_attributes 'company_id'
        validates_presence_of :company_id, :if => Proc.new {|user| user.class != "AnonymousUser"}
        belongs_to :company
        has_many :release_notifications
        #validate :login_id_validation
        validate :email_validation
        # acts_as_voter # Commented out - voting gem not available
      end
    end

    module InstanceMethods
      def display_name_with_count
        project = Project.where(identifier: GLOBAL_PERMISSIONS_MODULE_NAME).first
        if project.members.pluck("user_id").include?(self.id)
          "#{self.name} (#{self.projects.count-1})"
        else
          "#{self.name} (#{self.projects.count})"
        end
      end
    end

    private
    def login_id_validation
      if self.login.include?("@")
        self.errors.add(:base, l(:login_id_validation))
      end
    end

    def email_validation
      unless auth_source_id.nil?
        if mail.present?
          mail_check = mail.downcase.split('@').last
          unless mail_check == "cisinlabs.com" || mail_check == "cisinlive.com" || mail_check == "cisin.com"
            self.errors.add(:base, l(:email_id_validation))
          end
        end
      end
    end
  end
end
