class CreateGlobalAcronymsAndGlossaries < ActiveRecord::Migration[4.2]
  def change
    create_table :global_acronyms_and_glossaries do |t|
      t.string :abbreviation
      t.string :full_form
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
