# Performance fix (FINDING-008): Add missing indexes for SearchController#index
# These indexes optimize search queries that filter by project and order by date
class AddSearchPerformanceIndexes < ActiveRecord::Migration[7.2]
  def self.up
    # Composite index for created_on + id (used in fetch_ranks_and_ids ordering)
    # This speeds up ORDER BY created_on DESC, id DESC queries
    # Note: project_id + created_on index already exists (issues_project_id)
    unless index_exists?(:issues, [:created_on, :id])
      add_index :issues, [:created_on, :id], 
                name: 'index_issues_on_created_on_and_id'
    end

    # Index for journals on journalized_type + journalized_id + created_on
    # Used when searching journal notes with ordering
    unless index_exists?(:journals, [:journalized_type, :journalized_id, :created_on])
      add_index :journals, [:journalized_type, :journalized_id, :created_on],
                name: 'index_journals_on_journalized_and_created_on'
    end

    # Index for attachments on container_type + container_id + created_on
    # Used when searching attachment filenames/descriptions with ordering
    unless index_exists?(:attachments, [:container_type, :container_id, :created_on])
      add_index :attachments, [:container_type, :container_id, :created_on],
                name: 'index_attachments_on_container_and_created_on'
    end
  end

  def self.down
    remove_index :issues, name: 'index_issues_on_created_on_and_id' if index_exists?(:issues, [:created_on, :id])
    remove_index :journals, name: 'index_journals_on_journalized_and_created_on' if index_exists?(:journals, [:journalized_type, :journalized_id, :created_on])
    remove_index :attachments, name: 'index_attachments_on_container_and_created_on' if index_exists?(:attachments, [:container_type, :container_id, :created_on])
  end
end

