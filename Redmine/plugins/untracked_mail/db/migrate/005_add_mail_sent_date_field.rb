class AddMailSentDateField < ActiveRecord::Migration[4.2]
	def up
    add_column :untracked_mails, :sent_mail, :datetime
  end

  def down
    remove_column :untracked_mails, :sent_mail
  end
end