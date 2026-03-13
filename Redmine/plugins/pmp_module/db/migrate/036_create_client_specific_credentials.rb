class CreateClientSpecificCredentials < ActiveRecord::Migration[4.2]
  def change
    create_table :client_specific_credentials do |t|
      t.string :site_path
      t.string :login_id
      t.string :login_password
      t.string :credentials_for
      t.string :ip_address
      t.integer :project_id
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
