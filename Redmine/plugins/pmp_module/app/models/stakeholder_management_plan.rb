class StakeholderManagementPlan < ActiveRecord::Base

  belongs_to :project
  belongs_to :user
  validates_presence_of :user_id

  delegate :name, to: :user, prefix: true

  before_validation do |model|
    model.unaware.reject!(&:blank?) if model.unaware
    model.resistant.reject!(&:blank?) if model.resistant
    model.netural.reject!(&:blank?) if model.netural
    model.supportive.reject!(&:blank?) if model.supportive
    model.leading.reject!(&:blank?) if model.leading
  end


  serialize :unaware
  serialize :resistant
  serialize :netural
  serialize :supportive
  serialize :leading

  def select_box_values
    ["Current engagement", "Desired engagement"]
  end

end
