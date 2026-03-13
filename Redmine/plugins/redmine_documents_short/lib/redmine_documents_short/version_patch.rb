module RedmineDocumentsShort
  module VersionPatch
    def self.included(base)
      base.class_eval do
        has_many :documents
      end
    end
  end
end
