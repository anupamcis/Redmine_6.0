class AddAuthorInCompany < ActiveRecord::Migration[4.2]
  def up
    add_column :companies, :author_id, :integer
    if Company.exists?
      Company.update_all(author_id: User.where(admin: true).first.id)
    end 
  end

  def down
    remove_column :companies, :author_id
  end
end
