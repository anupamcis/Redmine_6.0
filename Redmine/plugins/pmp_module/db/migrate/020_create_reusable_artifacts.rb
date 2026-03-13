class CreateReusableArtifacts < ActiveRecord::Migration[4.2]
  def change
    create_table :reusable_artifacts do |t|
      t.string :reusable_component_name
      t.text :short_description
      t.string :url
      t.integer :project_id
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
