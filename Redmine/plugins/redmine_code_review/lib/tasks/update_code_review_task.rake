namespace :redmine do
  task update_code_review_items: :environment do
    code_defect_issues =  Issue.joins(:code_review)
    code_review_issues = Issue.joins(:code_review_assignment)
    project_ids  = code_review_issues.map(&:project_id) + code_defect_issues.map(&:project_id)
    project_name = Project.where(id: project_ids).map(&:name)

    code_defect_issues.update_all(tracker_id: Tracker.last) if code_defect_issues.present?
    puts "#{a =  code_defect_issues.to_a.size} Issue tracker updated to Code Defect"
    code_review_issues.update_all(tracker_id: Tracker.last(2).first)
    puts "#{b = code_review_issues.to_a.size} Issue tracker updated to Code Review"

    puts "Total #{a+b} issues updated from following projects #{project_name.join(', ')}"
  end
end
