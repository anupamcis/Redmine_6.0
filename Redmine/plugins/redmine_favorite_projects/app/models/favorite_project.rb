class FavoriteProject < ActiveRecord::Base
  # unloadable removed for Rails 7 compatibility

  validates_presence_of :project_id, :user_id
  validates_uniqueness_of :project_id, :scope => [:user_id]

  # attr_accessible is removed in Rails 5; relying on strong parameters at controllers

  def self.favorite?(project_id, user_id=User.current.id)
    FavoriteProject.where(:project_id => project_id, :user_id => user_id).present?
  end
end
