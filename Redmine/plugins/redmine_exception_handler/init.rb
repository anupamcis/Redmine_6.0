require 'redmine'

Redmine::Plugin.register :redmine_exception_handler do
  name 'Redmine Exception Handler plugin'
  author 'Eric Davis'
  description 'Send emails when exceptions occur in Redmine.'
  # Use a static version string to avoid referencing missing constants
  version '0.0.1'
  requires_redmine :version_or_higher => '2.0.0'

  settings :default => {
    'exception_handler_recipients' => 'you@example.com, another@example.com',
    'exception_handler_sender_address' => 'Application Error <redmine@example.com>',
    'exception_handler_prefix' => '[ERROR]',
    'exception_handler_email_format' => 'text'
  }, :partial => 'settings/exception_handler_settings'

end

# Exception Notification gem has been removed for Rails 7 compatibility.
# Guard usage so the plugin can load without the gem.
begin
  require 'exception_notification'
  ExceptionNotifier::Notifier.send(:include, ExceptionHandler::RedmineNotifierPatch) if defined?(ExceptionNotifier::Notifier)
  RedmineApp::Application.config.middleware.use ExceptionNotifier if defined?(ExceptionNotifier)
rescue LoadError
  # Skip exception notification setup when the gem is unavailable
end
