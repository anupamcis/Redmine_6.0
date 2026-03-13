# Plugin's routes
# See: http://guides.rubyonrails.org/routing.html

#Service Routes
get 'services' => "services#index"
post "api/sync_services" => "services#sync_services"
# get "services/existing_project_migration" => "services#existing_project_migration"

get "services/migrate_project_company" => "services#migrate_project_company"
post 'services/:id/update_service' => "services#update_service", as: "update_service"

get 'service_details/remove_service_detail/:id' => "service_details#remove_service_detail", as: "remove_service_detail"
get 'service_details/update_service_detail_master' => "service_details#update_service_detail_master", as: "update_service_detail_master"

#Time Sheet Routes
post "api/timesheets/pms_timesheet" => "timesheets#pms_timesheet"
get 'projects/:id/timesheets' => "timesheets#index", as: "timesheet_report"
get 'items/:id/timesheets/item', :to => 'timesheets#item_timesheet', :id => /\d+/, :as => 'item_timesheet'
get 'service_details/:id/timesheets/service', :to => 'timesheets#service_timesheet', :id => /\d+/, :as => 'service_timesheet'
resources :scheduler_times, :only => [:index, :edit, :update]

