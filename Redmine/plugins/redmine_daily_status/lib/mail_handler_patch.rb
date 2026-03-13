module MailHandlerPatch
  def self.included(base)
    base.send(:include, InstanceMethods)

      base.class_eval do

      end
  end

  module InstanceMethods
    def receive_daily_status_reply_reply(daily_status_id, from_journal=nil)
      daily_status = DailyStatusReply.find_by_id(daily_status_id).daily_status
      return unless daily_status
      daily_staus_reply = DailyStatusReply.new(message: cleaned_up_text_body, author_id: user.id, daily_status_id: daily_status.id)
      add_attachments(daily_staus_reply)
      daily_staus_reply.save
      daily_staus_reply.email
    end
    private :receive_daily_status_reply_reply

    def receive_daily_status_reply(daily_status_id, from_journal=nil)
      daily_status = DailyStatus.find_by_id(daily_status_id)
      return unless daily_status
      daily_staus_reply = DailyStatusReply.new(message: cleaned_up_text_body, author_id: user.id, daily_status_id: daily_status_id)
      add_attachments(daily_staus_reply)
      daily_staus_reply.save
      daily_staus_reply.email
    end
    private :receive_daily_status_reply
  end
end


