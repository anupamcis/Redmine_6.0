# frozen_string_literal: true

# Handles CORS preflight (OPTIONS) requests at the middleware layer so they
# never reach other Rack handlers (e.g., WebDAV) or controller filters that
# expect authenticated users. This ensures browsers receive the required
# CORS headers before issuing the actual cross-origin XHR/fetch request.
class CorsPreflightMiddleware
  ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  DEFAULT_ALLOWED_HEADERS = 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With'
  MAX_AGE = '1728000'

  def initialize(app)
    @app = app
  end

  def call(env)
    request = Rack::Request.new(env)
    return handle_preflight(request, env) if request.options?

    @app.call(env)
  end

  private

  def handle_preflight(request, env)
    origin = env['HTTP_ORIGIN']
    allowed_headers = env['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']

    headers = {
      'Access-Control-Allow-Origin' => origin || '*',
      'Access-Control-Allow-Methods' => ALLOWED_METHODS,
      'Access-Control-Allow-Headers' => allowed_headers.presence || DEFAULT_ALLOWED_HEADERS,
      'Access-Control-Max-Age' => MAX_AGE
    }

    # Only include credentials header when we echo a specific Origin
    headers['Access-Control-Allow-Credentials'] = 'true' if origin.present?

    [200, headers, []]
  end
end

Rails.application.config.middleware.insert_before 0, CorsPreflightMiddleware

