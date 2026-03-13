namespace :redmine do
  task add_project_spi_cpi: :environment do
    st = SchedulerTime.find_or_initialize_by(cron_name: "add_project_spi_cpi")
    st.start_date = Time.now
    User.current = User.first
    Project.where.not(id: 1).joins(:services).where("services.service_type = ?", "PROJECT").each_with_index do |project, index|
      ProjectSpiAndCpi.new.add_project_cpi_and_spi(project)
      p "#{project.name} #{index+1}- Done"
    end
    p "Done"
    st.end_date = Time.now
    st.save
  end
end