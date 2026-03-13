module UntrackedMailsHelper

  def show_to_users_name(mails)
    user_names = []
    return "" unless mails.present?
    return mails[0] if mails.size == 1 && CONFIG_MAIL == mails[0]
    mails.each do |mail|
      user = User.joins(:email_address).where("email_addresses.address = ? ", mail).first
      user_names << (user.present? ? user.try(:name) : mail)
    end
    user_names.join(', ')
  end
end
