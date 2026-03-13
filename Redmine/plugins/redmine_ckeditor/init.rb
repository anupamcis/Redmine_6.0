require 'redmine'
require_relative 'lib/redmine_ckeditor'

# Configure Zeitwerk to ignore the generators directory
# Rails generators are loaded differently and shouldn't be autoloaded by Zeitwerk
if defined?(Rails) && defined?(Rails.autoloaders)
  generators_path = File.join(__dir__, 'lib', 'generators')
  Rails.autoloaders.main.ignore(generators_path) if Dir.exist?(generators_path)
end

Rails.application.config.to_prepare do
  RedmineCkeditor.apply_patch
end

Redmine::Plugin.register :redmine_ckeditor do
  name 'Redmine CKEditor plugin'
  author 'Akihiro Ono'
  description 'This is a CKEditor plugin for Redmine'
  version '1.1.4'
  requires_redmine :version_or_higher => '3.0.0'
  url 'http://github.com/a-ono/redmine_ckeditor'

  settings(:partial => 'settings/ckeditor')

  wiki_format_provider 'CKEditor', RedmineCkeditor::WikiFormatting::Formatter,
    RedmineCkeditor::WikiFormatting::Helper
end

Loofah::HTML5::WhiteList::ALLOWED_PROTOCOLS.replace RedmineCkeditor.allowed_protocols
