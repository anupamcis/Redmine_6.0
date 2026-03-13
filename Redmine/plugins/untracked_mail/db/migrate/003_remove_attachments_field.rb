class RemoveAttachmentsField < ActiveRecord::Migration[4.2]
	def up
    remove_column :untracked_mails, :attachments
  end
end