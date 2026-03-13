# Ensure Bug Category patches are applied
Rails.application.config.to_prepare do
  begin
    Rails.logger.info "=== Starting Bug Category patch application ==="
    
    # Ensure Issue model is loaded
    Issue
    
    # Load the patch file
    patch_file = File.expand_path('../../plugins/bug_category/lib/bug_categories/issue_patch.rb', __dir__)
    require patch_file unless defined?(BugCategories::IssuePatch)
    
    Rails.logger.info "BugCategories::IssuePatch defined: #{defined?(BugCategories::IssuePatch)}"
    Rails.logger.info "Issue included modules before: #{Issue.included_modules.map(&:name).join(', ')}"
    
    # Apply the patch to Issue model
    unless Issue.included_modules.include?(BugCategories::IssuePatch)
      Issue.send(:include, BugCategories::IssuePatch)
      Rails.logger.info "Applied BugCategories::IssuePatch to Issue model"
    else
      Rails.logger.info "BugCategories::IssuePatch already included"
    end
    
    # Force add the association if it doesn't exist
    unless Issue.reflect_on_association(:bug_category)
      Issue.class_eval do
        belongs_to :bug_category, optional: true
      end
      Rails.logger.info "Force added bug_category association to Issue model"
    else
      Rails.logger.info "bug_category association already exists"
    end
    
    # Verify the association was added
    assoc = Issue.reflect_on_association(:bug_category)
    if assoc
      Rails.logger.info "✓ Bug category association verified: #{assoc.inspect}"
      Rails.logger.info "✓ Issue responds to bug_category: #{Issue.new.respond_to?(:bug_category)}"
    else
      Rails.logger.error "✗ Failed to add bug_category association to Issue model"
    end
    
    Rails.logger.info "=== Bug Category patch application complete ==="
  rescue => e
    Rails.logger.error "Failed to apply Bug Category patches: #{e.class}: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
  end
end

