# Compatibility shim for plugins expecting deprecated white_list_sanitizer (Rails <=6)

# Provide ActionView::Base.white_list_sanitizer to point to the current safe_list_sanitizer
begin
  class ActionView::Base
    class << self
      def white_list_sanitizer
        # Use Rails HTML Sanitizer vendor directly (Rails 7+)
        Rails::HTML::Sanitizer.safe_list_sanitizer.new
      end
    end
  end
rescue NameError
  # If ActionView is not loaded yet, ignore; Rails will require this initializer after load.
end


