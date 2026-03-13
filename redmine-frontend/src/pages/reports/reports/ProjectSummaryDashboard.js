import React, { useEffect, useState, useMemo } from 'react';
import { getIssues, getIssueStatuses, getIssuePriorities } from '../../../api/redmineTasksAdapter';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CheckCircle2, Clock, AlertCircle, TrendingUp, AlertTriangle, Calendar, Download, FileText, Image, FileSpreadsheet } from 'lucide-react';
import { exportToCSV, exportToPDF, exportToExcel, exportToPNG } from '../../../utils/reportExports';
import { cachedApiCall } from '../../../utils/apiCache';

const COLORS = {
  completed: '#43A047',
  inProgress: '#1E88E5',
  pending: '#FFA726',
  critical: '#E53935',
  high: '#FF8C00',
  medium: '#1E88E5',
  low: '#43A047'
};

export default function ProjectSummaryDashboard({ projectName }) {
  const [issues, setIssues] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateRange: 'all',
    tracker: '',
    priority: '',
    assignee: '',
    status: ''
  });

  // OPTIMIZED: Load data with caching and parallel execution
  useEffect(() => {
    if (!projectName) return;
    const loadData = async () => {
      setLoading(true);
      try {
        // OPTIMIZED: Use cached API calls for metadata - instant on repeat visits
        const [statusesData, prioritiesData] = await Promise.all([
          cachedApiCall('reports_statuses', async () => {
            return await getIssueStatuses();
          }),
          cachedApiCall('reports_priorities', async () => {
            return await getIssuePriorities();
          })
        ]);

        // OPTIMIZED: Fetch ALL issues with caching
        const cacheKey = `reports_issues_${projectName}`;
        const firstPage = await cachedApiCall(cacheKey, async () => {
          return await getIssues(projectName, { limit: 100, offset: 0, status_id: '*' });
        });

        let allIssues = firstPage.issues || [];
        let totalCount = firstPage.total_count || allIssues.length;
        let offset = allIssues.length;
        const limit = 100;

        // Paginate through remaining issues if any (not cached - only first page is cached)
        while (offset < totalCount) {
          const nextPage = await getIssues(projectName, {
            limit,
            offset,
            status_id: '*'
          });
          const batch = nextPage.issues || [];
          if (batch.length === 0) break;
          allIssues = allIssues.concat(batch);
          offset += batch.length;
        }

        setIssues(allIssues);
        setStatuses(statusesData || []);
        setPriorities(prioritiesData || []);
      } catch (error) {
        console.error('[Reports] Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [projectName]);

  const filteredIssues = useMemo(() => {
    let filtered = [...issues];
    
    if (filters.status) {
      filtered = filtered.filter(issue => String(issue.status?.id) === filters.status);
    }
    if (filters.tracker) {
      filtered = filtered.filter(issue => String(issue.tracker?.id) === filters.tracker);
    }
    if (filters.priority) {
      filtered = filtered.filter(issue => String(issue.priority?.id) === filters.priority);
    }
    if (filters.assignee) {
      filtered = filtered.filter(issue => String(issue.assigned_to?.id) === filters.assignee);
    }
    
    return filtered;
  }, [issues, filters]);

  const statusData = useMemo(() => {
    const completed = filteredIssues.filter(i => i.status?.name === 'Closed' || i.status?.name === 'Resolved').length;
    const inProgress = filteredIssues.filter(i => {
      const statusName = i.status?.name?.toLowerCase() || '';
      return statusName.includes('progress') || statusName.includes('in progress') || statusName === 'in progress';
    }).length;
    const pending = filteredIssues.filter(i => {
      const statusName = i.status?.name?.toLowerCase() || '';
      return statusName === 'new' || statusName === 'pending' || (!statusName.includes('progress') && statusName !== 'closed' && statusName !== 'resolved');
    }).length;
    
    return [
      { name: 'Completed', value: completed, color: COLORS.completed },
      { name: 'In Progress', value: inProgress, color: COLORS.inProgress },
      { name: 'Pending', value: pending, color: COLORS.pending }
    ];
  }, [filteredIssues]);

  const priorityData = useMemo(() => {
    const priorityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
    
    filteredIssues.forEach(issue => {
      const priorityName = (issue.priority?.name || 'Normal').toLowerCase();
      if (priorityName.includes('critical') || priorityName.includes('immediate')) {
        priorityCounts.critical++;
      } else if (priorityName.includes('urgent') || priorityName.includes('high')) {
        priorityCounts.high++;
      } else if (priorityName.includes('medium') || priorityName.includes('normal')) {
        priorityCounts.medium++;
      } else {
        priorityCounts.low++;
      }
    });
    
    return [
      { name: 'Critical', value: priorityCounts.critical, color: COLORS.critical },
      { name: 'High', value: priorityCounts.high, color: COLORS.high },
      { name: 'Medium', value: priorityCounts.medium, color: COLORS.medium },
      { name: 'Low', value: priorityCounts.low, color: COLORS.low }
    ];
  }, [filteredIssues]);

  const kpis = useMemo(() => {
    const total = filteredIssues.length;
    const completed = filteredIssues.filter(i => i.status?.name === 'Closed' || i.status?.name === 'Resolved').length;
    const completion = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = filteredIssues.filter(issue => {
      if (!issue.due_date) return false;
      const dueDate = new Date(issue.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const isCompleted = issue.status?.name === 'Closed' || issue.status?.name === 'Resolved';
      return dueDate < today && !isCompleted;
    }).length;
    
    const upcoming = filteredIssues.filter(issue => {
      if (!issue.due_date) return false;
      const dueDate = new Date(issue.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      const isCompleted = issue.status?.name === 'Closed' || issue.status?.name === 'Resolved';
      return daysDiff >= 0 && daysDiff <= 7 && !isCompleted;
    }).length;
    
    return {
      completion,
      total,
      overdue,
      upcoming
    };
  }, [filteredIssues]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[var(--theme-textSecondary)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Project Summary Dashboard</h1>
          <p className="text-sm text-[var(--theme-textSecondary)] mt-1">
            High-level health check for {projectName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative group">
            <button className="px-4 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-cardBg)] text-sm hover:bg-[var(--theme-surface)] flex items-center gap-2">
              <Download size={16} />
              Export
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={() => exportToPDF('Project Summary', { kpis, statusData, priorityData })}
                className="w-full text-left px-4 py-2 hover:bg-[var(--theme-surface)] flex items-center gap-2 text-sm"
              >
                <FileText size={16} />
                Export as PDF
              </button>
              <button
                onClick={() => exportToExcel('Project Summary', filteredIssues)}
                className="w-full text-left px-4 py-2 hover:bg-[var(--theme-surface)] flex items-center gap-2 text-sm"
              >
                <FileSpreadsheet size={16} />
                Export as Excel
              </button>
              <button
                onClick={() => exportToPNG('project-summary-charts', 'project-summary')}
                className="w-full text-left px-4 py-2 hover:bg-[var(--theme-surface)] flex items-center gap-2 text-sm"
              >
                <Image size={16} />
                Export as PNG
              </button>
              <button
                onClick={() => exportToCSV(filteredIssues.map(i => ({
                  'Task ID': i.id,
                  'Subject': i.subject,
                  'Status': i.status?.name || '',
                  'Priority': i.priority?.name || '',
                  'Tracker': i.tracker?.name || '',
                  'Assignee': i.assigned_to?.name || 'Unassigned'
                })), 'project-summary')}
                className="w-full text-left px-4 py-2 hover:bg-[var(--theme-surface)] flex items-center gap-2 text-sm"
              >
                <FileText size={16} />
                Export as CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-[var(--theme-textSecondary)] mb-1 block">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] text-sm"
            >
              <option value="">All Statuses</option>
              {statuses.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--theme-textSecondary)] mb-1 block">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] text-sm"
            >
              <option value="">All Priorities</option>
              {priorities.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--theme-textSecondary)] mb-1 block">Date Range</label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] text-sm"
            >
              <option value="all">All Time</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--theme-textSecondary)] mb-1 block">Assignee</label>
            <select
              value={filters.assignee}
              onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] text-sm"
            >
              <option value="">All Assignees</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--theme-textSecondary)]">% Completion</span>
            <TrendingUp size={20} className="text-[var(--theme-primary)]" />
          </div>
          <div className="text-3xl font-bold">{kpis.completion}%</div>
          <div className="mt-2 h-2 bg-[var(--theme-surface)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--theme-primary)] transition-all duration-500"
              style={{ width: `${kpis.completion}%` }}
            />
          </div>
        </div>
        
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--theme-textSecondary)]">Total Tasks</span>
            <CheckCircle2 size={20} className="text-[var(--theme-primary)]" />
          </div>
          <div className="text-3xl font-bold">{kpis.total}</div>
        </div>
        
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--theme-textSecondary)]">Overdue Tasks</span>
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <div className="text-3xl font-bold text-red-500">{kpis.overdue}</div>
        </div>
        
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--theme-textSecondary)]">Upcoming Tasks</span>
            <Calendar size={20} className="text-orange-500" />
          </div>
          <div className="text-3xl font-bold text-orange-500">{kpis.upcoming}</div>
        </div>
      </div>

      {/* Charts */}
      <div id="project-summary-charts" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Tasks by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Tasks by Priority</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border)" />
              <XAxis dataKey="name" stroke="var(--theme-textSecondary)" />
              <YAxis stroke="var(--theme-textSecondary)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--theme-cardBg)', 
                  border: '1px solid var(--theme-border)',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="value" fill="var(--theme-primary)">
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

