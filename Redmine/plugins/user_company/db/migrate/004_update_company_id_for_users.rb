class UpdateCompanyIdForUsers < ActiveRecord::Migration[4.2]
  def change
   User.where(company_id: nil).update_all(company_id: Company.where(default_company: true).first.id)
  end
end
