module HolidaysHelper
  
  def holiday_settings_tabs
    tabs = []
    tabs << {:name => 'general', :partial => 'holidays/general', :label => :label_public_holidays}
    # tabs << {:name => 'leaves', :partial => 'holidays/leaves', :label => :label_user_leaves_plural}
    tabs
  end
end
