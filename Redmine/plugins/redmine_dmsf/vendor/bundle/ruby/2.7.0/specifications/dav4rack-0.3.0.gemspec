# -*- encoding: utf-8 -*-
# stub: dav4rack 0.3.0 ruby lib

Gem::Specification.new do |s|
  s.name = "dav4rack".freeze
  s.version = "0.3.0"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Chris Roberts".freeze]
  s.date = "2012-12-30"
  s.description = "WebDAV handler for Rack".freeze
  s.email = "chrisroberts.code@gmail.com".freeze
  s.executables = ["dav4rack".freeze]
  s.extra_rdoc_files = ["README.rdoc".freeze]
  s.files = ["README.rdoc".freeze, "bin/dav4rack".freeze]
  s.homepage = "http://github.com/chrisroberts/dav4rack".freeze
  s.rubygems_version = "3.1.6".freeze
  s.summary = "WebDAV handler for Rack".freeze

  s.installed_by_version = "3.1.6" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 3
  end

  if s.respond_to? :add_runtime_dependency then
    s.add_runtime_dependency(%q<nokogiri>.freeze, [">= 1.4.2"])
    s.add_runtime_dependency(%q<uuidtools>.freeze, ["~> 2.1.1"])
    s.add_runtime_dependency(%q<rack>.freeze, [">= 1.1.0"])
  else
    s.add_dependency(%q<nokogiri>.freeze, [">= 1.4.2"])
    s.add_dependency(%q<uuidtools>.freeze, ["~> 2.1.1"])
    s.add_dependency(%q<rack>.freeze, [">= 1.1.0"])
  end
end
