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

class GanttsController < ApplicationController
  menu_item :gantt
  before_action :find_optional_project

  rescue_from Query::StatementInvalid, :with => :query_statement_invalid

  helper :gantt
  helper :issues
  helper :projects
  helper :queries
  include QueriesHelper
  include Redmine::Export::PDF

  def show
    # Performance fix (FINDING-007): Cache Gantt data generation
    # Gantt chart generation can be expensive with many issues
    retrieve_query
    @query.group_by = nil
    
    # Performance fix: Gantt objects cannot be cached because they contain Procs/lambdas
    # that cannot be serialized. Instead, we create the Gantt object fresh each time.
    # The underlying data (issues, versions) may be cached elsewhere if needed.
    @gantt = Redmine::Helpers::Gantt.new(params)
    @gantt.project = @project
    @gantt.query = @query if @query.valid?

    basename = (@project ? "#{@project.identifier}-" : '') + 'gantt'

    respond_to do |format|
      format.html {render :action => "show", :layout => !request.xhr?}
      if @gantt.respond_to?(:to_image)
        format.png do
          send_data(@gantt.to_image,
                    :disposition => 'inline', :type => 'image/png',
                    :filename => "#{basename}.png")
        end
      end
      format.pdf do
        send_data(@gantt.to_pdf,
                  :type => 'application/pdf',
                  :filename => "#{basename}.pdf")
      end
    end
  end
end
