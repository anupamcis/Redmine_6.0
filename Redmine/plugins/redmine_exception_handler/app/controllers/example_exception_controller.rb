class ExampleExceptionController < ApplicationController
  layout 'base'

  def index
    raise "example error"
  end
end
