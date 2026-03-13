
module Redmine
  module Scm
    module Adapters
      class GithubAdapter < GitAdapter

        def clone
          cmd_args = %w{clone --mirror}
          cmd_args << url_with_credentials
          cmd_args << root_url
          git_cmd(cmd_args)
        rescue ScmCommandAborted => error
          Rails.logger.error "Github repository cloning failed: #{error.message}"
        end

        def fetch
          Dir.chdir(root_url) do
            cmd_args = %w{fetch --quiet --all --prune}
            git_cmd(cmd_args)
          end
        rescue ScmCommandAborted => error
          Rails.logger.error "commits fetching failed: #{error.message}"
          false
        end

        def update_remote
          cmd_args = %w{remote set-url origin}
          cmd_args << url_with_credentials
          git_cmd(cmd_args)
        end

        private

        def url_with_credentials
          # if  url.include?("@bitbucket.org")
          #   url1 = "https://#{url.split("@").last}"
          # end
          # url = url1.present? ? url1 : url
          if @login.present? && @password.present?
            if url =~ %r{^https://}
              url.sub(%r{^https://}, "https://#{@login.gsub("@", "%40")}:#{@password.gsub("@", "%40")}@")
            elsif url =~ %r{^http://}
              url.sub(%r{^http://}, "http://#{@login.gsub("@", "%40")}:#{@password.gsub("@", "%40")}@")
            else
              url.sub(%r{^git@}, "#{@login}:#{@password}@")
            end
          else
            url
          end
        end
      end
    end
  end
end

# Zeitwerk expects Adapters::GithubAdapter based on file path
module Adapters
  GithubAdapter = Redmine::Scm::Adapters::GithubAdapter
end
