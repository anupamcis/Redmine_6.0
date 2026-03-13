module RedmineCkeditor::WikiFormatting
  module Helper
    def replace_editor_tag(field_id)
      javascript_tag <<-EOT
      (function() {
        function initEditor() {
          #{replace_editor_script(field_id)}
        }
        
        // Try immediate execution if DOM is already loaded
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          setTimeout(initEditor, 1);
        } else {
          document.addEventListener('DOMContentLoaded', initEditor);
        }
        
        // Also listen for turbo events if using Turbo
        document.addEventListener('turbo:load', initEditor);
      })();
      EOT
    end

    def replace_editor_script(field_id)
      <<-EOT
      (function() {
        // Check if CKEDITOR is loaded
        if (typeof CKEDITOR === 'undefined') {
          console.error('CKEDITOR is not loaded!');
          return;
        }
        
        var id = '#{field_id}';
        var textarea = document.getElementById(id);
        if (!textarea) {
          console.warn('Textarea with id "' + id + '" not found');
          return;
        }
        
        // Destroy existing instance if it exists
        if (CKEDITOR.instances[id]) {
          CKEDITOR.instances[id].destroy();
        }

        // Wait a bit for any existing instances to fully clean up
        setTimeout(function() {
          try {
            var editor = CKEDITOR.replace(textarea, #{RedmineCkeditor.options(@project).to_json});
            editor.on("change", function() { textarea.value = editor.getSnapshot(); });
            console.log('CKEditor initialized for: ' + id);
          } catch(e) {
            console.error('Error initializing CKEditor:', e);
          }
        }, 100);
      })();
      EOT
    end

    def overwrite_functions
      javascript_tag <<-EOT
        function showAndScrollTo(id, focus) {
          var elem = $("#" + id);
          elem.show();
          if (focus != null && CKEDITOR.instances.hasOwnProperty(focus)) { CKEDITOR.instances[focus].focus(); }
          $('html, body').animate({scrollTop: elem.offset().top}, 100);
        }

        function destroyEditor(id) {
          if (CKEDITOR.instances[id]) CKEDITOR.instances[id].destroy();
        }
      EOT
    end

    def initial_setup
      overwrite_functions
    end

    def wikitoolbar_for(field_id, preview_url = nil)
      if params[:format] == "js"
        javascript_tag(replace_editor_script(field_id))
      else
        # Only include initialization code, scripts are loaded in head
        replace_editor_tag(field_id)
      end
    end

    def initial_page_content(page)
      "<h1>#{ERB::Util.html_escape page.pretty_title}</h1>"
    end

    def heads_for_wiki_formatter
      # Always return CKEditor scripts if text formatting is CKEditor
      if Setting.text_formatting == "CKEditor"
        root = RedmineCkeditor.assets_root
        output = javascript_tag("CKEDITOR_BASEPATH = '#{root}/ckeditor/';")
        output += "<script src='#{root}/javascripts/application.js'></script>".html_safe
        output += javascript_tag(RedmineCkeditor.plugins.map {|name|
          path = "#{root}/ckeditor-contrib/plugins/#{name}/"
          "CKEDITOR.plugins.addExternal('#{name}', '#{path}/');"
        }.join("\n"))
        output += stylesheet_link_tag('editor', :plugin => 'redmine_ckeditor')
        output
      else
        "".html_safe
      end
    end
  end
end
