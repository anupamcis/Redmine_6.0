class CreateLessons < ActiveRecord::Migration[4.2]
  def change
    create_table :lessons do |t|
      t.string :sdlc_phase
      t.string :description
      t.string :lesson_learnt_type
      t.integer :project_id
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
