class CreateRaciCharts < ActiveRecord::Migration[4.2]
  def change
    create_table :raci_charts do |t|
      t.string :work_type
      t.timestamp :created_on
      t.timestamp :updated_on
    end
  end
end
