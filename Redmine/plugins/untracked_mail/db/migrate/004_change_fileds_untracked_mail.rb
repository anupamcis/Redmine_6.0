class ChangeFiledsUntrackedMail < ActiveRecord::Migration[4.2]
	def up
    rename_column :untracked_mails, :from, :from_mail
    rename_column :untracked_mails, :to, :to_mail
  end
end