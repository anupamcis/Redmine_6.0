import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getUntrackedMails } from '../../api/untrackedMailAdapter';
import { Mail, MailOpen, ChevronLeft, ChevronRight, ArrowLeft, Filter, Calendar, User, Clock } from 'lucide-react';

function UntrackedMailsPage() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const restoring = useSelector(state => state.auth.restoring);
  
  const [mails, setMails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mailType, setMailType] = useState('Unread');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('created_on');
  const [sortOrder, setSortOrder] = useState('desc');

  // Check authentication and redirect if needed
  useEffect(() => {
    if (!restoring && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [restoring, isAuthenticated, navigate]);

  // Load mails
  useEffect(() => {
    if (!projectId || !isAuthenticated || restoring) {
      return;
    }

    const loadMails = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getUntrackedMails(projectId, currentPage, mailType, sortBy, sortOrder);
        setMails(data.mails || []);
        setTotalPages(data.pages || 1);
        setTotal(data.total || 0);
      } catch (err) {
        console.error('[UntrackedMailsPage] Error loading mails:', err);
        // Do NOT force logout on API error; just show a friendly message
        setError(err.message || 'Failed to load untracked mails');
      } finally {
        setLoading(false);
      }
    };

    loadMails();
  }, [projectId, isAuthenticated, restoring, currentPage, mailType, sortBy, sortOrder, navigate]);

  const handleMailTypeChange = (e) => {
    setMailType(e.target.value);
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handleMailClick = (mail) => {
    if (mail.id) {
      navigate(`/projects/${projectId}/untracked_mails/${mail.id}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === '-') return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
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
      return dateString;
    }
  };

  if (!isAuthenticated || restoring) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[var(--theme-textSecondary)] text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header – match Daily Status Inbox style */}
      <div className="border-b border-[var(--theme-border)] px-6 py-4 bg-[var(--theme-cardBg)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/projects/${projectId}/daily_statuses`)}
              className="p-2 rounded-full hover:bg-[var(--theme-surface)] transition-colors"
              aria-label="Back to inbox"
            >
              <ArrowLeft size={18} className="text-[var(--theme-textSecondary)]" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[var(--theme-text)]">Untracked Mail</h1>
              <p className="text-sm text-[var(--theme-textSecondary)] mt-1">
                {total} {total === 1 ? 'mail' : 'mails'}
              </p>
            </div>
          </div>

          {/* Filter pill on right, similar to compact controls on Inbox header */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--theme-surface)] border border-[var(--theme-border)]">
            <Filter size={14} className="text-[var(--theme-textSecondary)]" />
            <span className="text-xs font-medium text-[var(--theme-textSecondary)]">Filter</span>
            <select
              value={mailType}
              onChange={handleMailTypeChange}
              className="px-2 py-0.5 rounded-full bg-[var(--theme-cardBg)] border border-[var(--theme-border)] text-xs text-[var(--theme-text)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
            >
              <option value="Unread">Unread</option>
              <option value="All mail">All mail</option>
            </select>
          </div>
        </div>
      </div>

      {/* List area – same structure as InboxPage */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-6">
            <div className="flex items-center gap-2 text-[var(--theme-textSecondary)] text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--theme-primary)]"></div>
              <span>Loading mails...</span>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="p-6">
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/30 text-red-400 flex items-center gap-2 text-sm">
              <Mail size={16} />
              <span>{error}</span>
            </div>
          </div>
        )}

        {!loading && !error && mails.length === 0 && (
          <div className="p-12 text-center">
            <Mail className="w-16 h-16 text-[var(--theme-textSecondary)] mx-auto mb-4" />
            <p className="text-[var(--theme-textSecondary)] text-lg">
              {mailType === 'Unread' ? 'No unread mails' : 'No mails found'}
            </p>
            <p className="text-[var(--theme-textSecondary)] text-sm mt-2">
              {mailType === 'Unread'
                ? 'All untracked mails have been read.'
                : 'No untracked mails available for this project.'}
            </p>
          </div>
        )}

        {!loading && !error && mails.length > 0 && (
          <div role="list" className="divide-y divide-[var(--theme-border)]">
            {mails.map((mail, index) => (
              <div
                key={mail.id || index}
                role="listitem"
                className="px-6 py-4 hover:bg-[var(--theme-surface)] cursor-pointer transition-colors"
                onClick={() => handleMailClick(mail)}
              >
                <div className="flex items-start gap-4">
                  <MailOpen className="w-4 h-4 text-[var(--theme-primary)] mt-1" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-[var(--theme-text)] truncate mb-1">
                      {mail.subject || 'No Subject'}
                    </h3>
                    <p className="text-sm text-[var(--theme-textSecondary)] truncate mb-1">
                      {mail.from}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-[var(--theme-textSecondary)]">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        <span>{formatDate(mail.sent_mail)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} />
                        <span>{formatDate(mail.created_on)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Simple pagination at bottom if needed */}
        {!loading && !error && totalPages > 1 && (
          <div className="px-6 py-3 flex items-center justify-between text-xs text-[var(--theme-textSecondary)] border-t border-[var(--theme-border)]">
            <div>
              Showing page <span className="font-semibold text-[var(--theme-text)]">{currentPage}</span> of{' '}
              <span className="font-semibold text-[var(--theme-text)]">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 rounded-md border border-[var(--theme-border)] bg-[var(--theme-cardBg)] text-[var(--theme-text)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--theme-surface)] transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-2 py-1 rounded-md border border-[var(--theme-border)] bg-[var(--theme-cardBg)] text-[var(--theme-text)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--theme-surface)] transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UntrackedMailsPage;
