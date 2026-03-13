class ActsAsTaggableMigration < ActiveRecord::Migration[4.2]
  def self.up
    # ActiveRecord::Base.create_taggable_table # Commented out - depends on redmine_crm gem
    # This migration is skipped as it depends on redmine_crm gem functionality
  end

  def self.down

  end
end