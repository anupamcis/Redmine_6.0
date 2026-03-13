import React, { useEffect, useState, useMemo } from 'react';
import { getIssues } from '../../../api/redmineTasksAdapter';
import { cachedApiCall } from '../../../utils/apiCache';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Shield, Download, AlertTriangle, XCircle, Clock } from 'lucide-react';

export default function RiskBlockerReport({ projectName }) {
  const [issues, setIssues] = useState([]);
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
        // Load data with caching
        const issuesData = await cachedApiCall(`risk_blocker_issues_${projectName}`, async () => {
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

  // Identify risks and blockers
  const risksAndBlockers = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const risks = [];
    const blockers = [];
    
    issues.forEach(issue => {
      const isClosed = issue.status?.name === 'Closed' || issue.status?.name === 'Resolved';
      if (isClosed) return;
      
      const priorityName = (issue.priority?.name || 'Normal').toLowerCase();
      const isHighPriority = priorityName.includes('critical') || 
                            priorityName.includes('urgent') || 
                            priorityName.includes('high');
      
      // Calculate delay
      let delayDays = 0;
      if (issue.due_date) {
        const dueDate = new Date(issue.due_date);
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate < today) {
          delayDays = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
        }
      }
      
      // Calculate age
      let ageDays = 0;
      if (issue.created_on) {
        const createdDate = new Date(issue.created_on);
        createdDate.setHours(0, 0, 0, 0);
        ageDays = Math.ceil((today - createdDate) / (1000 * 60 * 60 * 24));
      }
      
      // Risk calculation: Impact (priority) vs Probability (delay/age)
      const impact = isHighPriority ? 5 : priorityName.includes('medium') ? 3 : 1;
      const probability = Math.min(5, Math.max(1, Math.floor(delayDays / 7) + Math.floor(ageDays / 30)));
      
      // Blockers: High priority + Overdue
      if (isHighPriority && delayDays > 0) {
        blockers.push({
          id: issue.id,
          subject: issue.subject,
          priority: issue.priority?.name || 'Normal',
          delayDays,
          ageDays,
          assignee: issue.assigned_to?.name || 'Unassigned',
          dueDate: issue.due_date,
          impact,
          probability
        });
      }
      
      // Risks: Any overdue or old high-priority tasks
      if (delayDays > 0 || (isHighPriority && ageDays > 14)) {
        risks.push({
          id: issue.id,
          subject: issue.subject,
          priority: issue.priority?.name || 'Normal',
          delayDays,
          ageDays,
          assignee: issue.assigned_to?.name || 'Unassigned',
          dueDate: issue.due_date,
          impact,
          probability
        });
      }
    });
    
    return {
      risks: risks.sort((a, b) => (b.impact * b.probability) - (a.impact * a.probability)),
      blockers: blockers.sort((a, b) => b.delayDays - a.delayDays)
    };
  }, [issues]);

  // Risk heatmap data
  const riskHeatmapData = useMemo(() => {
    return risksAndBlockers.risks.map(risk => ({
      x: risk.probability,
      y: risk.impact,
      name: risk.subject,
      delayDays: risk.delayDays,
      priority: risk.priority
    }));
  }, [risksAndBlockers]);

  const getRiskColor = (impact, probability) => {
    const score = impact * probability;
    if (score >= 20) return '#8B0000'; // Critical
    if (score >= 12) return '#E53935'; // High
    if (score >= 6) return '#FF8C00'; // Medium
    return '#FFA726'; // Low
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
          <h1 className="text-2xl font-bold">Risk & Blocker Visualization</h1>
          <p className="text-sm text-[var(--theme-textSecondary)] mt-1">
            Highlight potential threats to {projectName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-cardBg)] text-sm hover:bg-[var(--theme-surface)]">
            <Download size={16} className="inline mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4">
          <div className="text-sm text-[var(--theme-textSecondary)] mb-1">Total Risks</div>
          <div className="text-2xl font-bold text-orange-500">{risksAndBlockers.risks.length}</div>
        </div>
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4">
          <div className="text-sm text-[var(--theme-textSecondary)] mb-1">Critical Blockers</div>
          <div className="text-2xl font-bold text-red-500">{risksAndBlockers.blockers.length}</div>
        </div>
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4">
          <div className="text-sm text-[var(--theme-textSecondary)] mb-1">High Impact Risks</div>
          <div className="text-2xl font-bold text-red-600">
            {risksAndBlockers.risks.filter(r => r.impact * r.probability >= 20).length}
          </div>
        </div>
      </div>

      {/* Risk Heatmap */}
      <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Risk Heatmap (Probability vs Impact)</h3>
        <p className="text-sm text-[var(--theme-textSecondary)] mb-4">
          Higher impact and probability = higher risk score
        </p>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border)" />
            <XAxis 
              type="number" 
              dataKey="x" 
              name="Probability" 
              domain={[0, 5]}
              label={{ value: 'Probability', position: 'insideBottom', offset: -5 }}
              stroke="var(--theme-textSecondary)"
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name="Impact" 
              domain={[0, 5]}
              label={{ value: 'Impact', angle: -90, position: 'insideLeft' }}
              stroke="var(--theme-textSecondary)"
            />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ 
                backgroundColor: 'var(--theme-cardBg)', 
                border: '1px solid var(--theme-border)',
                borderRadius: '8px'
              }}
              formatter={(value, name, props) => {
                if (name === 'x') return [`Probability: ${value}`, 'Probability'];
                if (name === 'y') return [`Impact: ${value}`, 'Impact'];
                return [value, name];
              }}
            />
            <Scatter name="Risks" data={riskHeatmapData} fill="var(--theme-primary)">
              {riskHeatmapData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getRiskColor(entry.y, entry.x)} 
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="mt-4 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-900" />
            <span className="text-[var(--theme-textSecondary)]">Critical (20+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-[var(--theme-textSecondary)]">High (12-19)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-[var(--theme-textSecondary)]">Medium (6-11)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-300" />
            <span className="text-[var(--theme-textSecondary)]">Low (1-5)</span>
          </div>
        </div>
      </div>

      {/* Critical Blockers List */}
      <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Critical Blockers</h3>
        {risksAndBlockers.blockers.length === 0 ? (
          <div className="text-center py-8 text-[var(--theme-textSecondary)]">
            No critical blockers identified
          </div>
        ) : (
          <div className="space-y-3">
            {risksAndBlockers.blockers.map((blocker) => (
              <div
                key={blocker.id}
                className="border border-red-500/30 bg-red-500/5 rounded-lg p-4 hover:bg-red-500/10 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle size={20} className="text-red-500" />
                      <h4 className="font-semibold">{blocker.subject}</h4>
                      <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-500">
                        {blocker.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[var(--theme-textSecondary)]">
                      <span>Assigned to: {blocker.assignee}</span>
                      <span>Delay: {blocker.delayDays} days</span>
                      {blocker.dueDate && (
                        <span>Due: {new Date(blocker.dueDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-500">
                      {blocker.impact * blocker.probability}
                    </div>
                    <div className="text-xs text-[var(--theme-textSecondary)]">Risk Score</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* High-Risk Items */}
      <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">High-Risk Items</h3>
        {risksAndBlockers.risks.filter(r => r.impact * r.probability >= 12).length === 0 ? (
          <div className="text-center py-8 text-[var(--theme-textSecondary)]">
            No high-risk items identified
          </div>
        ) : (
          <div className="space-y-3">
            {risksAndBlockers.risks
              .filter(r => r.impact * r.probability >= 12)
              .map((risk) => {
                const score = risk.impact * risk.probability;
                const isCritical = score >= 20;
                return (
                  <div
                    key={risk.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      isCritical
                        ? 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10'
                        : 'border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle 
                            size={20} 
                            className={isCritical ? 'text-red-500' : 'text-orange-500'} 
                          />
                          <h4 className="font-semibold">{risk.subject}</h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            isCritical
                              ? 'bg-red-500/20 text-red-500'
                              : 'bg-orange-500/20 text-orange-500'
                          }`}>
                            {risk.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-[var(--theme-textSecondary)]">
                          <span>Assigned to: {risk.assignee}</span>
                          {risk.delayDays > 0 && (
                            <span className="text-red-500">Delay: {risk.delayDays} days</span>
                          )}
                          <span>Age: {risk.ageDays} days</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${isCritical ? 'text-red-500' : 'text-orange-500'}`}>
                          {score}
                        </div>
                        <div className="text-xs text-[var(--theme-textSecondary)]">Risk Score</div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
