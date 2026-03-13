class AddColumnEvmbaselines < ActiveRecord::Migration[4.2]
  def change
    add_column :evmbaselines, :author_id, :integer
    add_column :evmbaselines, :update_id, :integer
    add_column :evmbaselines, :updated_on, :datetime
  end
end
