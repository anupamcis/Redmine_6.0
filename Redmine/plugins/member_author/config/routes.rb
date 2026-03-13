# Plugin's routes
# See: http://guides.rubyonrails.org/routing.html

resources :master_departments
get "members/change_manager" =>  "members#change_manager"
put "members/change_client_poc" =>  "members#change_client_poc"