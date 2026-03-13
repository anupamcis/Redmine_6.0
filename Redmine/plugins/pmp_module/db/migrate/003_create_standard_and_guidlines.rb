class CreateStandardAndGuidlines < ActiveRecord::Migration[4.2]
  def change
    create_table :standard_and_guidlines do |t|
      t.string :document_name
      t.string :version
      t.string :source
      t.string :remarks
      t.integer :project_id
      t.integer :dmsf_file_id
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
