module OrgReports
  module ProjectPatch
    def self.included(base)
      base.extend(ClassMethods)
      base.send(:include, InstanceMethods)

      base.class_eval do
        unloadable
        
        validates_presence_of :major_technology
        

        safe_attributes 'major_technology'

        has_one :project_spi_and_cpi, :dependent => :destroy

        scope :projects_with_issue_count, -> (issue_count) { select('id').
          joins(:issues).
          group('projects.id').
          having("count(issues.id) >= (?)", issue_count)
        }

        scope :projects_with_hours_size, -> (to, from) { select('id').
          joins(:services).
          group('projects.id').
          having("SUM(services.total_hrs) between ? and ?", from.to_f, to.to_f)
        }

        scope :projects_user_indirectly_connected, -> (user_id) {
          select('id').joins(:group_hierarchies).
          where("group_hierarchies.user_id = ?", user_id)
        }
      end
    end

    module InstanceMethods
    end

    module ClassMethods
      # def projects_with_size_and_issue_count(from, to, issue_count, projects)
      #   query =  "select distinct sum(A.total_hrs) ,A.id, A.name,
      #     A.description, A.homepage, A.is_public, A.parent_id, A.created_on,
      #     A.updated_on, A.identifier, A.status, A.lft, A.rgt, A.inherit_members,
      #     A.default_version_id, A.dmsf_description, A.dmsf_notification,
      #     A.product_backlog_id, A.project_author_id, A.erp_client_id,
      #     A.major_technology from
      #     ( SELECT distinct services.total_hrs as total_hrs,
      #     issues.id as issuesid ,[projects].* FROM [projects]
      #     INNER JOIN [issues] ON [issues].[project_id] = [projects].[id]
      #     INNER JOIN [service_details] ON [service_details].[project_id] = [projects].[id]
      #     INNER JOIN [services] ON [services].[erp_service_id] = [service_details].[erp_service_id])
      #     A GROUP BY A.issuesid,A.id, A.name, A.description, A.homepage,
      #     A.is_public, A.parent_id, A.created_on, A.updated_on, A.identifier,
      #     A.status, A.lft, A.rgt, A.inherit_members, A.default_version_id,
      #     A.dmsf_description, A.dmsf_notification, A.product_backlog_id,
      #     A.project_author_id, A.erp_client_id, A.major_technology
      #     HAVING (COUNT(A.issuesid) >= #{issue_count.to_i}) or
      #     (SUM(A.total_hrs) between #{from.to_f} and #{to.to_f})"
      #     projects.find_by_sql(query).map(&:id)
      # end

      # def indirect_projects_with_size_and_count(from, to, issue_count, projects)
      #   ind_p_query = "select distinct sum(A.total_hrs) ,A.id, A.name,
      #     A.description, A.homepage, A.is_public, A.parent_id, A.created_on,
      #     A.updated_on, A.identifier, A.status, A.lft, A.rgt, A.inherit_members,
      #     A.default_version_id, A.dmsf_description, A.dmsf_notification,
      #     A.product_backlog_id, A.project_author_id, A.erp_client_id,
      #     A.major_technology from
      #     ( SELECT distinct services.total_hrs as total_hrs, issues.id as issuesid ,[projects].* FROM [projects]
      #     INNER JOIN [group_hierarchies] ON [group_hierarchies].[project_id] = [projects].[id]
      #     INNER JOIN [issues] ON [issues].[project_id] = [projects].[id]  INNER JOIN [service_details] ON [service_details].[project_id] = [projects].[id] INNER JOIN [services] ON [services].[erp_service_id] = [service_details].[erp_service_id]
      #     INNER JOIN [members] ON [projects].[id] = [members].[project_id] WHERE [members].[user_id] = #{User.current.id} AND (projects.status<>9) AND (group_hierarchies.user_id = #{User.current.id})
      #     ) A GROUP BY A.issuesid,A.id, A.name, A.description, A.homepage,
      #     A.is_public, A.parent_id, A.created_on, A.updated_on, A.identifier,
      #     A.status, A.lft, A.rgt, A.inherit_members, A.default_version_id,
      #     A.dmsf_description, A.dmsf_notification, A.product_backlog_id,
      #     A.project_author_id, A.erp_client_id, A.major_technology
      #     HAVING (COUNT(A.issuesid) >= #{issue_count.to_i}) or
      #     (SUM(A.total_hrs) between #{from.to_f} and #{to.to_f})"
      #     projects.find_by_sql(ind_p_query).map(&:id)
      # end

      def query_with_bug_percent(percent, projects)
        query = "SELECT p.* FROM [projects] p INNER JOIN [time_entries] te ON te.[project_id] = p.[id]
          INNER JOIN [issues] i ON i.[id] = te.[issue_id]
          GROUP BY p.id, p.name, p.description, p.homepage, p.is_public, p.parent_id,
          p.created_on, p.updated_on, p.identifier, p.status, p.lft, p.rgt, p.inherit_members,
          p.default_version_id, p.dmsf_description, p.dmsf_notification, p.product_backlog_id, p.project_author_id,
          p.erp_client_id, p.major_technology,i.tracker_id HAVING i.tracker_id=1 AND
          isnull((((SELECT Sum(hours) FROM [time_entries] tt INNER JOIN [issues] ii ON tt.issue_id=ii.id  WHERE tt.[project_id] =  p.id and ii.tracker_id=1)/
          (SELECT Sum(estimated_hours) FROM [issues] WHERE [issues].[project_id] = p.id ))*100),0)>=#{percent}"
        projects.find_by_sql(query).map(&:id)
      end
    end
  end
end
