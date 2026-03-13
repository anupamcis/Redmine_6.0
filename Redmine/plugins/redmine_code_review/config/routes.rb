# Code Review plugin for Redmine
# Copyright (C) 2009-2012  Haruyuki Iida
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

RedmineApp::Application.routes.draw do
  # Code Review routes
  scope 'projects/:id' do
    get 'code_review', to: 'code_review#index'
    get 'code_review/new', to: 'code_review#new'
    post 'code_review', to: 'code_review#create'
    get 'code_review/:id', to: 'code_review#show', as: 'code_review_show'
    post 'code_review/:id/assign', to: 'code_review#assign'
    post 'code_review/:id/update_diff_view', to: 'code_review#update_diff_view'
    post 'code_review/:id/update_attachment_view', to: 'code_review#update_attachment_view'
    post 'code_review/:id/reply', to: 'code_review#reply'
    patch 'code_review/:id', to: 'code_review#update'
    put 'code_review/:id', to: 'code_review#update'
    delete 'code_review/:id', to: 'code_review#destroy'
    post 'code_review/:id/forward_to_revision', to: 'code_review#forward_to_revision'
    post 'code_review/preview', to: 'code_review#preview'
    post 'code_review/update_revisions_view', to: 'code_review#update_revisions_view'
    post 'code_review/find_repository', to: 'code_review#find_repository'
    post 'code_review/find_project', to: 'code_review#find_project'
    post 'code_review/find_user', to: 'code_review#find_user'
    post 'code_review/find_setting', to: 'code_review#find_setting'
    
    # Code Review Settings routes
    patch 'code_review_settings', to: 'code_review_settings#update'
    put 'code_review_settings', to: 'code_review_settings#update'
    post 'code_review_settings/add_filter', to: 'code_review_settings#add_filter'
    post 'code_review_settings/edit_filter', to: 'code_review_settings#edit_filter'
    post 'code_review_settings/sort', to: 'code_review_settings#sort'
    post 'code_review_settings/find_project', to: 'code_review_settings#find_project'
    post 'code_review_settings/find_user', to: 'code_review_settings#find_user'
  end
end