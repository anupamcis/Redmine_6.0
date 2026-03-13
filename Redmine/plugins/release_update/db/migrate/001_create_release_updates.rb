class CreateReleaseUpdates < ActiveRecord::Migration[4.2]
  def change
    create_table :release_updates do |t|
      t.string :title
      t.integer :user_id
      t.text :description
      t.timestamp :created_on
      t.timestamp :updated_on
    end
  end
end
