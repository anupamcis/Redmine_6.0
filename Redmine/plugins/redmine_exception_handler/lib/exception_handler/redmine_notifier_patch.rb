module ExceptionHandler
  module RedmineNotifierPatch
    def self.included(target)
      target.send(:include, InstanceMethods)
      target.send(:alias_method, :exception_notification_without_database, :exception_notification)
      target.send(:alias_method, :exception_notification, :exception_notification_with_database)
    end

    module InstanceMethods
      def exception_notification_with_database(env, exception, options = {})
        postfix_value = options[:imap_error].present? && options[:imap_error].eql?("imap_error") ? " Email Fecting Error" : ""
        settings = Setting.plugin_redmine_exception_handler
        options[:exception_recipients] = settings['exception_handler_recipients'].split(',').map(&:strip)
        options[:sender_address] = settings['exception_handler_sender_address']
        options[:email_prefix] = settings['exception_handler_prefix'] + postfix_value
        options[:email_format] = (settings['exception_handler_email_format'] || 'text').to_sym
        exception_notification_without_database(env, exception, options)
      end

    end

  end
end