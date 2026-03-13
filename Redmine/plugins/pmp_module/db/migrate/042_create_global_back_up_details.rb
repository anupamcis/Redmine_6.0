class CreateGlobalBackUpDetails < ActiveRecord::Migration[4.2]
  def change
    create_table :global_back_up_details do |t|
      t.string :server_name
      t.string :backup_type
      t.string :data_detail
      t.string :media_label
      t.string :backup_frequency
      t.string :detail_of_media_storage
      t.string :role_responsible
      t.string :remarks
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
