class AddUsersTrainingNeeds < ActiveRecord::Migration[4.2]
  def change
    create_table :training_needs_users do |t|
      t.integer :user_id, index: true
      t.integer :training_need_id, index: true
    end
  end
end
