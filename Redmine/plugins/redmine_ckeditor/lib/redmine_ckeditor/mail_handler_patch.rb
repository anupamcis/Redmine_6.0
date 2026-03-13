module RedmineCkeditor
  module MailHandlerPatch
    extend ActiveSupport::Concern
    include ActionView::Helpers::TextHelper

    included do
      #alias_method_chain :cleaned_up_text_body, :ckeditor
      #alias_method_chain :extract_keyword!, :ckeditor
      alias_method :cleaned_up_text_body_without_ckeditor, :cleaned_up_text_body
      alias_method :cleaned_up_text_body, :cleaned_up_text_body_with_ckeditor
      alias_method :extract_keyword_without_ckeditor!, :extract_keyword!
      alias_method :extract_keyword!, :extract_keyword_with_ckeditor!
    end

    def cleaned_up_text_body_with_ckeditor
      if RedmineCkeditor.enabled?
        simple_format(cleaned_up_text_body_without_ckeditor)
      else
        cleaned_up_text_body_without_ckeditor
      end
    end

    def extract_keyword_with_ckeditor!(text, attr, format=nil)
      text = cleaned_up_text_body_without_ckeditor if RedmineCkeditor.enabled?
      extract_keyword_without_ckeditor!(text, attr, format)
    end
  end

  MailHandler.send(:include, MailHandlerPatch) unless MailHandler.included_modules.include?(MailHandlerPatch)
end
