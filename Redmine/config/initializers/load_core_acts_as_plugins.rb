# Ensure Redmine core acts_as extensions are loaded under Rails 7/zeitwerk
begin
  core_plugins = %w[
    acts_as_customizable
    acts_as_searchable
    acts_as_event
    acts_as_activity_provider
    acts_as_attachable
    acts_as_watchable
  ]

  # Load once on boot
  core_plugins.each do |plugin|
    init_path = File.join(Rails.root.to_s, 'lib', 'plugins', plugin, 'init.rb')
    lib_path  = File.join(Rails.root.to_s, 'lib', 'plugins', plugin, 'lib', "#{plugin}.rb")
    require init_path if File.file?(init_path)
    require lib_path if File.file?(lib_path)
  end

  # Ensure availability on each reload in development
  Rails.application.config.to_prepare do
    core_plugins.each do |plugin|
      init_path = File.join(Rails.root.to_s, 'lib', 'plugins', plugin, 'init.rb')
      lib_path  = File.join(Rails.root.to_s, 'lib', 'plugins', plugin, 'lib', "#{plugin}.rb")
      load init_path if File.file?(init_path)
      load lib_path if File.file?(lib_path)
    end
  end
rescue => e
  Rails.logger.warn("Failed to load core acts_as plugins: #{e.class}: #{e.message}") if defined?(Rails)
end


