# frozen_string_literal: true

# The rich gem's input classes are conditionally defined only if Formtastic v2.x is present.
# Since Formtastic is not installed, Zeitwerk complains that files don't define the expected constants.
# We ignore all input files from the rich gem to prevent autoloading errors.
Rails.autoloaders.main.ignore(
  Rails.root.join('vendor', 'bundle', '**', 'gems', 'rich-*', 'app', 'inputs')
)

