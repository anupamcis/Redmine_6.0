class ProjectSpiAndCpi < ActiveRecord::Base
  unloadable
  include Redmine::SafeAttributes
  # include ProjectAndVersionValue # Removed - undefined constant

  belongs_to :project

  safe_attributes :project_id, :spi, :cpi

  def add_project_cpi_and_spi(project)
    evm_data = project_evm_data(project)
    cpi = evm_data.today_cpi
    spi = evm_data.today_spi
    spi_and_cpi = ProjectSpiAndCpi.find_or_initialize_by(project_id: project.id)
    spi_and_cpi.update_attributes({spi: spi, cpi: cpi})
  end

  def project_evm_data(project)
      evmbaseline = Evmbaseline.where('project_id = ? ', project.id).order('created_on DESC')
      baseline_id = evmbaseline.blank? ? nil : evmbaseline.first.id
      issues = project_issues(project)
      baselines = project_baseline(project.id, baseline_id)
      actual_cost = project_costs project
      basis_date = Date.current
      calcetc = 'method2'
      forecast = nil
      no_use_baseline = evmbaseline.blank? ? 'ture' : nil
      working_hours = Setting.plugin_redmine_issue_evm[:working_hours_of_day].blank? ? 7.5 : Setting.plugin_redmine_issue_evm[:working_hours_of_day].to_f
      project_evm = EvmLogic::IssueEvm.new baselines,
                                  issues,
                                  actual_cost,
                                  basis_date: basis_date,
                                  forecast: forecast,
                                  etc_method: calcetc,
                                  no_use_baseline: no_use_baseline,
                                  working_hours: working_hours
    end
end
