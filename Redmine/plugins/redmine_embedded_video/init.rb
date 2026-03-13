                                                                                                                        require 'redmine'
#require 'dispatcher'

Redmine::Plugin.register :redmine_embedded_video do
 name 'Redmine Embedded Video'
 author 'Nikolay Kotlyarov, PhobosK, Jan Pilz'
 description 'Embeds attachment videos, video URLs or Youtube videos. Usage (as macro): video(ID|URL|YOUTUBE_URL). Updated to JW Player 6.2.3115, SWFObject removed'
 url 'http://www.redmine.org/issues/5171'
 version '0.0.3.1'

 settings :default => {
    'internal_tarning_video_links' => '{name: "video", link: test.com/video.mp4}, {name: "video1", link: test.com/video1.mp4}',
    'client_tarning_video_links' => '{name: "video", link: test.com/video.mp4}, {name: "video1", link: test.com/video1.mp4}',
  }, :partial => 'settings/add_viedo_links_settings'
end

Redmine::MenuManager.map :top_menu do |menu|
  menu.push :video, { :controller => 'video_tutorials', :action => 'index'}, :caption => :helps
end

Redmine::MenuManager.map :admin_menu do |menu|
  menu.push :add_tutorial, { :controller => 'video_tutorials', :action => 'new'}, :caption => :add_tutorial
end

# help/help_sidebar was removed in newer Redmine. Avoid hard require to prevent load errors.
begin
  require 'help/help_sidebar'
rescue LoadError
  # no-op: sidebar helper not available on this Redmine version
end
