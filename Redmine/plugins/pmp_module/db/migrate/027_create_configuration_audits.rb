class CreateConfigurationAudits < ActiveRecord::Migration[4.2]
  def change
    create_table :configuration_audits do |t|
      t.string :cm_audit
      t.string :date_or_event
      t.string :focus_of_audit
      t.string :auditor
      t.integer :project_id
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
