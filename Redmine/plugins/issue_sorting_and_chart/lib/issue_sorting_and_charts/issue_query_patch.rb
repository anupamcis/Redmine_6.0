module IssueSortingAndCharts
    module IssueQueryPatch
      def self.included(base)
        base.send(:include, InstanceMethods)
  
        base.class_eval do
          # include RailsSortable::Model
          # set_sortable :position
        end
      end
      
      module InstanceMethods
        def initialize(attributes=nil, *args)
            super attributes
            self.filters ||= { 'status_id' => {:operator => "*", :values => [""]} }
            self.group_by = 'status'
        end
      end
      
    end
end

  