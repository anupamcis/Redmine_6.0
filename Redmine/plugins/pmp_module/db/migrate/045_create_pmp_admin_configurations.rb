class CreatePmpAdminConfigurations < ActiveRecord::Migration[4.2]
  def change
    create_table :pmp_admin_configurations do |t|
      t.integer :skill_requirement_cale_differnce
      t.integer :risk_mitigation_difference
      t.integer :risk_contingency_difference
    end
    pmp_config = PmpAdminConfiguration.first
    unless pmp_config.present?
      PmpAdminConfiguration.create(skill_requirement_cale_differnce: 2,
        risk_mitigation_difference: 6, risk_contingency_difference: 6)
    end
  end
end
