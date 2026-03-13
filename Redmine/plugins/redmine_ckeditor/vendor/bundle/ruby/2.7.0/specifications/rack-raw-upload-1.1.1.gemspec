# -*- encoding: utf-8 -*-
# stub: rack-raw-upload 1.1.1 ruby lib

Gem::Specification.new do |s|
  s.name = "rack-raw-upload".freeze
  s.version = "1.1.1"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Pablo Brasero".freeze]
  s.date = "2013-01-06"
  s.description = "Middleware that converts files uploaded with mimetype application/octet-stream into normal form input, so Rack applications can read these as normal, rather than as raw input.".freeze
  s.email = "pablobm@gmail.com".freeze
  s.extra_rdoc_files = ["LICENSE".freeze, "README.md".freeze]
  s.files = ["LICENSE".freeze, "README.md".freeze]
  s.homepage = "https://github.com/newbamboo/rack-raw-upload".freeze
  s.rdoc_options = ["--charset=UTF-8".freeze, "--main".freeze, "README.rdoc".freeze]
  s.rubygems_version = "3.1.6".freeze
  s.summary = "Rack Raw Upload middleware".freeze

  s.installed_by_version = "3.1.6" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 3
  end

  if s.respond_to? :add_runtime_dependency then
    s.add_runtime_dependency(%q<multi_json>.freeze, [">= 0"])
    s.add_development_dependency(%q<rake>.freeze, [">= 0"])
    s.add_development_dependency(%q<rack-test>.freeze, [">= 0"])
    s.add_development_dependency(%q<shoulda>.freeze, [">= 0"])
    s.add_development_dependency(%q<rr>.freeze, [">= 0"])
  else
    s.add_dependency(%q<multi_json>.freeze, [">= 0"])
    s.add_dependency(%q<rake>.freeze, [">= 0"])
    s.add_dependency(%q<rack-test>.freeze, [">= 0"])
    s.add_dependency(%q<shoulda>.freeze, [">= 0"])
    s.add_dependency(%q<rr>.freeze, [">= 0"])
  end
end
