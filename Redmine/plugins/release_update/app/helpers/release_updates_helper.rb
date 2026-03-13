module ReleaseUpdatesHelper
  def unread_release(release_update)
    'unread-release' unless release_update.release_notifications.find_by(user_id: User.current.id)
  end
end
