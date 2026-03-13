class AddMasterDepartmentIdInMembers < ActiveRecord::Migration[4.2]
	def up
		add_column :members, :master_department_id, :integer
	end

	def down
		remove_column :members, :master_department_id
	end
end