namespace :redmine do
  task project_creation_mail_for_service: :environment do
    Service.project_creation_mail_for_service
    puts "project_creation_mail_for_service successfully"
  end
end
