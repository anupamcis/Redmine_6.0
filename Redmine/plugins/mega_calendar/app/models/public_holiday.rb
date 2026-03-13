class PublicHoliday < ActiveRecord::Base

  def self.add_public_holidays
    holiday_list = ErpPublicHolidays.new.get_holiday_list
    public_holiday_list = PublicHoliday.all
    unless public_holiday_list.nil?
      public_holiday_list.delete_all
    end
    return if holiday_list.nil? || holiday_list['has_error']
    holiday_list.each do |data|
      parsed_date = Date.strptime(data["date"], "%m/%d/%Y")
      PublicHoliday.create(name: data["name"], event_date: parsed_date)
    end
    true
  end

  def self.events_dates(year)
    PublicHoliday.where("YEAR(event_date) =  ? ", year.to_i).map {|public_holiday| (Date.parse(public_holiday.event_date.strftime('%a, %d %b %y')))}
  end
end
