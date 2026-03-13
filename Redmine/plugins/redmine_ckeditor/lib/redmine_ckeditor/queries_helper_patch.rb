module RedmineCkeditor
  module QueriesHelperPatch
    def self.included(base)
      base.class_eval do
        def csv_value_with_ckeditor(column, issue, value)
          if RedmineCkeditor.enabled? && column.name == :description
            text = Rails::Html::FullSanitizer.new.sanitize(value.to_s)
            text.gsub(/(?:\r\n\t*)+/, "\r").gsub("&nbsp;", " ").strip
          else
            csv_value_without_ckeditor(column, issue, value)
          end
        end
        #alias_method_chain :csv_value, :ckeditor
        alias_method :csv_value_without_ckeditor, :csv_value
        alias_method :csv_value, :csv_value_with_ckeditor
      end
    end
  end
end

# Include the patch into QueriesHelper
QueriesHelper.send(:include, RedmineCkeditor::QueriesHelperPatch) unless QueriesHelper.included_modules.include?(RedmineCkeditor::QueriesHelperPatch)
