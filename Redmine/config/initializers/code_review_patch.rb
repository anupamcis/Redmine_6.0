# Ensure Code Review patches are applied
Rails.application.config.to_prepare do
  begin
    # Load the patch files
    require_relative '../../plugins/redmine_code_review/lib/code_review_issue_patch'
    
    # Apply the patch to Issue model
    unless Issue.included_modules.include?(CodeReviewIssuePatch)
      Issue.send(:include, CodeReviewIssuePatch)
      Rails.logger.info "Applied CodeReviewIssuePatch to Issue model"
    end
    
    # Ensure the associations exist
    unless Issue.reflect_on_association(:code_review)
      Issue.class_eval do
        has_one :code_review, :dependent => :destroy
        has_one :code_review_assignment, :dependent => :destroy
      end
      Rails.logger.info "Added code_review associations to Issue model"
    end
    
    # Verify
    if Issue.reflect_on_association(:code_review)
      Rails.logger.info "Code review association verified on Issue model"
    end
  rescue => e
    Rails.logger.error "Failed to apply Code Review patches: #{e.class}: #{e.message}"
  end
end

