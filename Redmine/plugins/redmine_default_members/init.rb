# coding: utf-8

require 'redmine'

# Ensure plugin code loads under Rails 7/Redmine 6
require File.expand_path('lib/redmine_default_members', __dir__)

Redmine::Plugin.register :redmine_default_members do
  name 'Redmine Default Members'
  author 'Nicolas Rodriguez'
  description 'This is a plugin for Redmine to add default project members'
  version '1.0.0'
  url 'http://www.jbox-web.com'
  author_url 'mailto:nrodriguez@jbox-web.com'

  settings({
    :partial => 'settings/redmine_default_members_settings',
    :template => {
      :group => 'Superviseur',
      :roles => []
    }
  })
end
