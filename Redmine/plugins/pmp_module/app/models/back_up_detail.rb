class BackUpDetail < ActiveRecord::Base

  belongs_to :project
  validates_presence_of :server_name, :backup_type, :data_detail, :media_label,
  :backup_frequency, :detail_of_media_storage, :role_responsible

  # Removed #attr_accessible for Rails 5 compatibility

end