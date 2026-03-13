# Redmine plugin for Document Management System "Features"
#
# Copyright (C) 2011   Vít Jonáš <vit.jonas@gmail.com>
# Copyright (C) 2013   Karel Pičman <karel.picman@kontron.com>
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

module RedmineDmsf
  module Patches
    module ActsAsCustomizable
      # This patch module extends Redmine::Acts::Customizable::InstanceMethods
      def self.apply
        Redmine::Acts::Customizable::InstanceMethods.class_eval do
          def show_custom_field_values
            custom_field_values.delete_if { |v| v.custom_field.blank? || v.value.blank? }          
          end
        end
      end
    end
  end
end

# Apply the patch when Rails is ready (to_prepare ensures Redmine core is loaded)
Rails.application.config.to_prepare do
  RedmineDmsf::Patches::ActsAsCustomizable.apply if defined?(Redmine::Acts::Customizable::InstanceMethods)
end
