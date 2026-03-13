module ScmUserPatch
  def self.included(base)
    base.send(:include, InstanceMethods)

    base.class_eval do
      safe_attributes 'gitlab_token'
      has_many :repositories
    end
  end

  module InstanceMethods
  end
end

