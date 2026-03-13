# frozen_string_literal: true

# Redmine - project management software
# Copyright (C) 2006-  Jean-Philippe Lang
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

module MembersHelper
  # Returns inheritance information for an inherited member role
  def render_role_inheritance(member, role)
    content = member.role_inheritance(role).filter_map do |h|
      if h.is_a?(Project)
        l(:label_inherited_from_parent_project)
      elsif h.is_a?(Group)
        l(:label_inherited_from_group, :name => h.name.to_s)
      end
    end.uniq

    if content.present?
      content_tag('em', content.join(", "), :class => "info")
    end
  end

  def render_principals_for_new_members_default_company(project, limit = 100)
    q = params[:q].to_s.strip
    return l(:intrenal_member_search) if q.blank?

    scope = Principal.active.visible.sorted.not_member_of(project) rescue Principal.none
    q_down = "%#{q.downcase}%"

    begin
      if Principal.reflect_on_association(:company)
        scope = scope.joins(:company)
                     .where(companies: { default_company: true })
                     .joins("LEFT JOIN email_addresses ON email_addresses.user_id = users.id")
                     .where("LOWER(companies.name) LIKE :q OR LOWER(users.firstname) LIKE :q OR LOWER(users.lastname) LIKE :q OR LOWER(email_addresses.address) LIKE :q OR LOWER(CONCAT(users.firstname, ' ', users.lastname)) LIKE :q", q: q_down)
      else
        scope = scope.joins("LEFT JOIN companies ON companies.id = users.company_id")
                     .where("companies.default_company = ?", true)
                     .joins("LEFT JOIN email_addresses ON email_addresses.user_id = users.id")
                     .where("LOWER(companies.name) LIKE ? OR LOWER(users.firstname) LIKE ? OR LOWER(users.lastname) LIKE ? OR LOWER(email_addresses.address) LIKE ? OR LOWER(CONCAT(users.firstname, ' ', users.lastname)) LIKE ?", q_down, q_down, q_down, q_down, q_down)
      end
    rescue StandardError
      return l(:internal_user_not_found)
    end

    principal_count = scope.count
    return l(:internal_user_not_found) if principal_count.zero?

    principal_pages = Redmine::Pagination::Paginator.new principal_count, limit, params['page']
    principals = scope.offset(principal_pages.offset).limit(principal_pages.per_page).to_a

    s = (content_tag('h2', "Users") +
         content_tag('div', content_tag('div', principals_check_box_tags('membership[user_ids][]', principals), id: 'principals',class: 'principal users'), class: 'objects-selection') +
         tag.br).html_safe

    links = pagination_links_full(principal_pages, principal_count, per_page_links: false) do |text, parameters, options|
      link_to text, autocomplete_project_memberships_path(project, parameters.merge(q: params[:q], format: 'js')), remote: true
    end

    s + content_tag('span', links, class: 'pagination') + tag.br
  end

  def render_principals_for_new_members_client_company(project, limit = 100)
    
    return content_tag(:p, l(:label_no_data)) unless project.respond_to?(:company) && project.company.present?

    q = params[:q].to_s.strip
    return l(:external_member_search) if q.blank?

    q_down = "%#{q.downcase}%"
    scope = Principal.active.visible.sorted
                   .joins("LEFT JOIN companies ON companies.id = users.company_id")
                   .joins("LEFT JOIN email_addresses ON email_addresses.user_id = users.id")
                   .where("companies.default_company = ? ", false)
                   .where(
                     "LOWER(users.firstname) LIKE ?
                      OR LOWER(users.lastname) LIKE ?
                      OR LOWER(email_addresses.address) LIKE ?
                      OR LOWER(CONCAT(users.firstname, ' ', users.lastname)) LIKE ?
                      OR LOWER(companies.name) LIKE ?",
                     q_down, q_down, q_down, q_down, q_down
                   )

    principal_count = scope.count
      return l(:client_not_found) if principal_count.zero?

    principal_pages = Redmine::Pagination::Paginator.new principal_count, limit, params['page']
    principals = scope.offset(principal_pages.offset).limit(principal_pages.per_page).to_a

    s = (content_tag('h2', "Clients") +
         content_tag('div', content_tag('div', principals_check_box_tags('membership[user_ids][]', principals), id: 'principals', class: 'principal clients'), class: 'objects-selection')).html_safe

    links = pagination_links_full(principal_pages, principal_count, per_page_links: false) do |text, parameters, options|
      link_to text, autocomplete_project_memberships_path(project, parameters.merge(q: params[:q], format: 'js')), remote: true
    end

    s + content_tag('span', links, class: 'pagination')
  end

  def roles_for_display(system_roles, permission_roles, normal_roles)
    excluded = [DEFAULT_MEMBER_ROLE, "QARole", "User Management", "Project Manager"]

    (system_roles + permission_roles)
      .map(&:first)
      .grep(Role)
      .concat(normal_roles)
      .uniq(&:id)
      .reject { |r| excluded.include?(r.name) || r.name.start_with?("CIS -") }
  end
end
