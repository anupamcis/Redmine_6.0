if Rails.version.to_f >= 3.0
  match 'projects/:project_id/home_monitoring_controlling_project', :to => 'home_monitoring_controlling_project#index', :via => :get, as: :monitoring_controlling_project
  match 'projects/:project_id/mc_time_mgmt_project', :to => 'mc_time_mgmt_project#index', :via => :get, as: :monitoring_controlling_time
  match 'projects/:project_id/mc_human_resource_project', :to => 'mc_human_resource_mgmt_project#index', :via => :get, as: :monitoring_controlling_resource
else # Routes for older Rails routes
  ActionController::Routing::Routes.draw do |map|
   map.connect 'projects/:project_id/home_monitoring_controlling_project', :controller => 'home_monitoring_controlling_project', :action => 'index', as: :monitoring_controlling_project
   map.connect 'projects/:project_id/mc_time_mgmt_project', :controller => 'mc_time_mgmt_project', :action => 'index', as: :monitoring_controlling_time
   map.connect 'projects/:project_id/mc_human_resource_project', :controller => 'mc_human_resource_mgmt_project', :action => 'index', as: :monitoring_controlling_resource
  end
end