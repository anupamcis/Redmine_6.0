# module ReleaseUpdate
  class NewsNotificationsListener < Redmine::Hook::ViewListener

    def view_layouts_base_html_head(context={})
      return stylesheet_link_tag("release_update_notification", :plugin => "release_update", :media => "screen")
    end

    def view_layouts_base_body_bottom(context={})
      if User.current.logged?
        read_ids = ReleaseNotification.where(user_id: User.current.id, user_type: 'User', notifiable_type: 'ReleaseUpdate').pluck(:notifiable_id)
        read_ids = [0] if read_ids.blank?
        unread_release_all = ReleaseUpdate.where(["release_updates.id not in (?) and release_updates.user_id != ? and release_updates.created_on > ?", read_ids, User.current.id, User.current.created_on])
          .order("release_updates.created_on DESC")
          .limit(100)
        unread_release = Array.new
        unread_release_all.each do |release_update|
          unread_release << [release_update.id, release_update.title, release_update.try(:user).try(:name), release_update.created_on.strftime("%Y/%m/%d %H:%M:%S")]
        end

        #Rails.logger.debug unread_release
        #Rails.logger.debug unread_release.count

        tag = [javascript_tag("var release_update = #{unread_release.to_json}")]
        tag << javascript_include_tag("release_update_notification.js", :plugin => "release_update")
        return tag.join("\n")
      end
    end
  end
# end
