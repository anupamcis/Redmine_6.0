module ServiceModule
  module ProjectPatch
    # Define application types constant
    TYPES = [
      ['Web Application', 'web_application'],
      ['Mobile Application', 'mobile_application'],
      ['Desktop Application', 'desktop_application'],
      ['API Service', 'api_service'],
      ['Database', 'database'],
      ['Infrastructure', 'infrastructure'],
      ['Other', 'other']
    ].freeze

    def self.included(base)
      base.send(:include, InstanceMethods)

      base.class_eval do
        has_many :service_details, :dependent => :nullify
        has_many :services, through: :service_details
        belongs_to :company, foreign_key: 'erp_client_id', primary_key: 'erp_client_id'

        validate :service_alredy_assigned
        validates_presence_of :description
        validates_presence_of :application_type, on: :create
        validates_length_of :description, :minimum => 100
        alias_method :allowed_parents_without_service_module, :allowed_parents
        alias_method :allowed_parents, :allowed_parents_with_service_module

        safe_attributes 'application_type', 'major_technology', 'tag_list'
        
        after_save :set_tag_list_after_save, if: -> { @tag_list_to_set.present? }
        
        # Tags association-like method (returns tag objects with .name method)
        # Used by redmine_favorite_projects plugin views
        def tags
          return [] unless ActiveRecord::Base.connection.table_exists?('taggings')
          return [] if new_record?
          
          conn = ActiveRecord::Base.connection
          tag_names = conn.select_values(
            "SELECT t.name FROM #{conn.quote_table_name('tags')} t 
             INNER JOIN #{conn.quote_table_name('taggings')} tg ON t.id = tg.tag_id 
             WHERE tg.taggable_id = #{id} AND taggable_type = #{conn.quote('Project')}"
          )
          
          # Return tag-like objects that respond to .name
          require 'ostruct' unless defined?(OpenStruct)
          tag_names.map { |name| OpenStruct.new(name: name) }
        rescue => e
          Rails.logger.warn("Error getting tags: #{e.message}")
          []
        end
        
        # Class method for available tags (used by redmine_favorite_projects plugin)
        # Returns an array of tag-like objects that respond to .name
        def self.available_tags
          return [] unless ActiveRecord::Base.connection.table_exists?('tags')
          
          conn = ActiveRecord::Base.connection
          tag_names = conn.select_values(
            "SELECT DISTINCT name FROM #{conn.quote_table_name('tags')} ORDER BY name"
          )
          
          # Create tag-like objects that respond to .name
          # Use OpenStruct for simple object creation
          require 'ostruct' unless defined?(OpenStruct)
          tags = tag_names.map { |name| OpenStruct.new(name: name) }
          
          # Extend the array to support where and limit methods
          tags.extend(Module.new do
            def where(condition)
              # Simple where implementation for LIKE queries
              if condition.is_a?(String) && condition.include?('LIKE')
                pattern = condition.match(/LIKE\s+['"]([^'"]+)['"]/i)
                if pattern
                  search_term = pattern[1].gsub('%', '').downcase
                  select { |tag| tag.name.to_s.downcase.include?(search_term) }
                else
                  self
                end
              else
                self
              end
            end
            
            def limit(count)
              first(count.to_i)
            end
          end)
          
          tags
        rescue => e
          Rails.logger.warn("Error getting available_tags: #{e.message}")
          []
        end
        
        # Tag list implementation using ActiveRecord
        def tag_list
          return '' unless ActiveRecord::Base.connection.table_exists?('taggings')
          return '' if new_record?
          
          # Use ActiveRecord to query tags (database-agnostic)
          conn = ActiveRecord::Base.connection
          adapter_name = conn.adapter_name.downcase
          
          # Build query based on database type
          if adapter_name == 'sqlserver'
            sql = "SELECT TOP 1 t.name FROM #{conn.quote_table_name('tags')} t 
                   INNER JOIN #{conn.quote_table_name('taggings')} tg ON t.id = tg.tag_id 
                   WHERE tg.taggable_id = #{id} AND tg.taggable_type = #{conn.quote('Project')}"
            # For SQL Server, we need to get all tags, not just one
            sql = "SELECT t.name FROM #{conn.quote_table_name('tags')} t 
                   INNER JOIN #{conn.quote_table_name('taggings')} tg ON t.id = tg.tag_id 
                   WHERE tg.taggable_id = #{id} AND tg.taggable_type = #{conn.quote('Project')}"
          else
            sql = "SELECT t.name FROM #{conn.quote_table_name('tags')} t 
                   INNER JOIN #{conn.quote_table_name('taggings')} tg ON t.id = tg.tag_id 
                   WHERE tg.taggable_id = #{id} AND tg.taggable_type = #{conn.quote('Project')}"
          end
          
          tag_names = conn.select_values(sql)
          tag_names.join(', ')
        rescue => e
          Rails.logger.warn("Error getting tag_list: #{e.message}")
          ''
        end
        
        def tag_list=(tags_string)
          return unless ActiveRecord::Base.connection.table_exists?('taggings')
          return if tags_string.blank?
          
          # Store tag_list to be set after save (works for both new and existing records)
          @tag_list_to_set = tags_string.to_s
          
          # If project is already saved, set tags immediately
          unless new_record?
            set_tag_list_after_save
            @tag_list_to_set = nil
          end
        end
        
        # Set tags after project is saved
        def set_tag_list_after_save
          return unless @tag_list_to_set
          return unless ActiveRecord::Base.connection.table_exists?('taggings')
          
          conn = ActiveRecord::Base.connection
          adapter_name = conn.adapter_name.downcase
          
          # Clear existing tags
          conn.execute(
            "DELETE FROM #{conn.quote_table_name('taggings')} 
             WHERE taggable_id = #{id} AND taggable_type = #{conn.quote('Project')}"
          )
          
          # Parse and create tags
          tag_names = @tag_list_to_set.split(',').map(&:strip).reject(&:blank?).uniq
          tag_names.each do |tag_name|
            next if tag_name.blank?
            
            # Find or create tag (database-agnostic)
            quoted_name = conn.quote(tag_name)
            if adapter_name == 'sqlserver'
              tag_id = conn.select_value(
                "SELECT TOP 1 id FROM #{conn.quote_table_name('tags')} 
                 WHERE name = #{quoted_name}"
              )
            else
              tag_id = conn.select_value(
                "SELECT id FROM #{conn.quote_table_name('tags')} 
                 WHERE name = #{quoted_name} LIMIT 1"
              )
            end
            
            unless tag_id
              # Create new tag (tags table only has id and name columns)
              conn.execute(
                "INSERT INTO #{conn.quote_table_name('tags')} (name) 
                 VALUES (#{quoted_name})"
              )
              
              # Get the inserted tag ID (database-agnostic)
              if adapter_name == 'mysql2'
                tag_id = conn.select_value("SELECT LAST_INSERT_ID()")
              elsif adapter_name == 'sqlserver'
                # SQL Server uses SCOPE_IDENTITY() or OUTPUT clause
                tag_id = conn.select_value("SELECT SCOPE_IDENTITY()")
                # If that doesn't work, query by name
                tag_id ||= conn.select_value(
                  "SELECT TOP 1 id FROM #{conn.quote_table_name('tags')} 
                   WHERE name = #{quoted_name} ORDER BY id DESC"
                )
              else
                # PostgreSQL and others
                tag_id = conn.select_value(
                  "SELECT id FROM #{conn.quote_table_name('tags')} 
                   WHERE name = #{quoted_name} ORDER BY id DESC LIMIT 1"
                )
              end
            end
            
            # Create tagging (avoid duplicates)
            if adapter_name == 'sqlserver'
              existing = conn.select_value(
                "SELECT TOP 1 id FROM #{conn.quote_table_name('taggings')} 
                 WHERE tag_id = #{tag_id} AND taggable_id = #{id} AND taggable_type = #{conn.quote('Project')}"
              )
            else
              existing = conn.select_value(
                "SELECT id FROM #{conn.quote_table_name('taggings')} 
                 WHERE tag_id = #{tag_id} AND taggable_id = #{id} AND taggable_type = #{conn.quote('Project')} LIMIT 1"
              )
            end
            
            unless existing
              # Use database-appropriate date handling
              if adapter_name == 'sqlserver'
                # SQL Server uses GETDATE() or CURRENT_TIMESTAMP
                conn.execute(
                  "INSERT INTO #{conn.quote_table_name('taggings')} (tag_id, taggable_id, taggable_type, created_at) 
                   VALUES (#{tag_id}, #{id}, #{conn.quote('Project')}, GETDATE())"
                )
              else
                # Other databases use quoted_date
                now = conn.quoted_date(Time.current)
                conn.execute(
                  "INSERT INTO #{conn.quote_table_name('taggings')} (tag_id, taggable_id, taggable_type, created_at) 
                   VALUES (#{tag_id}, #{id}, #{conn.quote('Project')}, #{now})"
                )
              end
            end
          end
          
          @tag_list_to_set = nil
        rescue => e
          Rails.logger.error("Error setting tag_list: #{e.message}")
          Rails.logger.error(e.backtrace.join("\n"))
        end
      end
    end

    module InstanceMethods
      def attch_project_to_services_on_erp
        return unless defined?(ErpServiceProjects)
        self.service_details.each do |service_detail|
          begin
            ErpServiceProjects.new.add_project_id_to_service_detail({service_id: service_detail.erp_service_id,
            service_detail_id: service_detail.erp_service_detail_id, project_id: self.id
            })
          rescue => e
            Rails.logger.error "Failed to attach project to ERP service: #{e.message}"
          end
        end
      end

      def detach_ptoject_from_services_on_erp(service_detail)
        return unless defined?(ErpServiceProjects)
        begin
          ErpServiceProjects.new.detach_project_id_from_service_detail({service_id: service_detail.erp_service_id,
          service_detail_id: service_detail.erp_service_detail_id, project_id: self.id
          })
        rescue => e
          Rails.logger.error "Failed to detach project from ERP service: #{e.message}"
        end
      end

      def allowed_parents_with_service_module(user=User.current)
        return @allowed_parents if @allowed_parents
        @allowed_parents = Project.all.to_a
        @allowed_parents = @allowed_parents - self_and_descendants
        if user.allowed_to?(:add_project, nil, :global => true) || (!new_record? && parent.nil?)
          @allowed_parents << nil
        end
        unless parent.nil? || @allowed_parents.empty? || @allowed_parents.include?(parent)
          @allowed_parents << parent
        end
        @allowed_parents
      end

    end

    private

    def service_alredy_assigned
      if self.new_record? && self.service_details.present? && self.service_details.map(&:project_id).compact.present?
        self.errors.add(:base, l(:service_already_assigned))
      end
    end
  end
end
