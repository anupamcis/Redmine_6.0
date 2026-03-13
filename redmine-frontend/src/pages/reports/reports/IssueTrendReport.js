import React, { useEffect, useState, useMemo } from 'react';
import { getIssues, getIssueStatuses } from '../../../api/redmineTasksAdapter';
import { cachedApiCall } from '../../../utils/apiCache';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, Download, TrendingUp, TrendingDown } from 'lucide-react';

const SEVERITY_COLORS = {
  critical: '#8B0000',
  high: '#E53935',
  medium: '#FF8C00',
  low: '#1E88E5',
  info: '#43A047'
};

export default function IssueTrendReport({ projectName }) {
  const [issues, setIssues] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateRange: 'month',
    tracker: '',
    priority: '',
    assignee: '',
    status: ''
  });

  useEffect(() => {
    if (!projectName) return;
    const loadData = async () => {
      setLoading(true);
      try {
        // Load all data in parallel with caching
        const [issuesData, statusesData] = await Promise.all([
          cachedApiCall(`issue_trend_issues_${projectName}`, async () => {
            return await getIssues(projectName, { limit: 500 });
          }),
          cachedApiCall('issue_trend_statuses', async () => {
            return await getIssueStatuses();
          })
        ]);
        setIssues(issuesData.issues || []);
        setStatuses(statusesData || []);
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
    
    return filtered;
  }, [issues, filters]);

  // Time series data: Open vs Closed issues over time
  const timeSeriesData = useMemo(() => {
    const dataMap = new Map();
    const today = new Date();
    const daysBack = filters.dateRange === 'week' ? 7 : filters.dateRange === 'month' ? 30 : 90;
    
    // Initialize dates
    for (let i = daysBack; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dataMap.set(dateKey, { date: dateKey, open: 0, closed: 0 });
    }
    
    // Process issues
    filteredIssues.forEach(issue => {
      const createdDate = issue.created_on ? new Date(issue.created_on).toISOString().split('T')[0] : null;
      const closedDate = (issue.status?.name === 'Closed' || issue.status?.name === 'Resolved') && issue.updated_on
        ? new Date(issue.updated_on).toISOString().split('T')[0]
        : null;
      
      // Count open issues (created but not closed, or closed after the date range)
      if (createdDate && dataMap.has(createdDate)) {
        dataMap.get(createdDate).open++;
      }
      
      // Count closed issues
      if (closedDate && dataMap.has(closedDate)) {
        dataMap.get(closedDate).closed++;
      }
    });
    
    return Array.from(dataMap.values()).map(item => ({
      ...item,
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));
  }, [filteredIssues, filters.dateRange]);

  // Severity breakdown
  const severityData = useMemo(() => {
    const severityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    };
    
    filteredIssues.forEach(issue => {
      const priorityName = (issue.priority?.name || 'Normal').toLowerCase();
      if (priorityName.includes('critical') || priorityName.includes('immediate')) {
        severityCounts.critical++;
      } else if (priorityName.includes('urgent') || priorityName.includes('high')) {
        severityCounts.high++;
      } else if (priorityName.includes('medium') || priorityName.includes('normal')) {
        severityCounts.medium++;
      } else if (priorityName.includes('low')) {
        severityCounts.low++;
      } else {
        severityCounts.info++;
      }
    });
    
    return [
      { name: 'Critical', value: severityCounts.critical, color: SEVERITY_COLORS.critical },
      { name: 'High', value: severityCounts.high, color: SEVERITY_COLORS.high },
      { name: 'Medium', value: severityCounts.medium, color: SEVERITY_COLORS.medium },
      { name: 'Low', value: severityCounts.low, color: SEVERITY_COLORS.low },
      { name: 'Info', value: severityCounts.info, color: SEVERITY_COLORS.info }
    ].filter(item => item.value > 0);
  }, [filteredIssues]);

  // Aging analysis
  const agingData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const aging = {
      '0-7 days': 0,
      '8-14 days': 0,
      '15-30 days': 0,
      '30+ days': 0
    };
    
    filteredIssues.forEach(issue => {
      const isClosed = issue.status?.name === 'Closed' || issue.status?.name === 'Resolved';
      if (isClosed) return;
      
      const createdDate = issue.created_on ? new Date(issue.created_on) : null;
      if (!createdDate) return;
      
      createdDate.setHours(0, 0, 0, 0);
      const daysOld = Math.ceil((today - createdDate) / (1000 * 60 * 60 * 24));
      
      if (daysOld <= 7) {
        aging['0-7 days']++;
      } else if (daysOld <= 14) {
        aging['8-14 days']++;
      } else if (daysOld <= 30) {
        aging['15-30 days']++;
      } else {
        aging['30+ days']++;
      }
    });
    
    return Object.entries(aging).map(([range, count]) => ({
      range,
      count,
      color: range === '30+ days' ? '#E53935' : range === '15-30 days' ? '#FF8C00' : range === '8-14 days' ? '#FFA726' : '#43A047'
    }));
  }, [filteredIssues]);

  // Calculate trends
  const trends = useMemo(() => {
    const total = filteredIssues.length;
    const open = filteredIssues.filter(i => 
      i.status?.name !== 'Closed' && i.status?.name !== 'Resolved'
    ).length;
    const closed = filteredIssues.filter(i => 
      i.status?.name === 'Closed' || i.status?.name === 'Resolved'
    ).length;
    const resolutionRate = total > 0 ? Math.round((closed / total) * 100) : 0;
    
    return { total, open, closed, resolutionRate };
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
          <h1 className="text-2xl font-bold">Issue/Bug Trend Analysis</h1>
          <p className="text-sm text-[var(--theme-textSecondary)] mt-1">
            Track project health and stability for {projectName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-cardBg)] text-sm hover:bg-[var(--theme-surface)]">
            <Download size={16} className="inline mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-[var(--theme-textSecondary)] mb-1 block">Date Range</label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] text-sm"
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4">
          <div className="text-sm text-[var(--theme-textSecondary)] mb-1">Total Issues</div>
          <div className="text-2xl font-bold">{trends.total}</div>
        </div>
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4">
          <div className="text-sm text-[var(--theme-textSecondary)] mb-1">Open Issues</div>
          <div className="text-2xl font-bold text-orange-500">{trends.open}</div>
        </div>
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4">
          <div className="text-sm text-[var(--theme-textSecondary)] mb-1">Closed Issues</div>
          <div className="text-2xl font-bold text-green-500">{trends.closed}</div>
        </div>
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4">
          <div className="text-sm text-[var(--theme-textSecondary)] mb-1">Resolution Rate</div>
          <div className="text-2xl font-bold">{trends.resolutionRate}%</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart: Open vs Closed over time */}
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Open vs Closed Issues Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border)" />
              <XAxis dataKey="date" stroke="var(--theme-textSecondary)" />
              <YAxis stroke="var(--theme-textSecondary)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--theme-cardBg)', 
                  border: '1px solid var(--theme-border)',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="open" stroke="#FF8C00" strokeWidth={2} name="Open" />
              <Line type="monotone" dataKey="closed" stroke="#43A047" strokeWidth={2} name="Closed" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart: Severity Breakdown */}
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Issue Severity Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={severityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Aging Chart */}
      <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Issue Aging Analysis</h3>
        <p className="text-sm text-[var(--theme-textSecondary)] mb-4">
          Issues pending for different time periods
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={agingData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border)" />
            <XAxis dataKey="range" stroke="var(--theme-textSecondary)" />
            <YAxis stroke="var(--theme-textSecondary)" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'var(--theme-cardBg)', 
                border: '1px solid var(--theme-border)',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="count">
              {agingData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
