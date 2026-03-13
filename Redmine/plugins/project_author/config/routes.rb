# Plugin's routes
# See: http://guides.rubyonrails.org/routing.html
resources :projects do
  put 'remove_company', :on => :member
end