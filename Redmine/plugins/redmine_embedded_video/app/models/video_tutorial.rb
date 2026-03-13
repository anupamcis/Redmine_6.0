class VideoTutorial < ActiveRecord::Base
  # attr_accessible 'title', 'description', "video" # Commented out for Rails 5 compatibility
  has_attached_file :video
  validates_attachment_content_type :video, :content_type => /\Avideo\/.*\Z/
  validates_presence_of :video
  validates_presence_of :title

   validates_attachment_content_type :video, 
    :content_type => ["video/mp4"]
end
