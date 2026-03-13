#Migration file that creates the faqs table and its columns.
class CreateFaqs < ActiveRecord::Migration[4.2]
  def self.up
    create_table :faqs do |t|
      t.column :question, :text, :null => false
      t.column :answer, :text
      t.column :creator, :text
      t.timestamp :created_on
      t.timestamp :updated_on
    end
  end

  def self.down
    drop_table :faqs
  end
end
