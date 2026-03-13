import React, { useState, useEffect } from 'react';

/**
 * CKEditor 5 React Component
 * 
 * Usage:
 * <CKEditor
 *   value={htmlContent}
 *   onChange={(data) => setContent(data)}
 *   placeholder="Enter description..."
 * />
 * 
 * Note: Make sure to install dependencies:
 * npm install --save @ckeditor/ckeditor5-react @ckeditor/ckeditor5-build-classic
 */
export default function CKEditor({ value = '', onChange, placeholder = '', disabled = false }) {
  const [editorLoaded, setEditorLoaded] = useState(false);
  const [Editor, setEditor] = useState(null);
  const [ClassicEditor, setClassicEditor] = useState(null);

  useEffect(() => {
    // Dynamically import CKEditor to avoid SSR issues and reduce initial bundle size
    Promise.all([
      import('@ckeditor/ckeditor5-react'),
      import('@ckeditor/ckeditor5-build-classic')
    ])
      .then(([CKEditorModule, ClassicEditorModule]) => {
        setEditor(() => CKEditorModule.CKEditor);
        setClassicEditor(() => ClassicEditorModule.default);
        setEditorLoaded(true);
      })
      .catch(error => {
        console.error('[CKEditor] Error loading CKEditor:', error);
        // Fallback: show a regular textarea
        setEditorLoaded(false);
      });
  }, []);

  const handleReady = (editor) => {
    // Editor is ready
    if (placeholder && editor && editor.editing && editor.editing.view && editor.editing.view.domElement) {
      editor.editing.view.domElement.setAttribute('data-placeholder', placeholder);
    }
  };

  const handleChange = (event, editor) => {
    const data = editor.getData();
    if (onChange) {
      onChange(data);
    }
  };

  // Fallback to textarea if CKEditor fails to load
  if (!editorLoaded) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows="8"
        className="w-full px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-cardBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] resize-y"
      />
    );
  }

  if (!Editor || !ClassicEditor) {
    return (
      <div className="w-full px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-cardBg)] text-[var(--theme-textSecondary)]">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="ckeditor-wrapper">
      <Editor
        editor={ClassicEditor}
        data={value}
        onReady={handleReady}
        onChange={handleChange}
        disabled={disabled}
        config={{
          placeholder: placeholder,
          toolbar: {
            items: [
              'heading', '|',
              'bold', 'italic', 'underline', 'strikethrough', '|',
              'link', 'blockQuote', 'codeBlock', '|',
              'bulletedList', 'numberedList', 'todoList', '|',
              'outdent', 'indent', '|',
              'insertTable', '|',
              'undo', 'redo'
            ],
            shouldNotGroupWhenFull: true
          },
          heading: {
            options: [
              { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
              { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
              { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
              { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' }
            ]
          },
          link: {
            decorators: {
              openInNewTab: {
                mode: 'manual',
                label: 'Open in a new tab',
                attributes: {
                  target: '_blank',
                  rel: 'noopener noreferrer'
                }
              }
            }
          }
        }}
      />
      <style>{`
        .ckeditor-wrapper {
          width: 100%;
        }
        .ckeditor-wrapper .ck-editor__editable {
          min-height: 200px;
          background: var(--theme-cardBg) !important;
          color: var(--theme-text) !important;
        }
        .ckeditor-wrapper .ck-editor__editable_inline {
          border: 1px solid var(--theme-border) !important;
          border-radius: 0 0 8px 8px !important;
        }
        .ckeditor-wrapper .ck-toolbar {
          background: var(--theme-cardBg) !important;
          border: 1px solid var(--theme-border) !important;
          border-radius: 8px 8px 0 0 !important;
        }
        .ckeditor-wrapper .ck-button {
          color: var(--theme-text) !important;
        }
        .ckeditor-wrapper .ck-button:not(.ck-disabled):hover {
          background: var(--theme-surface) !important;
        }
        .ckeditor-wrapper .ck-button__label {
          color: var(--theme-text) !important;
        }
        .ckeditor-wrapper .ck-dropdown {
          color: var(--theme-text) !important;
        }
        .ckeditor-wrapper .ck-dropdown__button {
          color: var(--theme-text) !important;
        }
        .ckeditor-wrapper .ck-dropdown__button .ck-button__label {
          color: var(--theme-text) !important;
        }
        .ckeditor-wrapper .ck-dropdown__panel {
          background: var(--theme-cardBg) !important;
          border: 1px solid var(--theme-border) !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
        }
        .ckeditor-wrapper .ck-dropdown__panel .ck-list {
          background: var(--theme-cardBg) !important;
        }
        .ckeditor-wrapper .ck-list {
          background: var(--theme-cardBg) !important;
        }
        .ckeditor-wrapper .ck-list__item {
          background: var(--theme-cardBg) !important;
          color: var(--theme-text) !important;
        }
        .ckeditor-wrapper .ck-list__item:hover,
        .ckeditor-wrapper .ck-list__item.ck-on {
          background: var(--theme-surface) !important;
          color: var(--theme-text) !important;
        }
        .ckeditor-wrapper .ck-list__item .ck-button {
          color: var(--theme-text) !important;
        }
        .ckeditor-wrapper .ck-list__item .ck-button__label {
          color: var(--theme-text) !important;
        }
        .ckeditor-wrapper .ck-list__item .ck-button:hover {
          background: var(--theme-surface) !important;
        }
        .ckeditor-wrapper .ck-list__item.ck-on .ck-button {
          background: var(--theme-primary) !important;
          color: white !important;
        }
        .ckeditor-wrapper .ck-list__item.ck-on .ck-button .ck-button__label {
          color: white !important;
        }
        .ckeditor-wrapper .ck-input {
          background: var(--theme-cardBg) !important;
          color: var(--theme-text) !important;
          border: 1px solid var(--theme-border) !important;
        }
        .ckeditor-wrapper .ck-input-text {
          background: var(--theme-cardBg) !important;
          color: var(--theme-text) !important;
        }
        .ckeditor-wrapper .ck-balloon-panel {
          background: var(--theme-cardBg) !important;
          border: 1px solid var(--theme-border) !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
        }
        .ckeditor-wrapper .ck-balloon-panel .ck-list__item {
          color: var(--theme-text) !important;
        }
        .ckeditor-wrapper .ck-balloon-panel .ck-button {
          color: var(--theme-text) !important;
        }
        .ckeditor-wrapper .ck-heading-dropdown .ck-button__label {
          color: var(--theme-text) !important;
        }
        .ckeditor-wrapper .ck-heading-dropdown .ck-dropdown__panel .ck-list__item {
          color: var(--theme-text) !important;
        }
      `}</style>
    </div>
  );
}

