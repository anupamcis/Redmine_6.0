# Compatibility shim for Rack 3 where Rack::File was renamed to Rack::Files
begin
  require 'rack/files'
  Rack::File = Rack::Files unless defined?(Rack::File)
rescue LoadError
  # If rack/files is not present, do nothing
end


