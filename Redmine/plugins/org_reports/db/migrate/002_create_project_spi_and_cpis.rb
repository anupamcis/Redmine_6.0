class CreateProjectSpiAndCpis < ActiveRecord::Migration[4.2]
  def change
    create_table :project_spi_and_cpis do |t|
      t.float :spi
      t.float :cpi
      t.integer :project_id
      t.datetime :created_on
      t.datetime :updated_on
    end
  end
end
