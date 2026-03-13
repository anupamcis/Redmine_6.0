# Plugin's routes
# See: http://guides.rubyonrails.org/routing.html
resources :projects do
  resources :pmp_reports, only: [:index]
  match 'pmp_reports/update', to: 'pmp_reports#update', via: [:put, :patch], as: 'pmp_report'
  resources :acronyms_and_glossaries, except: [:index, :show]
  resources :customer_specific_security_requirements, except: [:index, :show]
  resources :standard_and_guidlines, except: [:index, :show]
  resources :deployment_strategies, except: [:index, :show]
  resources :project_monitoring_reviews, except: [:index, :show]
  resources :communication_plans, except: [:index, :show]
  resources :coordination_plans, except: [:index, :show]
  resources :verification_plans, except: [:index, :show]
  resources :type_of_testings, except: [:index, :show] do
    get 'add_more_new', :on => :collection, :as => 'add_more_new'
    post 'add_more',:on => :collection, :as => 'add_more'
  end
  resources :stakeholder_management_plans, except: [:index, :show]
  resources :training_needs, except: [:index, :show]
  resources :knowledge_and_skill_requirements, except: [:index, :show]
  resources :staff_needs, except: [:index, :show]
  resources :user_role_and_responsibilities, except: [:index, :show] do
    get 'user_roles', :on => :collection
  end
  resources :reusable_artifacts, except: [:index, :show]
  resources :lessons, except: [:index, :show]
  resources :project_folder_structures, except: [:index, :show]
  resources :configuration_items, except: [:index, :show]
  resources :back_up_details, except: [:index, :show]
  resources :project_responsibility_assignment_matrix_filters, except: [:index, :show]
  resources :responsibility_assignment_matrices, except: [:index, :show]
  resources :configuration_audits, except: [:index, :show]
  resources :data_retention_plans, except: [:index, :show]
  resources :base_lining_plans, except: [:index, :show]
  resources :hardware_software_suplied_by_clients, except: [:index, :show]
  resources :hardware_software_plans, except: [:index, :show] do
    get 'load_profile_data', :on => :collection
    get 'add_more_new', :on => :collection, :as => 'add_more_new'
    post 'add_more',:on => :collection, :as => 'add_more'
  end
  resources :risks, except: [:index, :show]
  resources :client_specific_credentials, except: [:index, :show]
  resources :risk_mitigation_plans, except: [:index, :show]
end

resources :raci_charts
resources :pmp_tab_and_lock_configurations do
  get 'edit_admin_configuration',:on => :collection
  put 'update_admin_configuration',:on => :collection
end
resources :hardware_and_software_profiles, except: [:index, :show] do
  get 'render_profile_form', :on => :collection
end

get 'verification_plans/autocomplete_for_work_product', :to => 'verification_plans#autocomplete_for_work_product'
get 'acronyms_and_glossaries/autocomplete_for_acronym', :to => 'acronyms_and_glossaries#autocomplete_for_acronym'
resources :global_type_of_testings, except: [:index, :show]
resources :global_pmp_profiles, only: [:index]
resources :global_acronyms_and_glossaries, except: [:index, :show]
resources :global_back_up_details, except: [:index, :show]
resources :global_data_retention_plans, except: [:index, :show]
resources :global_work_products, except: [:index, :show]