class AddFieldsToUntrackedMail < ActiveRecord::Migration[4.2]
	def up
    add_column :untracked_mails, :created_on, :datetime
  end

  def down
    remove_column :untracked_mails, :created_on
  end
end