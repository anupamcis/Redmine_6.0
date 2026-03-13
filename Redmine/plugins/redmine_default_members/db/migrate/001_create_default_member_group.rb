class CreateDefaultMemberGroup < ActiveRecord::Migration[4.2]
  def change
   unless Group.where(lastname: DEFAULT_MEMBER_ROLE).first
      group = Group.new(name: DEFAULT_MEMBER_ROLE)
      group.save
   end
  end
end
