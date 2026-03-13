class CreateAcronymsAndGlossaries < ActiveRecord::Migration[4.2]
  def change
    create_table :acronyms_and_glossaries do |t|
      t.string :abbreviation
      t.string :full_form
      t.integer :project_id
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
