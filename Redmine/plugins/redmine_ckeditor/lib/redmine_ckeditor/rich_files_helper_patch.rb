module RedmineCkeditor
  module RichFilesHelperPatch
    def self.included(base)
      base.send(:include, InstanceMethods)
      base.class_eval do
        #alias_method_chain :thumb_for_file, :redmine
        alias_method :thumb_for_file_without_redmine, :thumb_for_file
        alias_method :thumb_for_file, :thumb_for_file_with_redmine
      end
    end

    module InstanceMethods
      def thumb_for_file_with_redmine(file)
        Redmine::Utils.relative_url_root + if file.simplified_type == "image"
          file.rich_file.url(:rich_thumb)
        else
          "/plugin_assets/redmine_ckeditor/images/document-thumb.png"
        end
      end
    end
  end

  Rich::FilesHelper.send(:include, RichFilesHelperPatch) unless Rich::FilesHelper.included_modules.include?(RichFilesHelperPatch)
end
