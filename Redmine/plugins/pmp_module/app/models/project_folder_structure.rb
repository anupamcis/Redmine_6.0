class ProjectFolderStructure < ActiveRecord::Base
  belongs_to :project
  belongs_to :dmsf_file
  validates_presence_of :folder_name, :configuration_item, :access_details

end
