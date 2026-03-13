Redmine::Plugin.register :user_author do
  name 'User Author plugin'
  author 'Author name'
  description 'This is a plugin for Redmine'
  version '0.0.1'
  url 'http://example.com/path/to/plugin'
  author_url 'http://example.com/about'
end

require_relative 'lib/user_author/user_patch'
require_relative 'lib/user_author/users_controller_patch'
require_relative 'lib/user_author/account_controller_patch'

Rails.application.config.to_prepare do
  User.send(:include, UserAuthor::UserPatch) unless User.included_modules.include?(UserAuthor::UserPatch)
  UsersController.send(:include, UserAuthor::UsersControllerPatch) unless UsersController.included_modules.include?(UserAuthor::UsersControllerPatch)
  AccountController.send(:include, UserAuthor::AccountControllerPatch) unless AccountController.included_modules.include?(UserAuthor::AccountControllerPatch)
end
