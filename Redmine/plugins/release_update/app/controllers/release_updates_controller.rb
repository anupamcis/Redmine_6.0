class ReleaseUpdatesController < ApplicationController
  # unloadable removed for Rails 7 compatibility
  include ActionView::Helpers::TextHelper
  before_action :find_release_update, only: [:show, :edit, :update, :vote, :create_release_update_comment, :update_release_update_comment, :comment_vote]
  before_action :find_release_update_comment, only: [:comment_vote, :update_release_update_comment]
  before_action :authorize_global, except: [:comment_vote, :vote]

  def index
    @release_updates = ReleaseUpdate.all.order("release_updates.created_on DESC")
  end

  def new
    @release_update = ReleaseUpdate.new
  end

  def create
    @release_update = ReleaseUpdate.new(params[:release_update])
    description = strip_tags(params[:release_update][:description]).squish
    if description.present? && @release_update.save
      flash[:notice] = "Release note added successfully"
      redirect_to release_update_path(@release_update)
    else
      @release_update.errors.add(:base, "Description cannot be blank") unless description.present?
      render 'new'
    end
  end

  def show
    read_check = @release_update.release_notifications.where(user_id: User.current.id).first

    @release_update.release_notifications.create(user: User.current) unless read_check.present?
    @release_update_comments = @release_update.release_update_comments
    @release_update_comment = ReleaseUpdateComment.new
  end

  def edit
    deny_access unless User.current == @release_update.user || User.current.admin?
  end

  def update
    description = strip_tags(params[:release_update][:description]).squish
    if description.present? && @release_update.update(params[:release_update])
      flash[:notice] = "Release updated successfully"
      redirect_to release_update_path(@release_update)
    else
      @release_update.errors.add(:base, "Description cannot be blank") unless description.present?
      render 'edit'
    end
  end

  def vote
    User.current.voted_up_on?(@release_update) ? @release_update.disliked_by(User.current.becomes(Principal)) : @release_update.liked_by(User.current.becomes(Principal))
    respond_to do |format|
      format.html { redirect_to_referer_or {render :text => (watching ? 'Vote added.' : 'Vote removed.'), :layout => true}}
      format.js
    end
  end

  def comment_vote
    User.current.voted_up_on?(@release_update_comment) ? @release_update_comment.disliked_by(User.current.becomes(Principal)) : @release_update_comment.liked_by(User.current.becomes(Principal))
    respond_to do |format|
      format.html { redirect_to_referer_or {render :text => (watching ? 'Vote added.' : 'Vote removed.'), :layout => true}}
      format.js
    end
  end

  def create_release_update_comment
    @release_update_comment = @release_update.release_update_comments.build(params[:release_update_comment])
    if @release_update.save
      flash[:notice] = "Comment added successfully"
      redirect_to release_update_path(@release_update)
    else
      render 'show'
    end
  end

  def update_release_update_comment
    if @release_update_comment.update(params[:release_update_comment])
      flash[:notice] = "Comment Update successfully"
      redirect_to release_update_path(@release_update)
    else
      render 'edit'
    end
  end

  def create_release_update_comment_reply
    @release_update_comment = ReleaseUpdateComment.find( params[:id])
    @reply = @release_update_comment.release_update_comments.build(params[:release_update_comment])
    if @reply.save
      flash[:notice] = "Reply Update successfully"
      redirect_to release_update_path(@release_update_comment.commentable)
    else
      render 'show'
    end
  end

  def update_release_update_comment_reply
    reply  = ReleaseUpdateComment.find( params[:reply_id])
    @release_update_comment = ReleaseUpdateComment.find( params[:id])
    if reply.update(params[:release_update_comment])
      flash[:notice] = "Reply Update successfully"
      redirect_to release_update_path(@release_update_comment.commentable)
    else
      render 'show'
    end
  end

  private

  def find_release_update
    @release_update = ReleaseUpdate.find(params[:id])
  end

  def find_release_update_comment
    @release_update_comment = ReleaseUpdateComment.find( params[:release_updates_comment_id])
  end
end

