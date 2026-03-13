import React, { useEffect, useState, useMemo } from 'react';
import { getIssues, getProjectMembers } from '../../../api/redmineTasksAdapter';
import { cachedApiCall } from '../../../utils/apiCache';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Clock, Download, TrendingUp, TrendingDown } from 'lucide-react';

export default function TimeEffortReport({ projectName }) {
  const [issues, setIssues] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateRange: 'month',
    tracker: '',
    priority: '',
    assignee: ''
  });

  useEffect(() => {
    if (!projectName) return;
    const loadData = async () => {
      setLoading(true);
      try {
        // Load all data in parallel with caching
        const [issuesData, membersData] = await Promise.all([
          cachedApiCall(`time_effort_issues_${projectName}`, async () => {
            return await getIssues(projectName, { limit: 500 });
          }),
          cachedApiCall(`time_effort_members_${projectName}`, async () => {
            return await getProjectMembers(projectName);
          })
        ]);
        setIssues(issuesData.issues || []);
        setMembers(membersData || []);
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

  // Estimated vs Actual hours per task
  const estimatedVsActualData = useMemo(() => {
    return filteredIssues
      .filter(issue => issue.estimated_hours || issue.spent_hours)
      .map(issue => ({
        name: issue.subject.length > 20 ? issue.subject.substring(0, 20) + '...' : issue.subject,
        estimated: issue.estimated_hours || 0,
        actual: issue.spent_hours || 0,
        variance: (issue.spent_hours || 0) - (issue.estimated_hours || 0)
      }))
      .slice(0, 20) // Limit to top 20 for readability
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
  }, [filteredIssues]);

  // Hours by user
  const hoursByUserData = useMemo(() => {
    const userHours = new Map();
    
    members.forEach(member => {
      userHours.set(member.id, {
        name: member.name,
        estimated: 0,
        actual: 0
      });
    });
    
    filteredIssues.forEach(issue => {
      const assigneeId = issue.assigned_to?.id || 'unassigned';
      if (!userHours.has(assigneeId)) {
        userHours.set(assigneeId, {
          name: issue.assigned_to?.name || 'Unassigned',
          estimated: 0,
          actual: 0
        });
      }
      
      const user = userHours.get(assigneeId);
      user.estimated += issue.estimated_hours || 0;
      user.actual += issue.spent_hours || 0;
    });
    
    return Array.from(userHours.values())
      .filter(user => user.estimated > 0 || user.actual > 0)
      .map(user => ({
        ...user,
        variance: user.actual - user.estimated,
        variancePercent: user.estimated > 0 
          ? ((user.actual - user.estimated) / user.estimated * 100).toFixed(1)
          : 0
      }));
  }, [filteredIssues, members]);

  // Hours by activity type (tracker)
  const hoursByActivityData = useMemo(() => {
    const activityHours = new Map();
    
    filteredIssues.forEach(issue => {
      const activity = issue.tracker?.name || 'Other';
      if (!activityHours.has(activity)) {
        activityHours.set(activity, {
          name: activity,
          estimated: 0,
          actual: 0
        });
      }
      
      const activityData = activityHours.get(activity);
      activityData.estimated += issue.estimated_hours || 0;
      activityData.actual += issue.spent_hours || 0;
    });
    
    return Array.from(activityHours.values())
      .filter(activity => activity.estimated > 0 || activity.actual > 0);
  }, [filteredIssues]);

  // Effort trend over time
  const effortTrendData = useMemo(() => {
    const trendMap = new Map();
    const today = new Date();
    const daysBack = filters.dateRange === 'week' ? 7 : filters.dateRange === 'month' ? 30 : 90;
    
    // Initialize dates
    for (let i = daysBack; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      trendMap.set(dateKey, { 
        date: dateKey, 
        estimated: 0, 
        actual: 0 
      });
    }
    
    // Process issues by their updated date
    filteredIssues.forEach(issue => {
      if (issue.updated_on) {
        const updateDate = new Date(issue.updated_on).toISOString().split('T')[0];
        if (trendMap.has(updateDate)) {
          const trend = trendMap.get(updateDate);
          trend.estimated += issue.estimated_hours || 0;
          trend.actual += issue.spent_hours || 0;
        }
      }
    });
    
    return Array.from(trendMap.values()).map(item => ({
      ...item,
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));
  }, [filteredIssues, filters.dateRange]);

  // Summary statistics
  const summary = useMemo(() => {
    const totalEstimated = filteredIssues.reduce((sum, issue) => sum + (issue.estimated_hours || 0), 0);
    const totalActual = filteredIssues.reduce((sum, issue) => sum + (issue.spent_hours || 0), 0);
    const variance = totalActual - totalEstimated;
    const variancePercent = totalEstimated > 0 ? ((variance / totalEstimated) * 100).toFixed(1) : 0;
    const efficiency = totalEstimated > 0 ? ((totalEstimated / totalActual) * 100).toFixed(1) : 0;
    
    return {
      totalEstimated,
      totalActual,
      variance,
      variancePercent,
      efficiency
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
          <h1 className="text-2xl font-bold">Time & Effort Tracking (Est vs Actual)</h1>
          <p className="text-sm text-[var(--theme-textSecondary)] mt-1">
            Estimated vs actual work analysis for {projectName}
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
            <label className="text-xs text-[var(--theme-textSecondary)] mb-1 block">Assignee</label>
            <select
              value={filters.assignee}
              onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] text-sm"
            >
              <option value="">All Assignees</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4">
          <div className="text-sm text-[var(--theme-textSecondary)] mb-1">Total Estimated Hours</div>
          <div className="text-2xl font-bold">{summary.totalEstimated.toFixed(1)}h</div>
        </div>
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4">
          <div className="text-sm text-[var(--theme-textSecondary)] mb-1">Total Actual Hours</div>
          <div className="text-2xl font-bold">{summary.totalActual.toFixed(1)}h</div>
        </div>
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4">
          <div className="text-sm text-[var(--theme-textSecondary)] mb-1">Variance</div>
          <div className={`text-2xl font-bold ${summary.variance >= 0 ? 'text-red-500' : 'text-green-500'}`}>
            {summary.variance >= 0 ? '+' : ''}{summary.variance.toFixed(1)}h
          </div>
          <div className="text-xs text-[var(--theme-textSecondary)]">
            ({summary.variancePercent >= 0 ? '+' : ''}{summary.variancePercent}%)
          </div>
        </div>
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4">
          <div className="text-sm text-[var(--theme-textSecondary)] mb-1">Efficiency</div>
          <div className="text-2xl font-bold">{summary.efficiency}%</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart: Estimated vs Actual per task */}
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Estimated vs Actual Hours per Task</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={estimatedVsActualData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border)" />
              <XAxis 
                dataKey="name" 
                stroke="var(--theme-textSecondary)" 
                angle={-45} 
                textAnchor="end" 
                height={100}
              />
              <YAxis stroke="var(--theme-textSecondary)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--theme-cardBg)', 
                  border: '1px solid var(--theme-border)',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="estimated" fill="#1E88E5" name="Estimated" />
              <Bar dataKey="actual" fill="#43A047" name="Actual" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart: Hours by user */}
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Hours by User</h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={hoursByUserData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="actual"
              >
                {hoursByUserData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 50%)`} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hours by Activity Type */}
      <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Hours by Activity Type</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={hoursByActivityData}>
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
            <Legend />
            <Bar dataKey="estimated" fill="#1E88E5" name="Estimated" />
            <Bar dataKey="actual" fill="#43A047" name="Actual" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Effort Trend */}
      <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Effort Trend Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={effortTrendData}>
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
            <Line type="monotone" dataKey="estimated" stroke="#1E88E5" strokeWidth={2} name="Estimated" />
            <Line type="monotone" dataKey="actual" stroke="#43A047" strokeWidth={2} name="Actual" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* User Breakdown Table */}
      <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Hours Breakdown by User</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--theme-border)]">
                <th className="text-left py-2 px-4">User</th>
                <th className="text-right py-2 px-4">Estimated</th>
                <th className="text-right py-2 px-4">Actual</th>
                <th className="text-right py-2 px-4">Variance</th>
                <th className="text-right py-2 px-4">Variance %</th>
              </tr>
            </thead>
            <tbody>
              {hoursByUserData.map((user, idx) => (
                <tr key={idx} className="border-b border-[var(--theme-border)] hover:bg-[var(--theme-surface)]">
                  <td className="py-2 px-4">{user.name}</td>
                  <td className="text-right py-2 px-4">{user.estimated.toFixed(1)}h</td>
                  <td className="text-right py-2 px-4">{user.actual.toFixed(1)}h</td>
                  <td className={`text-right py-2 px-4 ${user.variance >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {user.variance >= 0 ? '+' : ''}{user.variance.toFixed(1)}h
                  </td>
                  <td className={`text-right py-2 px-4 ${user.variance >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {user.variancePercent >= 0 ? '+' : ''}{user.variancePercent}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
