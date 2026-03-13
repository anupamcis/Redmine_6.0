# frozen_string_literal: true

require_relative 'lib/active_record/acts/tree'
Rails.application.reloader.to_prepare do
  ActiveRecord::Base.send :include, ActiveRecord::Acts::Tree
end
