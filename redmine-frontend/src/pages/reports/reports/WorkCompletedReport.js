import React, { useEffect, useState, useMemo } from 'react';
import { getIssues } from '../../../api/redmineTasksAdapter';
import { cachedApiCall } from '../../../utils/apiCache';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { CheckCircle2, Download, Calendar } from 'lucide-react';

export default function WorkCompletedReport({ projectName }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('weekly'); // 'weekly' or 'monthly'
  const [filters, setFilters] = useState({
    tracker: '',
    priority: '',
    assignee: ''
  });

  useEffect(() => {
    if (!projectName) return;
    const loadData = async () => {
      setLoading(true);
      try {
        // Load data with caching
        const issuesData = await cachedApiCall(`work_completed_issues_${projectName}`, async () => {
          return await getIssues(projectName, { limit: 500 });
        });
        setIssues(issuesData.issues || []);
      } catch (error) {
        console.error('[Reports] Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [projectName]);

  const completedIssues = useMemo(() => {
    return issues.filter(issue => 
      issue.status?.name === 'Closed' || issue.status?.name === 'Resolved'
    );
  }, [issues]);

  // Weekly/Monthly completion data
  const completionData = useMemo(() => {
    const dataMap = new Map();
    const today = new Date();
    const periods = viewMode === 'weekly' ? 12 : 6; // 12 weeks or 6 months
    
    // Initialize periods
    for (let i = periods - 1; i >= 0; i--) {
      const date = new Date(today);
      if (viewMode === 'weekly') {
        date.setDate(date.getDate() - (i * 7));
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
        const periodKey = weekStart.toISOString().split('T')[0];
        const periodLabel = `Week ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        dataMap.set(periodKey, { period: periodLabel, completed: 0, features: 0, bugs: 0, support: 0 });
      } else {
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const periodKey = monthStart.toISOString().split('T')[0];
        const periodLabel = monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        dataMap.set(periodKey, { period: periodLabel, completed: 0, features: 0, bugs: 0, support: 0 });
      }
    }
    
    // Process completed issues
    completedIssues.forEach(issue => {
      const closedDate = issue.updated_on ? new Date(issue.updated_on) : null;
      if (!closedDate) return;
      
      let periodKey = null;
      let periodLabel = null;
      
      if (viewMode === 'weekly') {
        const weekStart = new Date(closedDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        periodKey = weekStart.toISOString().split('T')[0];
        periodLabel = `Week ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      } else {
        const monthStart = new Date(closedDate.getFullYear(), closedDate.getMonth(), 1);
        periodKey = monthStart.toISOString().split('T')[0];
        periodLabel = monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
      
      if (dataMap.has(periodKey)) {
        const data = dataMap.get(periodKey);
        data.completed++;
        
        const trackerName = (issue.tracker?.name || '').toLowerCase();
        if (trackerName.includes('bug')) {
          data.bugs++;
        } else if (trackerName.includes('feature')) {
          data.features++;
        } else if (trackerName.includes('support')) {
          data.support++;
        }
      }
    });
    
    return Array.from(dataMap.values());
  }, [completedIssues, viewMode]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const categories = {
      'Feature': 0,
      'Bug': 0,
      'Support': 0,
      'Task': 0,
      'Other': 0
    };
    
    completedIssues.forEach(issue => {
      const trackerName = issue.tracker?.name || 'Other';
      if (categories.hasOwnProperty(trackerName)) {
        categories[trackerName]++;
      } else {
        categories['Other']++;
      }
    });
    
    return Object.entries(categories)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({ name, value }));
  }, [completedIssues]);

  // Total statistics
  const stats = useMemo(() => {
    const total = completedIssues.length;
    const thisWeek = completionData.slice(-1)[0]?.completed || 0;
    const lastWeek = completionData.slice(-2, -1)[0]?.completed || 0;
    const trend = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek * 100).toFixed(1) : 0;
    
    return { total, thisWeek, lastWeek, trend };
  }, [completedIssues, completionData]);

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
          <h1 className="text-2xl font-bold">Work Completed (Weekly/Monthly)</h1>
          <p className="text-sm text-[var(--theme-textSecondary)] mt-1">
            History of delivered work for {projectName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-cardBg)] text-sm hover:bg-[var(--theme-surface)]">
            <Download size={16} className="inline mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">View Mode:</label>
          <button
            onClick={() => setViewMode('weekly')}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              viewMode === 'weekly'
                ? 'bg-[var(--theme-primary)] text-white'
                : 'bg-[var(--theme-surface)] text-[var(--theme-text)] hover:bg-[var(--theme-surface2)]'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              viewMode === 'monthly'
                ? 'bg-[var(--theme-primary)] text-white'
                : 'bg-[var(--theme-surface)] text-[var(--theme-text)] hover:bg-[var(--theme-surface2)]'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4">
          <div className="text-sm text-[var(--theme-textSecondary)] mb-1">Total Completed</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4">
          <div className="text-sm text-[var(--theme-textSecondary)] mb-1">
            This {viewMode === 'weekly' ? 'Week' : 'Month'}
          </div>
          <div className="text-2xl font-bold text-green-500">{stats.thisWeek}</div>
        </div>
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4">
          <div className="text-sm text-[var(--theme-textSecondary)] mb-1">
            Last {viewMode === 'weekly' ? 'Week' : 'Month'}
          </div>
          <div className="text-2xl font-bold">{stats.lastWeek}</div>
        </div>
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4">
          <div className="text-sm text-[var(--theme-textSecondary)] mb-1">Trend</div>
          <div className={`text-2xl font-bold ${stats.trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {stats.trend >= 0 ? '+' : ''}{stats.trend}%
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart: Completed tasks per period */}
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            Completed Tasks per {viewMode === 'weekly' ? 'Week' : 'Month'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={completionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border)" />
              <XAxis dataKey="period" stroke="var(--theme-textSecondary)" angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="var(--theme-textSecondary)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--theme-cardBg)', 
                  border: '1px solid var(--theme-border)',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="completed" fill="var(--theme-primary)" name="Total Completed" />
              <Bar dataKey="features" fill="#43A047" name="Features" />
              <Bar dataKey="bugs" fill="#E53935" name="Bugs" />
              <Bar dataKey="support" fill="#1E88E5" name="Support" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line Chart: Progress timeline */}
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Completion Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={completionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border)" />
              <XAxis dataKey="period" stroke="var(--theme-textSecondary)" angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="var(--theme-textSecondary)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--theme-cardBg)', 
                  border: '1px solid var(--theme-border)',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="completed" stroke="var(--theme-primary)" strokeWidth={2} name="Completed" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Completed Work by Category</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={categoryData}>
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
            <Bar dataKey="value" fill="var(--theme-primary)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
