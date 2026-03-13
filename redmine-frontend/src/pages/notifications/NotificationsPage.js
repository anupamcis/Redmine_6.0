import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Trash2, 
  CheckCheck,
  ExternalLink,
  Mail
} from 'lucide-react';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../../store/notificationSlice';

export default function NotificationsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { notifications, unreadCount, loading } = useSelector(state => state.notifications);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'

  useEffect(() => {
    dispatch(fetchNotifications());
    dispatch(fetchUnreadCount());
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      dispatch(fetchUnreadCount());
    }, 30000);
    
    return () => clearInterval(interval);
  }, [dispatch]);

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'read') return notification.read;
    return true;
  });

  const handleMarkAsRead = async (notificationId, e) => {
    e.stopPropagation();
    dispatch(markAsRead(notificationId));
  };

  const handleDelete = async (notificationId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this notification?')) {
      dispatch(deleteNotification(notificationId));
    }
  };

  const handleMarkAllAsRead = () => {
    dispatch(markAllAsRead());
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      dispatch(markAsRead(notification.id));
    }
    
    // Navigate to project if project_id is available
    if (notification.project_id) {
      navigate(`/projects/${notification.project_identifier || notification.project_id}`);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'inactivity_1_day':
      case 'inactivity_2_days':
        return <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      case 'inactivity_1_week':
      case 'inactivity_15_days':
        return <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />;
      case 'inactivity_1_month':
      case 'inactivity_1_year':
      case 'inactivity_no_activity':
        return <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      default:
        return <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'inactivity_1_day':
      case 'inactivity_2_days':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10';
      case 'inactivity_1_week':
      case 'inactivity_15_days':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/10';
      case 'inactivity_1_month':
      case 'inactivity_1_year':
      case 'inactivity_no_activity':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/10';
      default:
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--theme-bg)' }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--theme-text)] mb-2 flex items-center gap-3">
              <Bell className="w-8 h-8 text-[var(--theme-primary)]" />
              Notifications
            </h1>
            <p className="text-sm text-[var(--theme-textSecondary)]">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white hover:opacity-90 transition-opacity"
            >
              <CheckCheck size={18} />
              Mark all as read
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-[var(--theme-primary)] text-white'
                : 'bg-[var(--theme-surface)] text-[var(--theme-text)] hover:bg-[var(--theme-border)]'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'unread'
                ? 'bg-[var(--theme-primary)] text-white'
                : 'bg-[var(--theme-surface)] text-[var(--theme-text)] hover:bg-[var(--theme-border)]'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'read'
                ? 'bg-[var(--theme-primary)] text-white'
                : 'bg-[var(--theme-surface)] text-[var(--theme-text)] hover:bg-[var(--theme-border)]'
            }`}
          >
            Read ({notifications.length - unreadCount})
          </button>
        </div>

        {/* Notifications List */}
        {loading && notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
            <p className="mt-4 text-[var(--theme-textSecondary)]">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-[var(--theme-textSecondary)] mx-auto mb-4 opacity-50" />
            <p className="text-lg text-[var(--theme-textSecondary)]">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 rounded-lg border-l-4 cursor-pointer transition-all hover:shadow-md ${
                  notification.read
                    ? 'bg-[var(--theme-surface)] border-l-gray-300 opacity-75'
                    : `${getNotificationColor(notification.notification_type)} border-l-4`
                }`}
                style={{ borderColor: notification.read ? 'var(--theme-border)' : undefined }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className={`font-semibold ${notification.read ? 'text-[var(--theme-textSecondary)]' : 'text-[var(--theme-text)]'}`}>
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-[var(--theme-primary)] flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                    <p className="text-sm text-[var(--theme-textSecondary)] mb-3">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-[var(--theme-textSecondary)]">
                        <span>{formatDate(notification.created_at)}</span>
                        {notification.project_name && (
                          <span className="flex items-center gap-1">
                            <ExternalLink size={12} />
                            {notification.project_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <button
                            onClick={(e) => handleMarkAsRead(notification.id, e)}
                            className="p-1.5 rounded hover:bg-[var(--theme-surface)] transition-colors"
                            title="Mark as read"
                          >
                            <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(notification.id, e)}
                          className="p-1.5 rounded hover:bg-[var(--theme-surface)] transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} className="text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

