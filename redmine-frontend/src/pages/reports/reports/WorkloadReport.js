import React, { useEffect, useState, useMemo } from 'react';
import { getIssues, getProjectMembers } from '../../../api/redmineTasksAdapter';
import { cachedApiCall } from '../../../utils/apiCache';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Users, Download, AlertCircle } from 'lucide-react';

export default function WorkloadReport({ projectName }) {
  const [issues, setIssues] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateRange: 'all',
    tracker: '',
    priority: '',
    status: ''
  });

  useEffect(() => {
    if (!projectName) return;
    const loadData = async () => {
      setLoading(true);
      try {
        // Load all data in parallel with caching
        const [issuesData, membersData] = await Promise.all([
          cachedApiCall(`workload_issues_${projectName}`, async () => {
            return await getIssues(projectName, { limit: 500 });
          }),
          cachedApiCall(`workload_members_${projectName}`, async () => {
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

  // Calculate workload per user
  const workloadData = useMemo(() => {
    const userWorkload = new Map();
    
    // Initialize all members (only actual team members, not unassigned)
    members.forEach(member => {
      userWorkload.set(member.id, {
        id: member.id,
        name: member.name || 'Unknown',
        totalTasks: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
        estimatedHours: 0
      });
    });
    
    // Process issues
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    issues.forEach(issue => {
      const assigneeId = issue.assigned_to?.id;
      
      // Skip unassigned issues - they should not be counted as a resource
      if (!assigneeId) {
        return;
      }
      
      // Only process if this is a known member
      if (!userWorkload.has(assigneeId)) {
        // Add member if not in the list (edge case)
        userWorkload.set(assigneeId, {
          id: assigneeId,
          name: issue.assigned_to?.name || 'Unknown',
          totalTasks: 0,
          inProgress: 0,
          completed: 0,
          overdue: 0,
          estimatedHours: 0
        });
      }
      
      const workload = userWorkload.get(assigneeId);
      workload.totalTasks++;
      
      const statusName = (issue.status?.name || '').toLowerCase();
      if (statusName === 'closed' || statusName === 'resolved') {
        workload.completed++;
      } else if (statusName.includes('progress')) {
        workload.inProgress++;
      }
      
      // Check if overdue
      if (issue.due_date) {
        const dueDate = new Date(issue.due_date);
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate < today && statusName !== 'closed' && statusName !== 'resolved') {
          workload.overdue++;
        }
      }
      
      // Estimated hours (if available)
      if (issue.estimated_hours) {
        workload.estimatedHours += issue.estimated_hours;
      }
    });
    
    // Return only users with tasks (excluding those with 0 tasks)
    return Array.from(userWorkload.values())
      .filter(user => user.totalTasks > 0)
      .map(user => {
        // Calculate utilization percentage
        // Assuming 40 hours per week capacity
        const weeklyCapacity = 40;
        const utilization = (user.estimatedHours / weeklyCapacity) * 100;
        
        let utilizationStatus = 'balanced';
        if (utilization < 50) {
          utilizationStatus = 'underutilized';
        } else if (utilization > 100) {
          utilizationStatus = 'overloaded';
        } else if (utilization > 80) {
          utilizationStatus = 'high';
        }
        
        return {
          ...user,
          utilization: Math.round(utilization),
          utilizationStatus
        };
      })
      .sort((a, b) => b.totalTasks - a.totalTasks);
  }, [issues, members]);

  // Calculate unassigned tasks statistics
  const unassignedStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let totalUnassigned = 0;
    let unassignedInProgress = 0;
    let unassignedCompleted = 0;
    let unassignedOverdue = 0;
    let unassignedEstimatedHours = 0;
    
    issues.forEach(issue => {
      const assigneeId = issue.assigned_to?.id;
      
      // Only count unassigned issues
      if (!assigneeId) {
        totalUnassigned++;
        
        const statusName = (issue.status?.name || '').toLowerCase();
        if (statusName === 'closed' || statusName === 'resolved') {
          unassignedCompleted++;
        } else if (statusName.includes('progress')) {
          unassignedInProgress++;
        }
        
        // Check if overdue
        if (issue.due_date) {
          const dueDate = new Date(issue.due_date);
          dueDate.setHours(0, 0, 0, 0);
          if (dueDate < today && statusName !== 'closed' && statusName !== 'resolved') {
            unassignedOverdue++;
          }
        }
        
        // Estimated hours (if available)
        if (issue.estimated_hours) {
          unassignedEstimatedHours += issue.estimated_hours;
        }
      }
    });
    
    return {
      total: totalUnassigned,
      inProgress: unassignedInProgress,
      completed: unassignedCompleted,
      overdue: unassignedOverdue,
      estimatedHours: unassignedEstimatedHours
    };
  }, [issues]);

  // Utilization distribution (excluding unassigned)
  const utilizationData = useMemo(() => {
    const distribution = {
      underutilized: 0,
      balanced: 0,
      high: 0,
      overloaded: 0
    };
    
    // Only count actual team members, not unassigned
    workloadData.forEach(user => {
      distribution[user.utilizationStatus]++;
    });
    
    return [
      { name: 'Underutilized (<50%)', value: distribution.underutilized, color: '#43A047' },
      { name: 'Balanced (50-80%)', value: distribution.balanced, color: '#1E88E5' },
      { name: 'High (80-100%)', value: distribution.high, color: '#FFA726' },
      { name: 'Overloaded (>100%)', value: distribution.overloaded, color: '#E53935' }
    ];
  }, [workloadData]);

  const getUtilizationColor = (utilization, status) => {
    if (status === 'overloaded') return '#E53935';
    if (status === 'high') return '#FF8C00';
    if (status === 'balanced') return '#1E88E5';
    return '#43A047';
  };

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
          <h1 className="text-2xl font-bold">Resource Workload & Utilization</h1>
          <p className="text-sm text-[var(--theme-textSecondary)] mt-1">
            Workload distribution across the team for {projectName}
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
              <option value="all">All Time</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
          </div>
        </div>
      </div>

      {/* Utilization Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {utilizationData.map((item) => (
          <div key={item.name} className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--theme-textSecondary)]">{item.name}</span>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            </div>
            <div className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Unassigned Tasks Section */}
      {unassignedStats.total > 0 && (
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Unassigned Tasks</h3>
          <div className="border border-gray-500/30 bg-gray-500/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-500/10 flex items-center justify-center text-gray-500 font-semibold">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <div className="font-medium">Unassigned</div>
                  <div className="text-xs text-[var(--theme-textSecondary)]">
                    {unassignedStats.total} tasks • {unassignedStats.estimatedHours.toFixed(1)}h estimated
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-500">
                  N/A
                </div>
                <div className="text-xs text-[var(--theme-textSecondary)]">Utilization</div>
              </div>
            </div>
            
            {/* Task Breakdown */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[var(--theme-textSecondary)]">
                  {unassignedStats.inProgress} In Progress
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[var(--theme-textSecondary)]">
                  {unassignedStats.completed} Completed
                </span>
              </div>
              {unassignedStats.overdue > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-red-500">
                    {unassignedStats.overdue} Overdue
                  </span>
                </div>
              )}
            </div>
            
            {/* Alert */}
            <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded text-xs text-orange-500">
              <AlertCircle size={14} className="inline mr-1" />
              These tasks need to be assigned to team members
            </div>
          </div>
        </div>
      )}

      {/* Workload Heatmap */}
      <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Workload by Team Member</h3>
        <div className="space-y-3">
          {workloadData.length === 0 ? (
            <div className="text-center py-8 text-[var(--theme-textSecondary)]">
              No workload data available
            </div>
          ) : (
            workloadData.map((user) => {
              const color = getUtilizationColor(user.utilization, user.utilizationStatus);
              return (
                <div key={user.id} className="border border-[var(--theme-border)] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--theme-primary)]/10 flex items-center justify-center text-[var(--theme-primary)] font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-[var(--theme-textSecondary)]">
                          {user.totalTasks} tasks • {user.estimatedHours.toFixed(1)}h estimated
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold" style={{ color }}>
                        {user.utilization}%
                      </div>
                      <div className="text-xs text-[var(--theme-textSecondary)]">Utilization</div>
                    </div>
                  </div>
                  
                  {/* Utilization Bar */}
                  <div className="mb-2">
                    <div className="h-2 bg-[var(--theme-surface)] rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-500"
                        style={{ 
                          width: `${Math.min(user.utilization, 150)}%`,
                          backgroundColor: color
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Task Breakdown */}
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-[var(--theme-textSecondary)]">
                        {user.inProgress} In Progress
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-[var(--theme-textSecondary)]">
                        {user.completed} Completed
                      </span>
                    </div>
                    {user.overdue > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-red-500">
                          {user.overdue} Overdue
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Status Alert */}
                  {user.utilizationStatus === 'overloaded' && (
                    <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-500">
                      <AlertCircle size={14} className="inline mr-1" />
                      This team member is overloaded
                    </div>
                  )}
                  {user.utilizationStatus === 'underutilized' && (
                    <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-500">
                      <AlertCircle size={14} className="inline mr-1" />
                      This team member has available capacity
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart: Hours per user */}
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Estimated Hours per User</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={workloadData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border)" />
              <XAxis 
                dataKey="name" 
                stroke="var(--theme-textSecondary)"
                style={{ fill: 'var(--theme-textSecondary)' }}
                angle={-45} 
                textAnchor="end" 
                height={80}
                tick={{ fill: 'var(--theme-textSecondary)' }}
              />
              <YAxis 
                stroke="var(--theme-textSecondary)"
                style={{ fill: 'var(--theme-textSecondary)' }}
                tick={{ fill: 'var(--theme-textSecondary)' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--theme-cardBg)', 
                  border: '1px solid var(--theme-border)',
                  borderRadius: '8px',
                  color: 'var(--theme-text)'
                }}
                labelStyle={{ color: 'var(--theme-text)' }}
                itemStyle={{ color: 'var(--theme-text)' }}
              />
              <Bar dataKey="estimatedHours" name="Estimated Hours">
                {workloadData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getUtilizationColor(entry.utilization, entry.utilizationStatus)} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart: Tasks per user */}
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Tasks per User</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={workloadData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border)" />
              <XAxis 
                dataKey="name" 
                stroke="var(--theme-textSecondary)"
                style={{ fill: 'var(--theme-textSecondary)' }}
                angle={-45} 
                textAnchor="end" 
                height={80}
                tick={{ fill: 'var(--theme-textSecondary)' }}
              />
              <YAxis 
                stroke="var(--theme-textSecondary)"
                style={{ fill: 'var(--theme-textSecondary)' }}
                tick={{ fill: 'var(--theme-textSecondary)' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--theme-cardBg)', 
                  border: '1px solid var(--theme-border)',
                  borderRadius: '8px',
                  color: 'var(--theme-text)'
                }}
                labelStyle={{ color: 'var(--theme-text)' }}
                itemStyle={{ color: 'var(--theme-text)' }}
              />
              <Legend 
                wrapperStyle={{ color: 'var(--theme-text)' }}
                iconType="square"
              />
              <Bar dataKey="inProgress" stackId="a" fill="#1E88E5" name="In Progress" />
              <Bar dataKey="completed" stackId="a" fill="#43A047" name="Completed" />
              <Bar dataKey="overdue" stackId="a" fill="#E53935" name="Overdue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
