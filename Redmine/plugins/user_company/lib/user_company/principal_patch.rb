module UserCompany
  module PrincipalPatch
    def self.included(base)
      base.send(:include, InstanceMethods)

      base.class_eval do
        belongs_to :company
      end
    end

    module InstanceMethods
      def fullname
        (firstname + " " + lastname).to_s
      end
    end
  end
end
