module UserCompany
  module MembersHelperPatch
    def self.included(base)
      base.extend(ClassMethods)
      base.send(:include, InstanceMethods)

      base.class_eval do
        def render_principals_for_new_members_default_company(project, limit = 100 )
          scope = nil
          if params.has_key?(:q) && params[:q] != ""
            scope = Principal.active.visible.sorted.joins(:company).where("companies.default_company = ? ", true)
            scope = scope.joins(:company,:email_address).where("(LOWER(companies.name) LIKE '%#{params[:q].downcase}%' OR LOWER(users.firstname) LIKE '%#{params[:q].downcase}%' OR LOWER(users.lastname) LIKE '%#{params[:q].downcase}%' OR LOWER(email_addresses.address) LIKE '%#{params[:q].downcase}%' OR (LOWER(users.firstname) + ' ' + LOWER(users.lastname) like '%#{params[:q].downcase}%'))")
          end
          if scope.nil?
            l(:intrenal_member_search)
          else
            principal_count = scope.count
            principal_pages = Redmine::Pagination::Paginator.new principal_count, limit, params['page']
            principals = scope.offset(principal_pages.offset).limit(principal_pages.per_page).to_a
            user_heading_tag = principal_count > 0 ? content_tag('h2', "Users") : ''
            s =  (user_heading_tag + content_tag('div',
                    content_tag('div', principals_check_box_tags('membership[user_ids][]', principals), :id => 'principals'),
                    :class => 'objects-selection'
            ) + content_tag('br')).html_safe
            if principal_count > 0 
              links = pagination_links_full(principal_pages, principal_count, :per_page_links => false) {|text, parameters, options|
                link_to text, autocomplete_project_memberships_path(project, parameters.merge(:q => params[:q], :format => 'js')), :remote => true
              }
            end
            if !s.nil? && principal_count > 0
              s + content_tag('span', links, :class => 'pagination')+ content_tag('br')
            else
              l(:internal_user_not_found)
            end
          end
        end

        def render_principals_for_new_members_client_company(project, limit = 100)
          scope = nil
          if params.has_key?(:q) && params[:q] != ""
            scope = Principal.active.visible.sorted.joins(:company).where("companies.default_company = ? ", false)
            scope = scope.joins(:company,:email_address).where("(LOWER(companies.name) LIKE '%#{params[:q].downcase}%' OR LOWER(users.firstname) LIKE '%#{params[:q].downcase}%' OR LOWER(users.lastname) LIKE '%#{params[:q].downcase}%' OR LOWER(email_addresses.address) LIKE '%#{params[:q].downcase}%' OR (LOWER(users.firstname) + ' ' + LOWER(users.lastname) like '%#{params[:q].downcase}%'))")
          end
          if scope.nil?
            l(:external_member_search)
          else
            principal_count = scope.count
            principal_pages = Redmine::Pagination::Paginator.new principal_count, limit, params['page']
            principals = scope.offset(principal_pages.offset).limit(principal_pages.per_page).to_a
            if project.identifier != GLOBAL_PERMISSIONS_MODULE_NAME
              heading_tag = principal_count > 0 ? content_tag('h2', "Clients") : ''
              s1 =  (heading_tag + content_tag('div',
                        content_tag('div', principals_check_box_tags_for_client('membership[user_ids][]', principals), :id => 'principals'),
                        :class => 'objects-selection'
              )).html_safe
            end
            if principal_count > 0
              links = pagination_links_full(principal_pages, principal_count, :per_page_links => false) {|text, parameters, options|
                link_to text, autocomplete1_project_memberships_path(project, parameters.merge(:q => params[:q], :format => 'js')), :remote => true
              }
            end
            if principal_count > 0 && project.identifier != GLOBAL_PERMISSIONS_MODULE_NAME
              s1 + content_tag('span', links, :class => 'pagination')
            else
              l(:client_not_found)
            end
          end
        end
      end
    end

    module ClassMethods
    end

    module InstanceMethods
    end
  end
end
