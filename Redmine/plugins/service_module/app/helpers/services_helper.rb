module ServicesHelper

  def clear_services_link
    if params[:selected_client_company].present? && (params[:supervisor].present? || params[:supervisor].blank?) && params[:services].present?
      link_to "Clear Servcies", services_path(:selected_client_company =>
      params[:selected_client_company], :supervisor => params[:supervisor]), :class => 'icon icon-reload'
    end
  end

end
