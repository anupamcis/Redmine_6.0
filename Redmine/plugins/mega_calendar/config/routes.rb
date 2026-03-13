# Plugin's routes
# See: http://guides.rubyonrails.org/routing.html
get '/calendar', :to => 'calendar#index'
get '/calendar/index', :to => 'calendar#index'
get '/calendar/get_events', :to => 'calendar#get_events'
get '/calendar/change_holiday', :to => 'calendar#change_holiday'
get '/calendar/change_issue', :to => 'calendar#change_issue'
resources :holidays, except: :show
# get '/holidays/new', :to => 'holidays#new'
# get '/holidays/create', :to => 'holidays#create'
# get '/holidays/show', :to => 'holidays#show'
# get '/holidays/:id/edit', :to => 'holidays#edit'
# get '/holidays/update', :to => 'holidays#update'
# get '/holidays/destroy', :to => 'holidays#destroy'
# get '/holidays', :to => 'holidays#index'
# get '/holidays/index', :to => 'holidays#index'
get '/holidays/sync_hoildays', :to => 'holidays#sync_hoildays'
get '/issues/:id/edit_issue_description', :to => 'issues#edit_issue_description', as: 'edit_issue_description'
match '/issues/:id/update_issue_description', :to => 'issues#update_issue_description', as: 'update_issue_description', via: [:put, :patch]
match '/projects/:id/issues/sort' => 'issues#sort' , as: :sort_issues, :via => [:post]
match '/projects/:id/issues/spent_time' => 'issues#spent_time' , as: :spent_time, :via => [:post]
