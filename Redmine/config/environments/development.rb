# frozen_string_literal: true

require 'active_support/core_ext/integer/time'

Rails.application.configure do
  # Settings specified here will take precedence over those in config/application.rb.

  # In the development environment your application's code is reloaded any time
  # it changes. This slows down response time but is perfect for development
  # since you don't have to restart the web server when you make code changes.
  config.enable_reloading = true

  # Do not eager load code on boot.
  config.eager_load = true

  # Show full error reports.
  config.consider_all_requests_local = true

  # Enable/disable caching. By default caching is disabled.
  # Run rails dev:cache to toggle caching.
  # Performance: Always enable caching in development to test performance optimizations
  if Rails.root.join('tmp', 'caching-dev.txt').exist?
    config.action_controller.perform_caching = true
    config.action_controller.enable_fragment_cache_logging = true

    # Use memory store for development - fast and suitable for testing
    config.cache_store = :memory_store, { size: 64.megabytes }
    config.public_file_server.headers = {
      'Cache-Control' => "public, max-age=0"
    }
  else
    # Even without caching-dev.txt, enable caching for performance testing
    config.action_controller.perform_caching = true
    config.action_controller.enable_fragment_cache_logging = true
    config.cache_store = :memory_store, { size: 64.megabytes }
    config.public_file_server.headers = {
      'Cache-Control' => "public, max-age=0"
    }
  end

  # Print deprecation notices to the Rails logger.
  config.active_support.deprecation = [:stderr, :log]

  # Raise exceptions for disallowed deprecations.
  config.active_support.disallowed_deprecation = :raise

  # Tell Active Support which deprecation messages to disallow.
  config.active_support.disallowed_deprecation_warnings = []

  # Raise an error on page load if there are pending migrations.
  config.active_record.migration_error = :page_load

  # Highlight code that triggered database queries in logs.
  config.active_record.verbose_query_logs = true

  # Raises error for missing translations.
  # config.i18n.raise_on_missing_translations = true

  # Annotate rendered view with file names.
  config.action_view.annotate_rendered_view_with_filenames = true

        # Performance: Log cache operations in development for debugging
        # This will log cache hits and misses to help debug caching behavior
        config.after_initialize do
          if Rails.logger && Rails.cache.respond_to?(:fetch)
            original_fetch = Rails.cache.method(:fetch)
            Rails.cache.define_singleton_method(:fetch) do |*args, &block|
              # Extract key safely - don't try to serialize the block
              key = args.first
              key_str = key.respond_to?(:to_s) ? key.to_s : key.inspect
              
              # Check if cache exists - wrap in rescue to prevent errors
              exists = begin
                if respond_to?(:exist?)
                  exist?(key)
                else
                  false
                end
              rescue => e
                # If checking existence fails, just assume miss
                Rails.logger.debug "  [CACHE CHECK ERROR] #{key_str[0..100]}: #{e.message}" if Rails.env.development?
                false
              end
              
              # Log cache status (truncate long keys)
              if exists
                Rails.logger.debug "  [CACHE HIT] #{key_str[0..100]}"
              else
                Rails.logger.debug "  [CACHE MISS] #{key_str[0..100]}"
              end
              
              # Call original fetch - block is passed through safely
              original_fetch.call(*args, &block)
            end
          end
        end

  # Use an evented file watcher to asynchronously detect changes in source code,
  # routes, locales, etc. This feature depends on the listen gem.
# Change from SMTP to file-based delivery for testing
config.action_mailer.delivery_method = :file
config.action_mailer.file_settings = {
  location: Rails.root.join('tmp', 'mail')
}
  # Uncomment if you wish to allow Action Cable access from any origin.
  # config.action_cable.disable_request_forgery_protection = true
end
