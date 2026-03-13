class AddAuthorInRepository < ActiveRecord::Migration[4.2]

  def self.up
    add_column :repositories, :repo_author_id, :integer
  end

  def self.down
    remove_column :repositories, :repo_author_id
  end
end
