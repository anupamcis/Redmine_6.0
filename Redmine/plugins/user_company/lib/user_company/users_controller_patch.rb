module UserCompany
  module UsersControllerPatch
    def self.included(base)
      base.class_eval do
        # Insert overrides here, for example:
        def new_with_user_company
          new_without_user_company
          @company = Company.find(params[:company_id]) if (params[:company_id].present?)
        end
        alias_method :new_without_user_company, :new
        alias_method :new, :new_with_user_company
      end
    end
  end
end
