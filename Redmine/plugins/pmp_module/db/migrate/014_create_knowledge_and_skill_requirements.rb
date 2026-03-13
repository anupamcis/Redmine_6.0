class CreateKnowledgeAndSkillRequirements < ActiveRecord::Migration[4.2]
  def change
    create_table :knowledge_and_skill_requirements do |t|
      t.string :resource_name
      t.string :skill_required
      t.integer :competency_scale_required
      t.integer :competency_available
      t.string :gap
      t.string :means_of_acquiring_skills
      t.integer :project_id
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
