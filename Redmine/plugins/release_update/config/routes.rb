# Plugin's routes
# See: http://guides.rubyonrails.org/routing.html
resources :release_updates do
	member do
    get 'vote'
    post 'create_release_update_comment'
    get 'comment_vote'
  end
end
patch "release_updates/:id/release_updates_comment/:release_updates_comment_id/update_release_update_comment", to: "release_updates#update_release_update_comment", as: "update_release_update_comment"
post "release_update_comments/:id/create_release_update_comment_reply", to: "release_updates#create_release_update_comment_reply", as: "create_release_update_comment_reply"
patch "release_update_comments/:id/comment_reply/:reply_id/update_release_update_comment_reply", to: "release_updates#update_release_update_comment_reply", as: "update_release_update_comment_reply"
