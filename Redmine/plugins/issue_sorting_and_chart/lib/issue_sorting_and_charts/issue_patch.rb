module IssueSortingAndCharts
    module IssuePatch

      def self.included(base)
        base.send(:include, InstanceMethods)

        base.class_eval do
          before_save :update_status_according_to_issue_done
          before_save :add_watcher_users_list
          after_create :set_due_date
          validates :estimated_hours, :numericality => {:greater_than_or_equal_to => 0, :allow_nil => true, :message => :invalid}, presence: true , on: [:create]
          validates :start_date, :date => true, presence: true
        end
      end

      module InstanceMethods
        def update_status_according_to_issue_done
          tracker =  self.tracker.name if self.tracker.present?
          if(done_ratio > 0 && done_ratio < 100 && status.name.eql?("New"))
            new_status = IssueStatus.find_by(name: 'In Progress')
            self.status_id = new_status.id
          elsif(done_ratio == 100 && ['New', 'In Progress'].include?(status.name))
            status_name = tracker.eql?("Task/ Feature") ? 'Closed' : 'Resolved'
            new_status =  IssueStatus.find_by(name: status_name)
            self.status_id = new_status.id
            self.actual_end_date = Time.now
          end
        end

        def add_watcher_users_list
          company =  Company.find_by(name: 'CIS')
          users = self.watcher_users
          users = (users + self.project.users.sort).uniq
          if is_private
            users = users.reject{|user| user.company_id != company.id}
          end
          self.watcher_user_ids = users.map(&:id)
        end

        def set_due_date
          if self.due_date.nil?
            daily_hrs = project.daily_hours || 8
            mod = (estimated_hours).modulo(daily_hrs)
            days = (estimated_hours / daily_hrs).floor
            # Need to subtract 1 so that due date will also include start date.
            days = mod > 0 ? days : days - 1
            self.due_date = (days).business_days.after(start_date)
            self.save
          end
        end
      end
    end
end

