module Help
  class HelpSidebar < Redmine::Hook::ViewListener
    def view_layouts_base_sidebar(context = {})
      # Access settings at runtime, not at class definition time
      settings = Setting.plugin_redmine_embedded_video rescue {}
      video_links = if settings && settings['internal_tarning_video_links'].present?
        settings['internal_tarning_video_links'].gsub("\r\n", "").scan(/[^,]+,[^,]+/)
      else
        []
      end
      video_tutorials = VideoTutorial.all rescue []
      
      context[:controller].send(:render_to_string, {
        :partial => "help_view_sidebar",
        :locals => {:video_links => video_links, :video_tutorials => video_tutorials}
      })
    end
  end
end

# Compatibility alias for existing code
HelpSidebar = Help::HelpSidebar