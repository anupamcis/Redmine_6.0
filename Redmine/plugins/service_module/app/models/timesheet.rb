class Timesheet < ActiveRecord::Base

  validates_presence_of :erp_employee_id
  belongs_to :user
  belongs_to :service_detail, :foreign_key => 'service_detail_id', :primary_key => 'erp_service_detail_id'
  belongs_to :issue, :foreign_key => 'item_id'

  def item_name
    "##{self.item_id} #{issue.subject}"
  end

  def timesheet_services
    issue.timesheets.map(&:service_detail).uniq
  end

  def send_item_ids(params)
    all_ids = []
    project_ids = []
    params[:timesheet].each do |value|
      if value[:project_id].present?
        all_ids << {"pro_#{value[:project_id].to_i}": value[:project_id].to_i,
        "ser_#{value[:project_id].to_i}": value[:service_id],
        "sd_#{value[:project_id].to_i}": value[:service_detail_id],
        "project_id": value[:project_id].to_i}
        project_ids << get_project_ids_with_descendants(value[:project_id])
      end
    end
    project_ids = project_ids.flatten.uniq
    if project_ids.compact.present?
      items_list = get_item_list(project_ids).uniq
      build_items_hash(items_list, all_ids)
    else
      false
    end
  end

  def get_project_ids_with_descendants(project_id)
    project = begin
      Project.find(project_id)
    rescue ActiveRecord::RecordNotFound
      nil
    end
    project_ids_with_child = []
    project_ids_with_child << project_id
    if (project.present?)
      if project.descendants.present?
        project.descendants.each do |child_project|
          if child_project.service_details.present? == false
            project_ids_with_child << child_project.id
          end
        end
      else
        project_ids_with_child << project.id
      end
    else
      []
    end
    project_ids_with_child
  end

  def get_item_list(project_ids)
    items  = Issue.where(project_id: project_ids).where("created_on >= ? or updated_on >= ?",
    Time.now.beginning_of_day, Time.now.beginning_of_day)
  end

  def build_items_hash(items_list, all_ids)
    items = []
    if items_list.present?
      items_list.each do |item|
        all_ids.each do |id|
          if id["pro_#{item.project.id}".to_sym] == item.project.id
            items << {
              project_id: item.project.id,
              service_id: id["ser_#{item.project.id}".to_sym].present? ? id["ser_#{item.project.id}".to_sym] : "",
              service_detail_id: id["sd_#{item.project.id}".to_sym].present? ? id["sd_#{item.project.id}".to_sym] : "",
              item_id: item.id,
              item_name: item.subject
            }
          elsif !all_ids.map{|i| i[:project_id]}.include?(item.project_id) && id["pro_#{item.project.id}".to_sym].to_i == 0 && !items.map {|i| i[:item_id]}.include?(item.id)
            service_data = parent_service_id(all_ids, item.project, item.project.parent)
            service_id = all_ids.map{|i| i["ser_#{item.project.try(:parent).try(:id)}".to_sym] }.compact.first
            service_detail_id = all_ids.map{|i| i["sd_#{item.project.try(:parent).try(:id)}".to_sym] }.compact.first
            items << {
              project_id: item.project.id,
              service_id: service_data.present? ? service_data[0] : "",
              service_detail_id: service_data.present? ? service_data[1] : "",
              item_id: item.id,
              item_name: item.subject
            }
          else
          end
        end
      end
      items
    else
      false
    end
  end

  def parent_service_id(all_ids, project, parent_project)
    if project.parent.present? && all_ids.map{|i| i[:project_id]}.include?(parent_project.id)
      @service_id = all_ids.map{|i| i["ser_#{parent_project.try(:id)}".to_sym] }.compact.first
      @service_detail_id = all_ids.map{|i| i["sd_#{parent_project.try(:id)}".to_sym] }.compact.first
    else
      parent_project1 = parent_project.parent
      parent_service_id(all_ids, project, parent_project1)
    end
    [@service_id, @service_detail_id]
  end

  def submit_timesheet(params)
    item_ids = []
    result = []
    params.each do |value|
      result << if value[:item_id].present?
        spent_hours_on_items(value)
      else
        create_item_and_spent_hours(value)
      end
    end
    result
  end

  def add_timesheet_data(params, item_id=nil)
    item_id = (params[:item_id].present? && item_id.nil?) ? params[:item_id] : item_id
    issue =  Issue.find(item_id)
    user_id = issue.assigned_to_id.present? ? issue.assigned_to_id : User.first.id
    time_sheet = Timesheet.new(project_id: params[:project_id], item_id: item_id,
    service_id: params[:service_id], service_detail_id: params[:service_detail_id],
    filled_hrs: convert_in_decimal_time(params[:filled_hrs]), filled_date: params[:filled_date],
    erp_employee_id: params[:employee_id], user_id: user_id)
    if time_sheet.save
      true
    else
      time_sheet.errors
    end
  end

   def spent_hours(params, item_id=nil)
    item_id = (params[:item_id].present? && item_id.nil?) ? params[:item_id] : item_id
    issue =  Issue.find(item_id)
    user_id = issue.assigned_to_id.present? ? issue.assigned_to_id : User.first.id
    time_entry = TimeEntry.new(project_id: params[:project_id], 
    issue_id: item_id, hours: convert_in_decimal_time(params[:filled_hrs]), activity_id: params[:activity_id],
    spent_on: Date.parse(params[:filled_date]))
    time_entry.user_id = user_id
    if time_entry.save
      true
    else
      time_entry.errors
    end
  end

  def spent_hours_on_items(params)
    spent_hours_status = spent_hours(params)
    if spent_hours_status.eql?(true)
      time_sheet_status = add_timesheet_data(params)
      if time_sheet_status.eql?(true)
        true
      else
        time_sheet_status
      end
    else
      spent_hours_status
    end
  end

  def create_item_and_spent_hours(params)
    created_item_status = create_item(params)
    if created_item_status.persisted?
      spent_hours_status = spent_hours(params, created_item_status.id)
      if spent_hours_status.eql?(true)
        time_sheet_status = add_timesheet_data(params, created_item_status.id)
        if time_sheet_status.eql?(true)
          true
        else
          time_sheet_status
        end
      else
        spent_hours_status
      end
    else
      created_item_status
    end
  end

  def create_item(params)
    tracker_id = Tracker.where("name like (?)", "%task%").first.id
    priority_id = IssuePriority.where("name like ?", "%normal%").first.id
    
    issue  = Issue.new(tracker_id: tracker_id, project_id: params[:project_id],
    subject: params[:item_name], description: params[:item_name],
    status_id: 1, assigned_to_id: 1, priority_id: priority_id,
    author_id: 1, is_private: true)

    if issue.save
      issue
    else
      issue.errors
    end
  end

  def convert_in_decimal_time(filled_hrs)
    hour_minutes = filled_hrs.split(" ").map(&:to_i)
    minutes = ((hour_minutes[0].to_i*60) + hour_minutes[2].to_i)
    decimal_time = (minutes.to_f/60).round(2)
  end

end
