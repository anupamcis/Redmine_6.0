get "milestones/total_graph", :to => "milestones#total_graph"
resources :projects do
  resources :milestones, :only => [:new, :create, :index]
end
resources :milestones, :only => [:show, :edit, :update, :destroy] do
  post 'status_by', :on => :member
  get 'dates_log', :on => :member
end
