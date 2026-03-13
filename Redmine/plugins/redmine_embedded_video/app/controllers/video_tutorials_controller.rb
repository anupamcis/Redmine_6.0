class VideoTutorialsController < ApplicationController
  layout :set_layout

  def new
    @video_tutorials = VideoTutorial.all
    @video_tutorial = VideoTutorial.new
  end

  def create
    @video_tutorial = VideoTutorial.new(params[:video_tutorial])
    if @video_tutorial.save
      redirect_to video_tutorials_index_path
    else
      render 'new'
    end
  end

  def index
    settings = Setting.plugin_redmine_embedded_video
    @video_links = settings['internal_tarning_video_links'].gsub("\r\n", "").scan(/[^,]+,[^,]+/)
    @video_tutorials = VideoTutorial.all
  end

  def destroy
    @video = VideoTutorial.find(params['id'])
    if @video.destroy
      redirect_to new_video_tutorial_path
    end
  end

  private

  def set_layout
    case action_name
    when "index"
      'base'
    else
      'admin'
    end
  end
end
