class UpdateProjectTypeFromServiceDetails < ActiveRecord::Migration[7.2]
  def up
    ServiceDetail.find_each do |service_detail|
      next if service_detail.project_id.blank? || service_detail.service_detail_type.blank?

      Project.where(id: service_detail.project_id).update_all(project_type: service_detail.service_detail_type)
    end
  end

  def down
    Project.update_all(project_type: 'Hourly')
  end
end