# Ensure User model has self_and_descendents method for user hierarchy functionality
Rails.application.config.to_prepare do
  begin
    # Add self_and_descendents method to User model if not already present
    unless User.instance_methods.include?(:self_and_descendents)
      User.class_eval do
        def self_and_descendents
          # Get all users in the hierarchy tree starting from this user
          # This includes the user itself and all their descendants
          user_ids = [self.id]
          
          # Get all direct and indirect children through UserHierarchy
          children_ids = UserHierarchy.where(parent_id: self.id).joins(:child).pluck('users.id')
          while children_ids.any?
            user_ids += children_ids
            children_ids = UserHierarchy.where(parent_id: children_ids).joins(:child).pluck('users.id')
          end
          
          User.where(id: user_ids.uniq)
        end
      end
      Rails.logger.info "Added self_and_descendents method to User model for user hierarchy compatibility"
    end

    # Ensure User model has hierarchy associations
    unless User.reflect_on_association(:children)
      User.class_eval do
        has_many :child_parent_relationships,
                 :class_name => "UserHierarchy",
                 :foreign_key => :parent_id,
                 :dependent => :destroy

        has_many :children,
                 :through => :child_parent_relationships,
                 :source => :child

        has_one :parent_child_relationship,
                :class_name => "UserHierarchy",
                :foreign_key => :child_id,
                :dependent => :destroy

        has_one :parent,
                :through => :parent_child_relationship,
                :source => :parent

        has_many :group_hierarchies
      end
      Rails.logger.info "Added user hierarchy associations to User model"
    end
  rescue => e
    Rails.logger.error "Failed to apply user hierarchy patches: #{e.class}: #{e.message}"
  end
end
