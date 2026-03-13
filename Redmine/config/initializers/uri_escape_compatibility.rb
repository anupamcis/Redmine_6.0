# URI.escape compatibility patch for Ruby 3.0+
# URI.escape was deprecated in Ruby 2.7 and removed in Ruby 3.0
# This patch adds it back for compatibility with older gems like Paperclip

unless URI.respond_to?(:escape)
  module URI
    def self.escape(str, unsafe = nil)
      if unsafe
        str.gsub(unsafe) { |c| "%%%02X" % c.ord }
      else
        CGI.escape(str)
      end
    end
  end
end
