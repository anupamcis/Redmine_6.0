class CreateReleaseUpdateComments < ActiveRecord::Migration[4.2]
  def change
    create_table :release_update_comments do |t|
      t.text :comment
      t.integer :commentable_id
      t.string :commentable_type
      t.integer :user_id
      t.timestamp :created_on
      t.timestamp :updated_on
    end
  end
end
