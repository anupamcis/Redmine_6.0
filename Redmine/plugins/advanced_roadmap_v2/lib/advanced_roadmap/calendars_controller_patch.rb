require_dependency "calendars_controller"

module AdvancedRoadmap
  module CalendarsControllerPatch
    def self.included(base)
      base.class_eval do

        # around_filter :add_milestones, :only => [:show]

        def add_milestones
          # yield
          view = ActionView::Base.new(File.join(File.dirname(__FILE__), "..", "..", "app", "views"))
          view.class_eval do
            include ApplicationHelper
          end
          @milestones = []
          @query.milestones(:conditions => ["effective_date BETWEEN ? AND ?",
                                            @calendar.startdt,
                                            @calendar.enddt]).each do |milestone|
            if (milestone.project.members.present? && milestone.project.members.map(&:user_id).include?(User.current.id)) || User.current.admin?
              @milestones << milestone
            end
          end
          @milestones
          # response.body += view.render(:partial => "hooks/calendars/milestones",
                                       # :locals => {:milestones => milestones})
        end

      end
    end
  end
end
