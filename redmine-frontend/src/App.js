import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoginPage from './pages/login/LoginPage';
import AppShell from './components/appShell/AppShell';

// Lazy load heavy components for code splitting
const HomePage = lazy(() => import('./pages/home/HomePage'));
const MyProjectsPage = lazy(() => import('./pages/myProjects/MyProjectsPage'));
const ProjectDashboardPage = lazy(() => import('./pages/projectDashboard/ProjectDashboardPage'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const InboxPage = lazy(() => import('./pages/dailyStatus/InboxPage'));
const ThreadDetailPage = lazy(() => import('./pages/dailyStatus/ThreadDetailPage'));
const ComposePage = lazy(() => import('./pages/dailyStatus/ComposePage'));
const TestAuthPage = lazy(() => import('./pages/dailyStatus/TestAuthPage'));
const ProjectTasksPage = lazy(() => import('./pages/ProjectTasksPage'));
const ProjectMembersPage = lazy(() => import('./pages/members/ProjectMembersPage'));
const GanttChartPage = lazy(() => import('./pages/gantt/GanttChartPage'));
const TaskDetailPage = lazy(() => import('./pages/tasks/TaskDetailPage'));
const TaskFormPage = lazy(() => import('./pages/tasks/TaskFormPage'));
const KanbanBoardPage = lazy(() => import('./pages/tasks/KanbanBoardPage'));
const CalendarPage = lazy(() => import('./pages/calendar/CalendarPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));
const MyTasksPage = lazy(() => import('./pages/tasks/MyTasksPage'));
const UntrackedMailsPage = lazy(() => import('./pages/untrackedMail/UntrackedMailsPage'));
const UntrackedMailDetailPage = lazy(() => import('./pages/untrackedMail/UntrackedMailDetailPage'));
const ProjectDocumentsPage = lazy(() => import('./pages/dmsf/ProjectDocumentsPage'));
const ProjectSettingsPage = lazy(() => import('./pages/settings/ProjectSettingsPage'));
const ServicesPage = lazy(() => import('./pages/services/ServicesPage'));
const SearchPage = lazy(() => import('./pages/search/SearchPage'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--theme-primary)]" />
  </div>
);

function App() {
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const restoring = useSelector(state => state.auth.restoring);
  
  // Debug: Log auth state
  console.log('[App] isAuthenticated:', isAuthenticated, 'restoring:', restoring);
  
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={isAuthenticated ? (
              <AppShell>
                <MyProjectsPage />
              </AppShell>
            ) : <Navigate to="/login" replace />}
          />
        <Route
          path="/my_projects"
          element={isAuthenticated ? (
            <AppShell>
              <MyProjectsPage />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/projects/:projectName"
          element={isAuthenticated ? (
            <AppShell>
              <ProjectDashboardPage />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/profile"
          element={isAuthenticated ? (
            <AppShell>
              <ProfilePage />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/notifications"
          element={isAuthenticated ? (
            <AppShell>
              <NotificationsPage />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/tasks"
          element={isAuthenticated ? (
            <AppShell>
              <MyTasksPage />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/services"
          element={isAuthenticated ? (
            <AppShell>
              <ServicesPage />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/search"
          element={isAuthenticated ? (
            <AppShell>
              <SearchPage />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/test-auth"
          element={<TestAuthPage />}
        />
        <Route
          path="/projects/:projectId/daily_statuses"
          element={isAuthenticated ? (
            <AppShell>
              <InboxPage />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/projects/:projectId/daily_statuses/compose"
          element={isAuthenticated ? (
            <AppShell>
              <ComposePage />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/projects/:projectId/daily_statuses/:threadId"
          element={isAuthenticated ? (
            <AppShell>
              <ThreadDetailPage />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/projects/:projectId/untracked_mails"
          element={isAuthenticated ? (
            <AppShell>
              <UntrackedMailsPage />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/projects/:projectId/untracked_mails/:mailId"
          element={isAuthenticated ? (
            <AppShell>
              <UntrackedMailDetailPage />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/projects/:projectId/dmsf"
          element={isAuthenticated ? (
            <AppShell>
              <ProjectDocumentsPage />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/projects/:projectId/settings"
          element={isAuthenticated ? (
            <AppShell>
              <ProjectSettingsPage />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/projects/:projectName/tasks"
          element={isAuthenticated ? (
            <AppShell>
              <ProjectTasksPage />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/projects/:projectName/tasks/new"
          element={isAuthenticated ? (
            <AppShell>
              <TaskFormPage />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/projects/:projectName/tasks/:taskId"
          element={isAuthenticated ? (
            <AppShell>
              <TaskDetailPage />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/projects/:projectName/tasks/:taskId/edit"
          element={isAuthenticated ? (
            <AppShell>
              <TaskFormPage />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/projects/:projectName/kanban"
          element={isAuthenticated ? (
            <AppShell>
              <KanbanBoardPage />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/projects/:projectName/members"
          element={isAuthenticated ? (
            <AppShell>
              <ProjectMembersPage />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/projects/:projectName/calendar"
          element={isAuthenticated ? (
            <AppShell>
              <CalendarPage />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/projects/:projectName/gantt"
          element={isAuthenticated ? (
            <AppShell>
              <GanttChartPage />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
        <Route
          path="/projects/:projectName/reports"
          element={isAuthenticated ? (
            <AppShell>
              <ReportsPage />
            </AppShell>
          ) : <Navigate to="/login" replace />}
        />
          <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
