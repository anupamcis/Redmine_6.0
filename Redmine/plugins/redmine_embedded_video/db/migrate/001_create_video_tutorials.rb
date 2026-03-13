class CreateVideoTutorials < ActiveRecord::Migration[4.2]
  def change
    create_table :video_tutorials do |t|
      t.string :title
      t.string :description
      t.attachment :video
    end
  end
end
