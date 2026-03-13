class CustomLogger < Logger
  def format_message(severity, timestamp, progname, msg)
    "#{timestamp.to_formatted_s(:db)} #{severity} #{msg}\n"
  end
end

logfile = File.open("#{Rails.root}/log/imap_cron.log", 'a')  # create log file
logfile.sync = true  # automatically flushes data to file
CUSTOM_LOGGER = CustomLogger.new(logfile) # constant accessible anywhere