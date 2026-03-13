module UsersControllerPatch
  def self.included(base)
    base.class_eval do
      # Insert overrides here, for example:
      def create_with_plugin
        if params[:company_id].present? && params[:project_id].present? && !params[:membership].present?
          @error = "Please select at least one role"
        end
        create_without_plugin
        if !@user.id.blank?
          UserColor.create({:user_id => @user.id, :color_code => params[:user][:color]})
        end
      end
      def update_with_plugin
        update_without_plugin
        if !@user.id.blank?
          uc = UserColor.where({:user_id => @user.id}).first rescue nil
          if uc.blank?
            uc = UserColor.new({:user_id => @user.id})
          end
          uc.color_code = params[:user][:color]
          uc.save
        end
      end
      if instance_methods.include?(:update)
        alias_method :update_without_plugin, :update
        alias_method :update, :update_with_plugin
      end
      if instance_methods.include?(:create)
        alias_method :create_without_plugin, :create
        alias_method :create, :create_with_plugin # This tells Redmine to allow me to extend show by letting me call it via "show_without_plugin" above.
      end
      # I can outright override it by just calling it "def show", at which case the original controller's method will be overridden instead of extended.
    end
  end
end
