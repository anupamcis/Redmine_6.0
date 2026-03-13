resources :projects do
  resources :daily_statuses, :except => [:edit] do
    resources :daily_status_replies
  end
  # Recipients endpoint for project
  get 'recipients', to: 'daily_statuses#recipients', as: 'daily_status_recipients'
  get 'daily_statuses/today_status', to: 'daily_statuses#today_status', as: 'daily_status_today_status'
end

match '/projects/:project_id/daily_status_watchers/new', :to=>'daily_status_watchers#new', :via => :get
match '/projects/:project_id/daily_status_watchers', :to=>'daily_status_watchers#create', :via => :post
match '/projects/:project_id/daily_status_watchers/append', :to=>'daily_status_watchers#append', :via => :post
match '/projects/:project_id/daily_status_watchers/destroy', :to=> 'daily_status_watchers#destroy', :via => :post
match '/projects/:project_id/daily_status_watchers/watch', :to=> 'daily_status_watchers#watch', :via => :post
match '/projects/:project_id/daily_status_watchers/unwatch', :to=> 'daily_status_watchers#unwatch', :via => :post
match '/projects/:project_id/daily_status_watchers/autocomplete_for_user', :to=> 'daily_status_watchers#autocomplete_for_user', :via => :get
post '/projects/:project_id/daily_status'     => 'daily_statuses#save'

post 'read' => 'daily_status_replies#read'
