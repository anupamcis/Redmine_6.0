class KnowledgeAndSkillRequirement < ActiveRecord::Base

  belongs_to :project
  validates_presence_of :resource_name, :skill_required, :means_of_acquiring_skills


  def add_risk
    admin_config = PmpAdminConfiguration.first
    impact = competency_scale_required - competency_available
    if impact >= admin_config.try(:skill_requirement_cale_differnce)
      mitigation_plan = project.training_needs.present? ? project.training_needs.map(&:name_of_training).join(", ").to_s + "following tranings will be provided to resources for mitigating this risk" : "Training will be provided for mitigating this risk"
      risk = Risk.new({risk_description:  "Need to update",
        risk_category: "Personnel skill", source: "Quality",
        probability: 3, impact: impact, exposure: (3*impact),
        mitigation_plan: mitigation_plan, comment: "System generated risk",
        project_id: project.id})
      risk.save(validate: false)
      risk.send_mail if risk.persisted?
    end
  end
end
