class AddReasonFieldInHoliday < ActiveRecord::Migration[4.2]
  def up
    add_column :holidays, :reason, :text, :null => true    
  end

  def down    
    remove_column :holidays, :reason
  end
end
