require_relative 'lib/news_notifications_listener'
Redmine::Plugin.register :release_update do
  name 'Release Update plugin'
  author 'Author name'
  description 'This is a plugin for Redmine'
  version '0.0.1'
  url 'http://example.com/path/to/plugin'
  author_url 'http://example.com/about'
  project_module :release_update do
    permission :add_release_update, {:release_updates => [:new, :create]}, :require => :loggedin, :read => true
    permission :update_release_update, {:release_updates => [:edit, :update]}, :require => :loggedin
    permission :show_release_update, {:release_updates => [:show, :index]}, :require => :loggedin
    permission :add_comment, {:release_updates => [:create_release_update_comment, :create_release_update_comment_reply]}, :require => :loggedin
    permission :update_comment, {:release_updates => [:update_release_update_comment, :update_release_update_comment_reply]}, :require => :loggedin
  end
end
