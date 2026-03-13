module ProjectsReporting
  module UserPatch
    def self.included(base)
      base.send(:include, InstanceMethods)

      base.class_eval do
        
      end
    end

    module InstanceMethods
      def descendents
        children.map do |child|
          [child] + child.descendents
        end.flatten
      end

      def self_and_descendents
        if User.current.admin?
          User.joins(:company).where("companies.default_company = ? ", true)
        else
          [self] + descendents
        end
      end
    end
  end
end
