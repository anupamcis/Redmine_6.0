namespace :redmine do
  task for_test_pmp_process: :environment do
    PmpTabAndLockConfiguration.where(default_tab: true).each do |tab|
      tab.project_processes.find_or_create_by(project_id: 2, is_enabled: true)
    end
  end

  task enable_pmp_process_for_existing_projects: :environment do
    Project.active.where.not(id: 1).each_with_index do |project, i|
      unless project.project_processes.present?
        PmpTabAndLockConfiguration.where(default_tab: true).each_with_index do |tab, j|
          tab.project_processes.find_or_create_by(project_id: project.id, is_enabled: true)
          puts "Project Name #{project.name} I #{i} J #{j}"
        end
      end
    end
    puts "Enabled PMP for all active projects"
  end

  task project_list_with_documents: :environment do
    file = "project_list_with_documents.csv"
    column_headers = ['Project Name', 'LEAD/MANAGER', "document Count"]
    CSV.open(file, 'w', write_headers: true, headers: column_headers) do |writer|
      Project.where.not(id: 1).each do |project|
        if project.documents.present?
          project_leader = project.memberships.joins(:member_roles).where('role_id = 10').last
          project_manager = project.memberships.joins(:member_roles).where('role_id = 9').last
          lead = project_leader.present? ? project_leader.name : (project_manager.present? ? project_manager.name : "NONE")
          writer << [project.name, lead, project.documents.count]
        end
      end
    end
    puts "PROJECTS LIST GENERATED FOR PROJECTS WITH DOCUMENTS AT #{Rails.root} PATH"
  end

  task add_back_up_detail_into_exisitng_project: :environment do
    global_details = GlobalBackUpDetail.all
    if global_details.present?
      Project.where.not(id: 1).each do |project|
        global_details.each do |global_detail|
          BackUpDetail.create(project_id: project.id, server_name: global_detail.server_name,
            backup_type: global_detail.backup_type, data_detail: global_detail.data_detail,
            media_label: global_detail.media_label, backup_frequency: global_detail.backup_frequency,
            detail_of_media_storage: global_detail.detail_of_media_storage,
            role_responsible: global_detail.role_responsible, remarks: global_detail.remarks)
        end
      end
    end
    puts "Back up details added into the exisiting projects"
  end

  task add_verification_plan_into_exisitng_project: :environment do
    if DEFAULT_VERIFICATION_PLAN.present?
      Project.where.not(id: 1).each do |project|
        DEFAULT_VERIFICATION_PLAN.each do |verification_plan|
          VerificationPlan.create(sdlc_phase: verification_plan[:sdlc_phase],
            work_product: verification_plan[:work_product],
            verification_method: verification_plan[:verification_method],
            validation_technique: verification_plan[:validation_technique], 
            project_id: project.id)
        end
      end
    end
    puts "Verification plans added into the exisiting projects"
  end

  task add_dmsf_default_folders: :environment do
    Project.where.not(id: 1).each do |project|
      DMFS_DEFUALT_FOLDER.each do |folder_name|
        folder = DmsfFolder.find_or_initialize_by(title: folder_name, project_id: project.id)
        folder.update_attributes({description: "Folder is used for #{folder_name} documents",
          user_id: User.first.id})
      end
    end
    puts "Done"
  end

  task add_global_work_product_verification: :environment do
    GLOBAL_WORK_PRODUCT.each do |wp|
      GlobalWorkProduct.find_or_create_by(work_product: wp)
    end
    puts "Global work product added"
  end

  task add_raci_global_type: :environment do
    RACI_WORK_TYPE.each do |wt|
      RaciChart.find_or_create_by(work_type: wt[:work_type], parent_work_type: wt[:parent_type])
    end
    puts "Raci chart work type added"
  end

  task add_global_type_of_testing_data: :environment do
    GLOBAL_TYPE_OF_TESTING.each do |gt|
      GlobalTypeOfTesting.find_or_create_by(type_of_testing_name: gt[:name],
        testing_method: gt[:value])
    end
    puts "Done"
  end

  task add_global_hardware_software_plan: :environment do
    csv_text = File.read(Rails.root.join('HW_SW_GLOBAL_PROFILE.csv'))
    csv = CSV.parse(csv_text, :headers => true, :encoding => 'ISO-8859-1')
    csv.each do |row|
      profile = HardwareAndSoftwareProfile.find_or_create_by(name: row["Profile Name"])
      HardwareAndSoftwareProfileData.create(profile_type: row["Type"],
        resource: row["resource"], configuration: row["configuration"],
        environment: "Development", quantity: row["quantity"],
        action: row["action"], hardware_and_software_profile_id: profile.id)
    end
    puts "Hardware And Software Global Profiles Added."
  end
end