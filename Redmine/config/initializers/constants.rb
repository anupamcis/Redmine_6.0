CLIENT_USERS_ROLE = "Client –"
SYSTEM_ROLES = "CIS - "
DEFAULT_MEMBER_ROLE = "CIS CXOs" unless defined?(DEFAULT_MEMBER_ROLE)
DEFAULT_MEMBER_GROUP = "CIS CXOs"
GLOBAL_PERMISSIONS_MODULE_NAME = "global-permissions" unless defined?(GLOBAL_PERMISSIONS_MODULE_NAME)
CURRENT_VERSION = "2.7"
MAILING_TRACKER = ["Bug", "Task", "Support", "Test case", "Feature", "HR Jobs"]
MANAGEMENT_ROLE = "CIS - Management"
ERP_STAGING_API_TOKEN = "V6SFHYZR8RARG9HU"
ERP_LIVE_API_TOKEN = "D38KCO4BAV1XG06U"
GIT_FOLDER_PATH = "/opt/git/akeel.q"
LOCAL_GIT_FOLDER_PATH = "/opt/git/akeel.q"
GITLAB_LIVE_URL = "https://git.cisin.com/api/v3"
GITLAB_LOCAL_URL = "http://192.168.3.148/api/v3"
APP_CONFIG = YAML.load_file(Rails.root.join('config/configuration.yml'))
#CONFIG_MAIL = APP_CONFIG['default']['email_delivery']['smtp_settings']['user_name']
FIX_EMPOLYEE_PARENT_LIST = ["MY825LLG86", "1PG33S3856", "N0041NMH76", "13827LCP40", "S8425AQ371",
 "F0Y25T7572", "R1U26HGT66", "JOM25YRL60", "E6525EDX53", "45W25TC254"]
PMP_CONTROLLERS =  ["hardware_software_plans", "hardware_software_suplied_by_clients",
  "acronyms_and_glossaries", "user_role_and_responsibilities", "staff_needs",
  "responsibility_assignment_matrices", "training_needs",
  "knowledge_and_skill_requirements", "communication_plans", "coordination_plans",
  "stakeholder_management_plans", "verification_plans", "type_of_testings",
  "risks", "lessons", "reusable_artifacts", "project_folder_structures",
  "configuration_items", "back_up_details", "configuration_audits", "data_retention_plans",
  "base_lining_plans", "client_specific_credentials",
  "customer_specific_security_requirements","standard_and_guidlines","deployment_strategies",
  "project_monitoring_reviews", "pmp_reports", "project_responsibility_assignment_matrix_filters"]
HW_SW_PREFIX = "HW SW Profile"
MILESTONE_CLOSING_COMMENT = "Closed Milestone"
MILESTONE_REOPEN_COMMENT = "Reopened Milestone"
ALL_SERVICE_STATUS = ["IN-PROGRESS", "FINISHED", "FAILED", "HOLD"]
SERVICE_ACTIVE_STATUS = "IN-PROGRESS"
RISK_CATEGORY = ["Technology","Process Related","Environmental","Personnel skill",
  "Customer related","Resource retention","Complexity of the Product",
  "Unstable requirement","Inaccurate estimates"]
RISK_SOURCE = ["Project Management","Customer","Requirements","Design",
    "Implementation","Testing", "Support functions", "Communication", "Quality"]
SDLC_PHASE = ["Requirement analysis", "Design", "Development", "Testing", "Deployment"]
VERIFIATION_METHODS = ["PM Review", "Peer Review", "Client Review"]
BASE_LINE_STATIC_VALUES = [
  ["Review is done, All defects are closed", "Task Completed", "Design"],
  ["Review is done, All defects are closed", "Task Completed",  "Code"],
  ["Review is done, All defects are closed", "Task Completed",  "Test Plan"],
  ["Review is done, All defects are closed", "Task Completed",  "Requirements"]
]

DMFS_DEFUALT_FOLDER = ["User documentation", "Technical documentation",
  "Help and manual", "Reports", "UI and UX", "Standards and guidelines",
   "Other", "Project management", "Test cases"
]
DEFAULT_VERIFICATION_PLAN = [
  {sdlc_phase: "Requirement analysis", work_product: "Requirement understanding Document", verification_method: "PM Review", validation_technique: "RUD Review"},
  {sdlc_phase: "Testing", work_product: "Unit test cases, test reports", verification_method: "Peer Review", validation_technique: "Test case Review"},
  {sdlc_phase: "Design", work_product: "System design documents", verification_method: "PM Review", validation_technique: "System Design Review"},
  {sdlc_phase: "Development", work_product: "Developed software", verification_method: "Peer Review", validation_technique: "Code Review"},
  {sdlc_phase: "Deployment", work_product: "Sign off document", verification_method: "PM Review", validation_technique: "Sign off Review"}
]
COORDINATION_NEED_MILESTONE = "Acceptance on delivery for "
COORDINATION_NEED_TRANING = "Acceptance on "
CLIENT_COMMUNICATION_NEED = "Requirement gathering and milestone meeting to get approval on completed phases"
CLIENT_COMMUNICATION_MEANS = "Skype and Email"
MEMBER_COMMUNICATION_NEED  = "Daily Update on the progress"
MEMBER_COMMUNICATION_MEANS = "In Person, Group Meeting"
COMMUNICATION_MEANS = [["Monthly","Monthly"], ["Weekly", "Weekly"],
["Daily", "Daily"], ["Fortnight", "Fortnight"] ]
WORK_TYPE_RESPONSBILITY = ["R", "A", "C", "I"]
HR_HEAD_ROLE = "Sr. Manager"
RACI_WORK_TYPE = [
  {parent_type: "Initiate Phase Activities", work_type: "Create project charter"},
  {parent_type: "Initiate Phase Activities", work_type: "Requirement Analysis"},
  {parent_type: "Initiate Phase Activities", work_type: "Wireframes"},
  {parent_type: "Initiate Phase Activities", work_type: "Application Architecture"},
  {parent_type: "Initiate Phase Activities", work_type: "Estimation"},
  {parent_type: "Plan Phase Activities", work_type: "WBS/Schedule"},
  {parent_type: "Plan Phase Activities", work_type: "Human Resource"},
  {parent_type: "Plan Phase Activities", work_type: "HW/SW resources"},
  {parent_type: "Execute Phase Activity", work_type: "Build Deliverables"},
  {parent_type: "Execute Phase Activity", work_type: "Testing"},
  {parent_type: "Control Phase Activity", work_type: "Quality Control (Metric)"},
  {parent_type: "Control Phase Activity", work_type: "Change Request"},
  {parent_type: "Close Phase Activity", work_type: "Lesson Learn"},
  {parent_type: "Close Phase Activity", work_type: "Project closure"},
]
GLOBAL_WORK_PRODUCT = [ "RUD", "SRS", "CM",  "Tracebility Matrix",
"ERP", "PMS2.0", "Test Plan ", "Test Case", "Integration Plan", "UAT",
"Peer review defect documented", "Defect Tracker", "Matrix Data define/maintain or not",
"Risk", "Change Request" ]
GLOBAL_TYPE_OF_TESTING = [
{name: "Unit Testing", value: "<ol>
  <li>Entry criteria would be:&nbsp; when each module is completely developed and peer review has been done.</li>
  <li>Unit test cases will be created by developers and testing would be performed by them.</li>
  <li>Test data creation would be responsibility of developers.</li>
  <li>Test stop criteria would be: all the test cases have been executed and final results are as per the requirements.</li>
  <li>Test environment would be setup by IT department as defined in Hardware / Software plan.</li>
  <li>Test results will be&nbsp; analyzed and issues will be fixed by the developer.</li>
  <li>Test result analysis would be done at weekly basis.&nbsp;</li>
</ol>"},
{name: "Integration Testing", value: "<ol>
  <li>Entry criteria would be: at least two different modules are completely developed and peer review has been done.</li>
  <li>Test cases will be created by testers and testing would be performed by them.</li>
  <li>Test data creation would be responsibility of testers.</li>
  <li>Test stop criteria would be: 90% of all the test cases and&nbsp; all the higher priority test cases have been executed and final results are as per the requirements also no new issues are visible in regression testing.</li>
  <li>Test environment would be setup by IT department as defined in Hardware / Software plan. &nbsp;</li>
  <li>Test results will be available in excel sheet and tracked to closure.</li>
  <li>Test result analysis would be done at weekly basis.&nbsp;</li>
</ol>"},
{name: "System Testing", value: "<ol>
  <li>Entry criteria would be: Integration testing has been performed and all the raised issues are fixed.</li>
  <li>Test cases will be created by testers and testing would be performed by them.</li>
  <li>Test data creation would be responsibility of testers.</li>
  <li>Test stop criteria would be:&nbsp;&nbsp; All the test cases have been executed and final results are as per the requirements also no new issues are visible in regression testing.</li>
  <li>Test environment would be setup by IT department as defined in Hardware / Software plan. &nbsp;</li>
  <li>Test results will be available in excel sheet and tracked to closure.&nbsp; &nbsp;</li>
  <li>Test result analysis would be done at at end of the project.&nbsp;</li>
</ol>"},
{name: "UAT", value: "<ol>
  <li>Business Requirements must be available.</li>
  <li>Application Code should be fully developed</li>
  <li>Unit Testing, Integration Testing &amp; System Testing should be completed</li>
  <li>No Show stoppers, High, Medium defects in System Integration Test Phase -</li>
  <li>Only Cosmetic error are acceptable before UAT</li>
  <li>Regression Testing should be completed with no major defects</li>
  <li>All the reported defects should be fixed and tested before UAT</li>
  <li>Traceability matrix for all testing should be completed</li>
  <li>UAT Environment must be ready</li>
  <li>Sign off mail or communication from System Testing Team that the system is ready for UAT execution</li>
</ol>"}
]
RACI_ROLES_CONFIG = ["Delivery Manager", "Project manager", "Team Members", "Quality Manager",
  "UI/UX Manager", "Mobile Manager", "Web Manager", "HR Manager", "IT Manager", "BD Manager",
  "Business Analyst", "Process Manager", "Client POC"
]

DELIVERY_MANAGER_RACI_REPONSBILITIES = {
  "Create project charter" =>  ["I"],
  "Requirement Analysis" => ["I"],
  "Wireframes" => ["I"],
  "Application Architecture" => ["I"],
  "Estimation" => ["I"],
  "WBS/Schedule" => ["I"],
  "Human Resource" => ["I"],
  "HW/SW Resources" => ["I"],
  "Change Request" => ["I"],
  "Lesson Learn" => ["C"],
  "Project closure" => ["C"]
}

PROJECT_MANAGER_RACI_REPONSBILITIES = {
  "Create project charter" =>  ["I"],
  "Requirement Analysis" => ["A"],
  "Wireframes" => ["A"],
  "Application Architecture" => ["A", "R"],
  "Estimation" => ["A"],
  "WBS/Schedule" => ["A", "R"],
  "Human Resource" => ["A"],
  "HW/SW Resources" => ["A"],
  "Build Deliverables" => ["A"],
  "Testing" => ["A"],
  "Change Request" => ["A", "R"],
  "Lesson Learn" => ["A"],
  "Project closure" => ["A", "R"]
}

TEAM_MEMBER_RACI_REPONSBILITIES = {
  "Requirement Analysis" => ["R"],
  "Wireframes" => ["R"],
  "Estimation" => ["R"],
  "WBS/Schedule" => ["R"],
  "Human Resource" => ["I"],
  "HW/SW Resources" => ["C"],
  "Build Deliverables" => ["R"],
  "Change Request" => ["R"],
  "Lesson Learn" => ["C"],
  "Project closure" => ["R"]
}

QA_RACI_REPONSBILITIES = {
  "Requirement Analysis" => ["R"],
  "Wireframes" => ["R"],
  "Estimation" => ["R"],
  "WBS/Schedule" => ["R"],
  "Human Resource" => ["C"],
  "HW/SW Resources" => ["C"],
  "Build Deliverables" => ["R"],
  "Testing" => ["R"],
  "Change Request" => ["R"],
  "Lesson Learn" => ["C"],
  "Project closure" => ["R"]
}

UI_UX_MANAGER_RACI_REPONSBILITIES = {
  "Requirement Analysis" => ["R"],
  "Wireframes" => ["R"],
  "Estimation" => ["R"],
  "WBS/Schedule" => ["R"],
  "Human Resource" => ["C"],
  "HW/SW Resources" => ["C"],
  "Build Deliverables" => ["R"],
  "Change Request" => ["R"],
  "Lesson Learn" => ["C"],
  "Project closure" => ["I"]
}

IT_MANAGER_RACI_REPONSBILITIES = {
  "WBS/Schedule" => ["I"],
  "Human Resource" => ["I"],
  "HW/SW Resources" => ["R"],
  "Lesson Learn" => ["C"],
  "Project closure" => ["I"]
}

ACCOUNT_MANAGER_RACI_REPONSBILITIES = {
  "Create project charter" =>  ["A", "R"],
  "Requirement Analysis" => ["I"],
  "Estimation" => ["I"],
  "WBS/Schedule" => ["I"],
  "Human Resource" => ["I"],
  "HW/SW Resources" => ["I"],
  "Change Request" => ["I"],
  "Lesson Learn" => ["C"],
  "Project closure" => ["I"]
}

PROCESS_MANAGER_RACI_REPONSBILITIES = {
  "Create project charter" =>  ["I"],
  "Requirement Analysis" => ["C"],
  "Application Architecture" => ["I"],
  "WBS/Schedule" => ["I"],
  "Human Resource" => ["R"],
  "Change Request" => ["I"],
  "Lesson Learn" => ["C"]
}

CLIENT_RACI_REPONSBILITIES = {
  "Create project charter" => ["C"],
  "Requirement Analysis" => ["C"],
  "Wireframes" => ["C"],
  "Application Architecture" => ["C"],
  "Estimation" => ["C"],
  "WBS/Schedule" => ["C"],
  "Human Resource" => ["I"],
  "Build Deliverables" => ["I"],
  "Change Request" => ["C"],
  "Lesson Learn" => ["C"],
  "Project closure" => ["I"]
}

HR_MANAGER_RACI_REPONSBILITIES = {
  "WBS/Schedule" => ["I"],
  "Human Resource" => ["R"],
  "Lesson Learn" => ["C"],
  "Project closure" => ["I"]
}

MOBILE_AND_WEB_MANAGER_RACI_REPONSBILITIES = {
  "Requirement Analysis" => ["R"],
  "Wireframes" => ["R"],
  "Application Architecture" => ["R"],
  "WBS/Schedule" => ["R"],
  "Human Resource" => ["C"],
  "HW/SW Resources" => ["C"],
  "Build Deliverables" => ["R"],
  "Change Request" => ["R"]
}
