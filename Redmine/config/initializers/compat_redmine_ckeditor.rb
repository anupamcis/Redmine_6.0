# Compatibility shims for legacy redmine_ckeditor helper calls in views
# These no-op helpers prevent errors when the plugin helper is not loaded.

begin
  module ApplicationHelper
    def ckeditor_javascripts
      ''.html_safe
    end unless method_defined?(:ckeditor_javascripts)

    def initial_setup
      ''.html_safe
    end unless method_defined?(:initial_setup)

    def replace_editor_tag(_field_id)
      ''.html_safe
    end unless method_defined?(:replace_editor_tag)

    def replace_editor_script(_field_id)
      ''
    end unless method_defined?(:replace_editor_script)
  end
rescue => e
  Rails.logger.warn("compat_redmine_ckeditor failed: #{e.class}: #{e.message}") if defined?(Rails)
end


