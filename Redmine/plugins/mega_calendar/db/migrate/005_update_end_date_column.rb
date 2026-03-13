class UpdateEndDateColumn < ActiveRecord::Migration[4.2]
  def change
    rename_column :holidays, :end, :end_date  
  end
end
