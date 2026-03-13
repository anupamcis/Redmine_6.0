# Compatibility shim for legacy plugins that call `unloadable`.
# Rails 7 removed `unloadable`; define it as a no-op so old plugins load.
unless Module.method_defined?(:unloadable)
  class Module
    def unloadable(*_args); end
  end
end


