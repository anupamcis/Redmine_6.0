# -*- encoding: utf-8 -*-
# stub: xapian-full-alaveteli 1.4.22.2 ruby lib
# stub: Rakefile

Gem::Specification.new do |s|
  s.name = "xapian-full-alaveteli".freeze
  s.version = "1.4.22.2"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Tom Adams".freeze, "Rich Lane".freeze, "Seb Bacon".freeze, "Alexey Pisarenko".freeze, "Louise Crow".freeze, "Ian Chard".freeze, "Sam Pearson".freeze, "Graeme Porteous".freeze]
  s.date = "2025-01-07"
  s.description = "Xapian bindings for Ruby without dependency on system Xapian library".freeze
  s.email = "mysociety@alaveteli.org".freeze
  s.extensions = ["Rakefile".freeze]
  s.files = ["Rakefile".freeze]
  s.homepage = "https://github.com/mysociety/xapian-full".freeze
  s.rdoc_options = ["--charset=UTF-8".freeze]
  s.required_ruby_version = Gem::Requirement.new(">= 2.7.0".freeze)
  s.rubygems_version = "3.1.6".freeze
  s.summary = "xapian-core + Ruby xapian-bindings".freeze

  s.installed_by_version = "3.1.6" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 3
  end

  if s.respond_to? :add_runtime_dependency then
    s.add_runtime_dependency(%q<mini_portile2>.freeze, ["~> 2.8"])
    s.add_runtime_dependency(%q<rake>.freeze, ["~> 13.0"])
  else
    s.add_dependency(%q<mini_portile2>.freeze, ["~> 2.8"])
    s.add_dependency(%q<rake>.freeze, ["~> 13.0"])
  end
end
