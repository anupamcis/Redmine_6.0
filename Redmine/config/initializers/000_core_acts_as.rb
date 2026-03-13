# Ensure core Redmine acts_as extensions are loaded as early as possible
begin
      core_plugins = %w[
        acts_as_customizable
        acts_as_searchable
        acts_as_event
        acts_as_activity_provider
        acts_as_attachable
        acts_as_watchable
        acts_as_tree
      ]

  core_plugins.each do |plugin|
    init_path = File.join(Rails.root.to_s, 'lib', 'plugins', plugin, 'init.rb')
    lib_path  = File.join(Rails.root.to_s, 'lib', 'plugins', plugin, 'lib', "#{plugin}.rb")
    require init_path if File.file?(init_path)
    require lib_path if File.file?(lib_path)
  end
rescue => e
  Rails.logger.warn("000_core_acts_as failed: #{e.class}: #{e.message}") if defined?(Rails)
end


