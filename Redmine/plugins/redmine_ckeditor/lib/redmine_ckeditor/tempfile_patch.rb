module RedmineCkeditor
  module TempfilePatch
    # Use prepend to avoid alias recursion and support Ruby/Rails updates safely.
    def initialize(basename, *rest)
      super(basename, *rest)
      binmode if basename == "raw-upload."
    end
  end
end

# Prepend the patch into Tempfile (guards against double-prepend)
unless Tempfile.ancestors.include?(RedmineCkeditor::TempfilePatch)
  Tempfile.prepend(RedmineCkeditor::TempfilePatch)
end
