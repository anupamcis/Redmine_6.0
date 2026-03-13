class CreateMilestoneComments < ActiveRecord::Migration[4.2]
  def change
    create_table :milestone_comments do |t|
      t.integer :milestone_id
      t.text :comment
      t.datetime :previous_date
      t.datetime :changed_date
      t.datetime :created_on
      t.integer :author_id
      t.string :field_name
    end
  end
end
