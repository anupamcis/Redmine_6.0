module RedmineDocumentsShort
  module DocumentPatch
    def self.included(base)
      base.send(:include, InstanceMethods)

      base.class_eval do
        safe_attributes 'version_id'
        belongs_to :version
      end
    end

    module InstanceMethods
      def attachments_editable?(usr=nil)
        (usr || User.current).admin? || (usr || User.current).allowed_to?(:edit_attachments, self.project)
      end
    end
  end
end
