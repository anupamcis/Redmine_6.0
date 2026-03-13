class Holiday < ActiveRecord::Base
  # #attr_accessible :user_id
  # #attr_accessible :start
  # #attr_accessible :end_date, :reason
  belongs_to(:user)
  validates :start, :date => true
  validates :end_date, :date => true
  validates_presence_of :start, :end_date
  validate :validate_holiday
  validate :back_date_validation, on: :create
  validates_presence_of :reason
  
  def validate_holiday
    if self.start && self.end_date && (start_changed? || end_date_changed?) && self.end_date < self.start
      errors.add :end_date, l(:greater_than_start)
    end
  end

  def back_date_validation
    if self.start && (Date.parse(self.start.strftime('%a, %d %b %y')) < User.current.today)
      errors.add :start, l(:dont_allow_back_date)
    end
  end
end
