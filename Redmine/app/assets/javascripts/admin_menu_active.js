// Admin menu active state handler
document.addEventListener('DOMContentLoaded', function() {
  // Function to add active styling to plugin menu items
  function updateActiveMenuItems() {
    const currentPath = window.location.pathname;
    
    // Define the mapping of paths to menu item classes
    const menuMappings = {
      '/bug_categories': 'bug-category',
      '/master_departments': 'department', 
      '/raci_charts': 'raci-chart',
      '/global_pmp_profiles': 'pmp-global-profiles',
      '/pmp_tab_and_lock_configurations': 'label-pmp-tab-plural',
      '/settings/plugin/redmine_agile': 'agile',
      '/dmsf_workflows': 'dmsf-approvalworkflows',
      '/video_tutorials/new': 'add-tutorial',
      '/repository/project_repository': 'find-repository',
      '/untracked_mails': 'untracked-mail',
      '/companies': 'company',
      '/core_fields': 'redmine-customize-core-fields'
    };
    
    // Remove active class from all plugin menu items first
    const pluginMenuItems = document.querySelectorAll('#admin-menu a.bug-category, #admin-menu a.department, #admin-menu a.raci-chart, #admin-menu a.pmp-global-profiles, #admin-menu a.label-pmp-tab-plural, #admin-menu a.agile, #admin-menu a.dmsf-approvalworkflows, #admin-menu a.add-tutorial, #admin-menu a.find-repository, #admin-menu a.untracked-mail, #admin-menu a.company, #admin-menu a.redmine-customize-core-fields');
    
    pluginMenuItems.forEach(function(item) {
      item.classList.remove('selected', 'active');
    });
    
    // Add active class to the current menu item
    for (const [path, className] of Object.entries(menuMappings)) {
      if (currentPath.includes(path)) {
        const activeItem = document.querySelector(`#admin-menu a.${className}`);
        if (activeItem) {
          activeItem.classList.add('selected');
        }
        break;
      }
    }
  }
  
  // Run on page load
  updateActiveMenuItems();
  
  // Also run when navigating (for SPA-like behavior)
  window.addEventListener('popstate', updateActiveMenuItems);
});
