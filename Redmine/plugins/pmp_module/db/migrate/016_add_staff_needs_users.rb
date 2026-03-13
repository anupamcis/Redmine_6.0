class AddStaffNeedsUsers < ActiveRecord::Migration[4.2]
  def change
    create_table :staff_needs_users do |t|
      t.integer :user_id, index: true
      t.integer :staff_need_id, index: true
    end
  end
end
