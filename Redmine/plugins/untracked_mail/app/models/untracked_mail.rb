class UntrackedMail < ActiveRecord::Base
  has_many :release_notifications, as: :notifiable, dependent: :destroy
  acts_as_attachable


  def attachments_visible?(usr=nil)
    true
  end

  def attachments_editable?(usr=nil)
    false
  end

  def attachments_deletable?(usr=nil)
    false
  end
end
