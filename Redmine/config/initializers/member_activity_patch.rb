# filepath: /home/cis/Documents/Projects/Redmine/config/initializers/member_activity_patch.rb
# Provide minimal activity API on Member so activity fetcher can use it
module MemberActivityPatch
  def event_datetime
    if respond_to?(:created_on) && created_on
      created_on
    elsif respond_to?(:created_at) && created_at
      created_at
    else
      Time.current
    end
  end

  def event_title
    if respond_to?(:user) && user
      "#{user.name} (#{user.login rescue 'user'})"
    else
      "Member ##{id}"
    end
  end

  def event_url
    Rails.application.routes.url_helpers.project_members_path(project) rescue nil
  end

  def event_author
    user if respond_to?(:user)
  end

  def event_description
    if respond_to?(:roles) && roles.respond_to?(:map)
      roles.map(&:name).join(', ')
    else
      ''
    end
  end

  def event_type
    :member
  end

  def event_object
    self
  end

  # Used by activity helpers to group related events.
  # Return a stable value for events that should be treated as in the same group.
  def event_group
    # group by author + 5-minute window (adjust granularity as needed)
    author_id = event_author ? event_author.id : "anon"
    window = (event_datetime.to_i / 300).to_s
    "member-#{author_id}-#{window}"
  end
end

Rails.application.config.to_prepare do
  require_dependency 'member' rescue nil
  if defined?(Member) && !Member.method_defined?(:event_datetime)
    Member.include MemberActivityPatch
  end
end
