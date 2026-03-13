class AddGitlabTokenInUsers < ActiveRecord::Migration[4.2]

  def self.up
    add_column :users, :gitlab_token, :string
  end

  def self.down
    remove_column :users, :gitlab_token
  end
end
