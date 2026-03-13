module PmpModule
  module RolePatch
    def self.included(base)
      base.send(:include, InstanceMethods)

      base.class_eval do
        has_many :responsibility_assignment_matrices
      end
    end

    module InstanceMethods
    end

  end
end
