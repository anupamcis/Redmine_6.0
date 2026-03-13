Rails.application.config.to_prepare do
  if defined?(Redmine::MenuManager)
    Redmine::MenuManager.map(:top_menu) do |menu|
      menu.delete(:home)
    end
  end
end