class Pmp
  def self.skills
    all_skills_array = []
    erp_skills_array = []
    if defined?(ErpPublicHolidays)
      begin
        erp_skills_array = ErpPublicHolidays.new.get_skills_list
      rescue => e
        Rails.logger.warn("Pmp.skills: failed to load ERP skills: #{e.message}") if defined?(Rails)
      end
    end
    if erp_skills_array.present? and erp_skills_array.class.name == "Array"
      erp_skills_array.map {|value| all_skills_array <<  value["name"]}
    end
    all_skills_array.sort
  end
end