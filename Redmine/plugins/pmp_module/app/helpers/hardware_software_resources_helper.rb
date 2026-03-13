module HardwareSoftwareResourcesHelper
  def hardware_software_settings_tabs
    tabs = []
    tabs << {:name => 'hardware_software_resource' , :partial => 'hardware_software_resources/resource', :label => :label_hardware_software_resource_plural}
    tabs << {:name => 'hardware_software_configuration', :partial => 'hardware_software_resources/configuration', :label => :label_hardware_software_configuration_plural}
    # tabs << {:name => 'memberships', :partial => 'groups/memberships', :label => :label_project_plural}
    tabs
  end
end
