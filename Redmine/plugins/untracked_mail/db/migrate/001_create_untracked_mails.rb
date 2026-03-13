class CreateUntrackedMails < ActiveRecord::Migration[4.2]
  def change
    create_table :untracked_mails do |t|
      t.string :uid
      t.text :headers
      t.text :message
      t.string :subject
      t.string :message_id
      t.string :references
      t.string :reply_to
      t.string :from
      t.string :to
      t.string :cc
      t.text :attachments
    end
  end
end
