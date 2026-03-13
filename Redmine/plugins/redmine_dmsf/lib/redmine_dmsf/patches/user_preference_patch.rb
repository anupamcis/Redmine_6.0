# encoding: utf-8
#
# Redmine plugin for Document Management System "Features"
#
# Copyright (C) 2011-17 Karel Pičman <karel.picman@kontron.com>
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
    module UserPreferencePatch
      def self.included(base)
        base.send(:include, InstanceMethods)
      end

      module InstanceMethods
        def dmsf_tree_view
          self[:dmsf_tree_view] || '0'
        end

        def dmsf_tree_view=(value)
          self[:dmsf_tree_view] = value
        end
      end
    end
  end
end

# Include the patch into UserPreference
# Use to_prepare to ensure it's loaded on every request in development
Rails.application.config.to_prepare do
  unless UserPreference.included_modules.include?(RedmineDmsf::Patches::UserPreferencePatch)
    UserPreference.send(:include, RedmineDmsf::Patches::UserPreferencePatch)
  end
end

# Also ensure it's included immediately if UserPreference is already loaded
# This handles cases where the class is loaded before the plugin initializes
if defined?(UserPreference)
  unless UserPreference.included_modules.include?(RedmineDmsf::Patches::UserPreferencePatch)
    UserPreference.send(:include, RedmineDmsf::Patches::UserPreferencePatch)
  end
end
