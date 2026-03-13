class GlobalBackUpDetail < ActiveRecord::Base
  validates_presence_of :server_name, :backup_type, :data_detail, :media_label,
  :backup_frequency, :detail_of_media_storage, :role_responsible

end
