desc <<-END_DESC
  Update email from for untracked mail
Example:
  rake redmine:update_untracked_mails RAILS_ENV="production"
END_DESC

namespace :redmine do
  task update_untracked_mails: :environment do
    if UntrackedMail.exists?
      UntrackedMail.where.not(id: 29).each do |untracked_mail|
        untracked_mail.update(from_mail: eval(untracked_mail.from_mail).join(','))
      end
      puts "DONE"
    end
  end

  task clean_git_data: :environment do
    Repository.all.destroy_all
    puts "Repository data clear"
    Change.all.destroy_all
    puts "Change data clear"
    Changeset.all.destroy_all
    puts "Changeset data clear"
  end
end
