class Company < ActiveRecord::Base
  include Redmine::SafeAttributes

  has_many :users, :dependent => :nullify

  has_many :projects, foreign_key: 'erp_client_id', primary_key: 'erp_client_id'

  has_many :services, foreign_key: 'erp_client_id', primary_key: 'erp_client_id'
  has_many :service_details, through: :services
  belongs_to :author, class_name: "User"

  validates_presence_of :name
  # validates_uniqueness_of :name, :case_sensitive => false
  validates :phone_number, :numericality => true, :allow_blank => true
  validates :fax_number, :numericality => true, :allow_blank => true

  # attr_accessible 'name', 'homepage', 'fax_number', 'phone_number', 'address', 'default_company', 'erp_client_id' # Removed for Rails 5 compatibility

  def self.create_company(params)
    company = Company.find_or_initialize_by(erp_client_id: params[:client_id])
    if company.new_record?
      company.name = params[:client_company_name]
      company.save
    end
    company
  end

  def display_name_with_count
    "#{self.name} (#{self.users.count})"
  end

  def company_users_count
    users.count
  end

  def deletable?
    users.empty?
  end
end
