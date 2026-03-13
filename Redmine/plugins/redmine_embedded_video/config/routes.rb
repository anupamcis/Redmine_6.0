resources :video_tutorials, only: [:new, :create, :destroy]
get 'help', to: "video_tutorials#index", as: 'video_tutorials_index'
