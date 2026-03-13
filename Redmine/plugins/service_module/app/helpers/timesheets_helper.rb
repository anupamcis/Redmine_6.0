module TimesheetsHelper

  def service_link(service_details, item_id)
    links = []

    service_details.each do |service_detail|
      links << (link_to service_detail.service_name, service_timesheet_path(service_detail, item_id: item_id),
      :remote => true, :class => "icon icon-add")
    end
    links.join(", ").html_safe
  end
end
