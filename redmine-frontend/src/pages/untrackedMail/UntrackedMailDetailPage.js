import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getUntrackedMailDetail } from '../../api/untrackedMailAdapter';
import { ArrowLeft, Mail, Paperclip, Calendar, User, Hash, MessageSquare, Clock } from 'lucide-react';

function UntrackedMailDetailPage() {
  const navigate = useNavigate();
  const { projectId, mailId } = useParams();
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const restoring = useSelector(state => state.auth.restoring);

  const [mail, setMail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!restoring && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [restoring, isAuthenticated, navigate]);

  useEffect(() => {
    if (!projectId || !mailId || !isAuthenticated || restoring) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getUntrackedMailDetail(projectId, parseInt(mailId, 10));
        setMail(data);
      } catch (err) {
        console.error('[UntrackedMailDetailPage] Error:', err);
        if (err.message && err.message.includes('Unauthorized')) {
          navigate('/login', { replace: true });
          return;
        }
        setError(err.message || 'Failed to load mail detail');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [projectId, mailId, isAuthenticated, restoring, navigate]);

  if (!isAuthenticated || restoring) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-[var(--theme-textSecondary)]">Loading...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--theme-primary)]" />
          <div className="text-[var(--theme-textSecondary)] text-sm">Loading mail...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-2 text-sm">
          <Mail size={18} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!mail) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-[var(--theme-textSecondary)] text-sm">Mail not found</div>
      </div>
    );
  }

  const formatDateTime = (value) => {
    if (!value || value === '-') return '-';
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return value;
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return value;
    }
  };

  return (
    <div className="w-full h-full flex">
      {/* Main content, aligned with ThreadDetailPage */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-[var(--theme-border)] px-6 py-4 bg-[var(--theme-cardBg)]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/projects/${projectId}/untracked_mails`)}
              className="p-2 hover:bg-[var(--theme-surface)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              aria-label="Back to untracked mails"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-[var(--theme-text)]">
                {mail.subject || 'Untracked Mail'}
              </h1>
              <p className="text-sm text-[var(--theme-textSecondary)] mt-1">
                {mail.from || '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Details Card */}
          <div className="bg-[var(--theme-surface)] rounded-lg border border-[var(--theme-border)]">
            <div className="px-4 py-3 border-b border-[var(--theme-border)]">
              <h3 className="text-sm font-semibold text-[var(--theme-text)] flex items-center gap-2">
                <Mail size={16} className="text-[var(--theme-primary)]" />
                Mail Details
              </h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {mail.from && mail.from !== '-' && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[var(--theme-primary)]/10">
                      <User size={16} className="text-[var(--theme-primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[var(--theme-textSecondary)] uppercase tracking-wider mb-1">
                        From
                      </div>
                      <div className="text-sm text-[var(--theme-text)] break-words">
                        {mail.from}
                      </div>
                    </div>
                  </div>
                )}

                {mail.to && mail.to !== '-' && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[var(--theme-primary)]/10">
                      <Mail size={16} className="text-[var(--theme-primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[var(--theme-textSecondary)] uppercase tracking-wider mb-1">
                        To
                      </div>
                      <div className="text-sm text-[var(--theme-text)] break-words">
                        {mail.to}
                      </div>
                    </div>
                  </div>
                )}

                {mail.cc && mail.cc !== '-' && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[var(--theme-primary)]/10">
                      <Mail size={16} className="text-[var(--theme-primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[var(--theme-textSecondary)] uppercase tracking-wider mb-1">
                        CC
                      </div>
                      <div className="text-sm text-[var(--theme-text)] break-words">
                        {mail.cc}
                      </div>
                    </div>
                  </div>
                )}

                {mail.reply_to && mail.reply_to !== '-' && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[var(--theme-primary)]/10">
                      <Mail size={16} className="text-[var(--theme-primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[var(--theme-textSecondary)] uppercase tracking-wider mb-1">
                        Reply To
                      </div>
                      <div className="text-sm text-[var(--theme-text)] break-words">
                        {mail.reply_to}
                      </div>
                    </div>
                  </div>
                )}

                {mail.sent_mail && mail.sent_mail !== '-' && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[var(--theme-primary)]/10">
                      <Calendar size={16} className="text-[var(--theme-primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[var(--theme-textSecondary)] uppercase tracking-wider mb-1">
                        Sent Mail
                      </div>
                      <div className="text-sm text-[var(--theme-text)]">
                        {formatDateTime(mail.sent_mail)}
                      </div>
                    </div>
                  </div>
                )}

                {mail.created_on && mail.created_on !== '-' && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[var(--theme-primary)]/10">
                      <Clock size={16} className="text-[var(--theme-primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[var(--theme-textSecondary)] uppercase tracking-wider mb-1">
                        Created On
                      </div>
                      <div className="text-sm text-[var(--theme-text)]">
                        {formatDateTime(mail.created_on)}
                      </div>
                    </div>
                  </div>
                )}

                {mail.message_id && mail.message_id !== '-' && (
                  <div className="flex items-start gap-3 md:col-span-2">
                    <div className="p-2 rounded-lg bg-[var(--theme-primary)]/10">
                      <Hash size={16} className="text-[var(--theme-primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[var(--theme-textSecondary)] uppercase tracking-wider mb-1">
                        Message ID
                      </div>
                      <div className="text-sm text-[var(--theme-text)] break-all font-mono">
                        {mail.message_id}
                      </div>
                    </div>
                  </div>
                )}

                {mail.references && mail.references !== '-' && (
                  <div className="flex items-start gap-3 md:col-span-2">
                    <div className="p-2 rounded-lg bg-[var(--theme-primary)]/10">
                      <Hash size={16} className="text-[var(--theme-primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[var(--theme-textSecondary)] uppercase tracking-wider mb-1">
                        References
                      </div>
                      <div className="text-sm text-[var(--theme-text)] break-all font-mono">
                        {mail.references}
                      </div>
                    </div>
                  </div>
                )}

                {mail.headers && mail.headers !== '-' && (
                  <div className="flex items-start gap-3 md:col-span-2">
                    <div className="p-2 rounded-lg bg-[var(--theme-primary)]/10">
                      <Hash size={16} className="text-[var(--theme-primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[var(--theme-textSecondary)] uppercase tracking-wider mb-1">
                        Headers
                      </div>
                      <div className="text-sm text-[var(--theme-text)] break-all font-mono whitespace-pre-wrap">
                        {mail.headers}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Message Card */}
          {mail.message && (
            <div className="bg-[var(--theme-cardBg)] rounded-lg border border-[var(--theme-border)] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]">
                <h3 className="text-lg font-semibold text-[var(--theme-text)] flex items-center gap-2">
                  <MessageSquare size={18} className="text-[var(--theme-primary)]" />
                  Message
                </h3>
              </div>
              <div className="p-6">
                <div
                  className="prose prose-sm max-w-none text-[var(--theme-text)] prose-headings:text-[var(--theme-text)] prose-p:text-[var(--theme-text)] prose-a:text-[var(--theme-primary)] prose-strong:text-[var(--theme-text)]"
                  dangerouslySetInnerHTML={{ __html: mail.message }}
                />
              </div>
            </div>
          )}

          {/* Attachments Card */}
          {mail.attachments && mail.attachments.length > 0 && (
            <div className="bg-[var(--theme-cardBg)] rounded-lg border border-[var(--theme-border)] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]">
                <h3 className="text-lg font-semibold text-[var(--theme-text)] flex items-center gap-2">
                  <Paperclip size={18} className="text-[var(--theme-primary)]" />
                  Attachments ({mail.attachments.length})
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-2">
                  {mail.attachments.map((attachment, index) => (
                    <a
                      key={index}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg border border-[var(--theme-border)] hover:bg-[var(--theme-surface)] hover:border-[var(--theme-primary)]/30 transition-all group"
                    >
                      <div className="p-2 rounded-lg bg-[var(--theme-primary)]/10 group-hover:bg-[var(--theme-primary)]/20 transition-colors">
                        <Paperclip size={16} className="text-[var(--theme-primary)]" />
                      </div>
                      <span className="text-sm text-[var(--theme-text)] group-hover:text-[var(--theme-primary)] transition-colors flex-1">
                        {attachment.name}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UntrackedMailDetailPage;

