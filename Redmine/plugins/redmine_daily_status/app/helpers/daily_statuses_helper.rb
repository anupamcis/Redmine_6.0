module DailyStatusesHelper

  def watcher_tag(object, user, options={})
    content_tag("span", watcher_link(object, user), :class => watcher_css(object))
  end

  def watcher_link(object, user)
    return '' unless user && user.logged? && object.respond_to?('watched_by?')
    watched = object.watched_by?(user)
    url = {:controller => 'daily_status_watchers',
           :action => (watched ? 'unwatch' : 'watch'),
           :object_type => object.class.to_s.underscore,
           :object_id => object.id}
    link_to((watched ? l(:button_unwatch) : l(:button_watch)), url,
            :remote => true, :method => 'post', :class => (watched ? 'icon icon-fav' : 'icon icon-fav-off'))

  end

  # Returns the css class used to identify watch links for a given +object+
  def watcher_css(object)
    "#{object.class.to_s.underscore}-#{object.id}-watcher"
  end

  # Returns a comma separated list of users watching the given object
  def watchers_list(object)
    remove_allowed = User.current.allowed_to?("manage_daily_status".to_sym, object.project)
    content = ''.html_safe
    lis = object.watcher_users.collect do |user|
      s = ''.html_safe
      s << avatar(user, :size => "16").to_s
      s << link_to_user(user, :class => 'user')
      if remove_allowed
        url = {:controller => 'daily_status_watchers',
               :action => 'destroy',
               :object_type => object.class.to_s.underscore,
               :object_id => object.id,
               :user_id => user}
        s << ' '
        s << link_to(image_tag('delete.png'), url,
                     :remote => true, :method => 'post', :style => "vertical-align: middle", :class => "delete")
      end
      content << content_tag('li', s)
    end
    content.present? ? content_tag('ul', content) : content
  end

  def watchers_checkboxes(object, users, checked=nil)
    users.map do |user|
      c = checked.nil? ? object.watched_by?(user) : checked
      tag = check_box_tag 'issue[watcher_user_ids][]', user.id, c, :id => nil
      content_tag 'label', "#{tag} #{h(user)}".html_safe,
                  :id => "issue_watcher_user_ids_#{user.id}",
                  :class => "floating"
    end.join.html_safe
  end

  def watchers_checkboxes_tag(name, principals)
    watched = @daily_status.setting
    watcher_users_id = watched.watcher_users.sort.map(&:id)
    s = ''
    # if params[:action] == 'new'
      principals.each do |principal|
        member = principal.members.find_by_project_id(@project.id)
        value = (member.respond_to?(:master_department) && member.master_department.present? ? "(" + member.master_department.name.to_s + ")" : "")
        s << "<label title='#{principal.try(:company).try(:name)}'>#{ check_box_tag name, principal.id, (watcher_users_id.include?(principal.id) ? true : false), :class => 'users'} #{h principal} #{value}</label>\n"
      end
    # else
    #   principals.each do |principal|
    #     s << "<label title='#{principal.company.name}'>#{ check_box_tag name, principal.id, (watcher_users_id.include?(principal.id) ? true : false), :class => 'users', :onchange => 'makeWatchers(' + "#{@project.id}" + ',' + "#{principal.id}" ','+ "#{@daily_status.id}" +')'} #{h principal}</label>\n"
    #   end
    # end
    s.html_safe
  end

  def get_all_watchers_list(watched)
    users = watched.project.users.sort
    users.delete(User.current)
    users
  end

  def unread_email?(daily_status)
    arr1 = ReleaseNotification.where(notifiable_type: 'DailyStatusReply', user_id: User.current.id).pluck(:notifiable_id)
    arr2 = daily_status.daily_status_replies.pluck(:id)
    (daily_status.author != User.current && !daily_status.release_notifications.find_by(user_id: User.current.id)) || (!arr2.all?{|i| arr1.include? i })
  end

  def unread_reply?(daily_status_reply)
    daily_status_reply.release_notifications.find_by(user_id: User.current.id)
  end
end
