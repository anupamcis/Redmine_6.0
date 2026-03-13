module UserCompany
  module ApplicationHelperPatch
    def self.included(base)
      base.extend(ClassMethods)
      base.send(:include, InstanceMethods)

      base.class_eval do
        alias_method :principals_check_box_tags_without_user_company, :principals_check_box_tags
        alias_method :principals_check_box_tags, :principals_check_box_tags_with_user_company

        def link_to_member_user(member, options={})
          user = member.user
          if user.is_a?(User)
            if member.master_department.present?
              name = h(user.name(options[:format])) + " (" + member.master_department.try(:name).to_s + ")"
            else
              name = h(user.name(options[:format]))
            end
            if user.active? || (User.current.admin? && user.logged?)
              link_to name, user_path(user), :class => user.css_classes
            else
              name
            end
          else
            h(user.to_s)
          end
        end

        def page_entries_info(collection, options = {})
          entry_name = options[:entry_name] || (collection.empty?? 'item' :
            collection.first.class.name.split('::').last.titleize)
          if collection.total_pages < 2
            case collection.size
            when 0; "No #{entry_name.pluralize} found"
            else; "Displaying all #{entry_name.pluralize}"
            end
          else
            %{Displaying %d - %d of %d #{entry_name.pluralize}} % [
            collection.offset + 1,
            collection.offset + collection.length,
            collection.total_entries
          ]
        end
      end

      end
    end

    module ClassMethods
    end

    module InstanceMethods
      def principals_check_box_tags_with_user_company(name, principals)
        s = ''
        principals.each do |principal|
          if principal.kind_of?(User)
            company = principal.company
            is_cis_user = company.present? && company.default_company
            title = (is_cis_user ? principal.fullname + "(#{principal.try(:mail)})" : company.try(:name))
            s << "<label title='#{title}'>#{ check_box_tag name, principal.id, false, :id => nil, :class => 'users'} #{h principal}</label>\n"
          end
        end
        s.html_safe
      end   
    end
  end
end
