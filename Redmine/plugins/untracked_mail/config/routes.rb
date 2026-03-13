# Plugin's routes
# See: http://guides.rubyonrails.org/routing.html
resources :untracked_mails, only: [:index]
get "projects/untracked_mails/:mail_id", to: "untracked_mails#show", as: :admin_show
get "projects/:id/project_untracked_mails/:mail_id", to: "untracked_mails#show", as: :show
get "projects/:id/project_untracked_mails", to: "untracked_mails#project_untracked_mails", as: :project_untracked_mails
