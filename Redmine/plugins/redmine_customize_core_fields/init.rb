Redmine::Plugin.register :redmine_customize_core_fields do
  name 'Redmine Customize Core Fields plugin'
  author 'Vincent ROBERT'
  description 'This Redmine plugin lets you customize core fields'
  version '1.0.0'
  url 'https://github.com/nanego/redmine_customize_core_fields'
  author_url 'https://github.com/nanego'
  requires_redmine_plugin :redmine_base_rspec, :version_or_higher => '0.0.4' if Rails.env.test?
  menu :admin_menu, :redmine_customize_core_fields, {:controller => 'core_fields', :action => 'index' }, :after => :custom_fields, :caption => :field_core_fields
end

# Custom patches
require_relative 'lib/redmine_customize_core_fields/hooks'
Rails.application.config.to_prepare do
  # IssuePatch is autoloaded by Zeitwerk
  # The patch inclusion code at the bottom of issue_patch.rb will execute when Zeitwerk loads it
  # This ensures the patch is applied after all classes are loaded
  RedmineCustomizeCoreFields::IssuePatch if defined?(RedmineCustomizeCoreFields::IssuePatch)
end
