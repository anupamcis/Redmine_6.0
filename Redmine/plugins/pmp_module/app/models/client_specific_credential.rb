class ClientSpecificCredential < ActiveRecord::Base

  # @ip_regex = "^([1-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])(\.([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])){3}$"
  
  belongs_to :project

  validates_presence_of :site_path
  # validates :ip_address, -> :format => { :with => @ip_regex } 


end
