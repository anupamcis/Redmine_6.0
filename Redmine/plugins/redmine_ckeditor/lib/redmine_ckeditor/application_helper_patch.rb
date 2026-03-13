module RedmineCkeditor
  module ApplicationHelperPatch
    def self.included(base)
      base.class_eval do
        def ckeditor_javascripts
          root = RedmineCkeditor.assets_root
          # Set BASEPATH before loading CKEditor
          javascript_tag("CKEDITOR_BASEPATH = '#{root}/ckeditor/';") +
          # Manually include the CKEditor script tag since javascript_include_tag with :plugin doesn't work
          "<script src='#{root}/javascripts/application.js'></script>".html_safe +
          javascript_tag(RedmineCkeditor.plugins.map {|name|
            path = "#{root}/ckeditor-contrib/plugins/#{name}/"
            "CKEDITOR.plugins.addExternal('#{name}', '#{path}/');"
          }.join("\n"))
        end

        def format_activity_description_with_ckeditor(text)
          if RedmineCkeditor.enabled?
            simple_format(truncate(HTMLEntities.new.decode(strip_tags(text.to_s)), :length => 120))
          else
            format_activity_description_without_ckeditor(text)
          end
        end
        #alias_method_chain :format_activity_description, :ckeditor
        alias_method :format_activity_description_without_ckeditor, :format_activity_description
        alias_method :format_activity_description, :format_activity_description_with_ckeditor
      end
    end
  end
end

# Include the patch into ApplicationHelper
ApplicationHelper.send(:include, RedmineCkeditor::ApplicationHelperPatch) unless ApplicationHelper.included_modules.include?(RedmineCkeditor::ApplicationHelperPatch)
