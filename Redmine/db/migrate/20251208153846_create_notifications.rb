class CreateNotifications < ActiveRecord::Migration[7.2]
  def change
    create_table :notifications do |t|
      t.integer :user_id, null: false
      t.integer :project_id
      t.string :title, null: false
      t.text :message, null: false
      t.string :notification_type, null: false
      t.boolean :read, default: false, null: false
      t.datetime :read_at

      t.timestamps
    end

    add_index :notifications, :user_id
    add_index :notifications, :project_id
    add_index :notifications, :read
    add_index :notifications, :created_at
    add_index :notifications, [:user_id, :read]
  end
end
