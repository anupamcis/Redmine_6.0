module RedmineFavoriteProjects
  module Patches
    module AutoCompletesControllerPatch
      def self.included(base)
        base.send(:include, InstanceMethods)
        base.class_eval do
        end
      end

      module InstanceMethods
        def project_tags
          unless request.xhr? || request.format.json?
            render_404
            return
          end

          if Project.respond_to?(:available_tags)
            @tags = Project.available_tags
          else
            @tags = []
          end

          # Filter tags if query is provided
          q = (params[:q] || params[:term]).to_s.strip.downcase
          if q.present?
            if @tags.is_a?(Array)
              # Filter array directly
              @tags = @tags.select { |tag| tag.name.to_s.downcase.include?(q) }.first(10)
            elsif @tags.respond_to?(:where)
              # If it's an ActiveRecord relation or has where method
              begin
                if defined?(RedmineCrm::Tag) && RedmineCrm::Tag.respond_to?(:table_name)
                  @tags = @tags.where("LOWER(#{RedmineCrm::Tag.table_name}.name) LIKE ?", "%#{q}%").limit(10)
                else
                  @tags = @tags.where("LOWER(name) LIKE ?", "%#{q}%").limit(10)
                end
              rescue => e
                Rails.logger.warn("Error filtering tags: #{e.message}")
                # Fallback to array filtering if where fails
                if @tags.respond_to?(:to_a)
                  tags_array = @tags.to_a
                  @tags = tags_array.select { |tag| tag.name.to_s.downcase.include?(q) }.first(10)
                else
                  @tags = []
                end
              end
            end
          elsif @tags.is_a?(Array)
            @tags = @tags.first(10)
          elsif @tags.respond_to?(:limit)
            @tags = @tags.limit(10)
          end
          
          respond_to do |format|
            format.html { render :layout => false, :partial => 'project_tag_list' }
            format.json { render :json => @tags.map { |tag| tag.respond_to?(:name) ? tag.name : tag.to_s } }
          end
        end
      end
    end
  end
end

unless AutoCompletesController.included_modules.include?(RedmineFavoriteProjects::Patches::AutoCompletesControllerPatch)
  AutoCompletesController.send(:include, RedmineFavoriteProjects::Patches::AutoCompletesControllerPatch)
end
