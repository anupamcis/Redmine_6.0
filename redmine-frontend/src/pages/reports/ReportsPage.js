import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  Calendar,
  Shield,
  Filter,
  Download
} from 'lucide-react';
import ProjectSummaryDashboard from './reports/ProjectSummaryDashboard';
import MilestoneProgressReport from './reports/MilestoneProgressReport';
import GanttTimelineReport from './reports/GanttTimelineReport';
import WorkloadReport from './reports/WorkloadReport';
import TimeEffortReport from './reports/TimeEffortReport';
import IssueTrendReport from './reports/IssueTrendReport';
import WorkCompletedReport from './reports/WorkCompletedReport';
import RiskBlockerReport from './reports/RiskBlockerReport';

const REPORTS = [
  {
    id: 'summary',
    label: 'Project Summary Dashboard',
    icon: BarChart3,
    component: ProjectSummaryDashboard
  },
  {
    id: 'milestone',
    label: 'Milestone Progress Report',
    icon: TrendingUp,
    component: MilestoneProgressReport
  },
  {
    id: 'gantt',
    label: 'Gantt Timeline (with Critical Path)',
    icon: Calendar,
    component: GanttTimelineReport
  },
  {
    id: 'workload',
    label: 'Resource Workload & Utilization',
    icon: Users,
    component: WorkloadReport
  },
  {
    id: 'time-effort',
    label: 'Time & Effort Tracking (Est vs Actual)',
    icon: Clock,
    component: TimeEffortReport
  },
  {
    id: 'issue-trend',
    label: 'Issue/Bug Trend Analysis',
    icon: AlertTriangle,
    component: IssueTrendReport
  },
  {
    id: 'work-completed',
    label: 'Work Completed (Weekly/Monthly)',
    icon: CheckCircle2,
    component: WorkCompletedReport
  },
  {
    id: 'risk-blocker',
    label: 'Risk & Blocker Visualization',
    icon: Shield,
    component: RiskBlockerReport
  }
];

export default function ReportsPage() {
  const { projectName } = useParams();
  const [activeReport, setActiveReport] = useState('summary');

  const ActiveReportComponent = REPORTS.find(r => r.id === activeReport)?.component || ProjectSummaryDashboard;

  return (
    <div className="flex-1 min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <div className="flex h-full">
        {/* Sidebar Navigation */}
        <div className="w-64 border-r border-[var(--theme-border)] bg-[var(--theme-cardBg)] flex flex-col">
          <div className="p-4 border-b border-[var(--theme-border)]">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 size={20} className="text-[var(--theme-primary)]" />
              <h2 className="text-lg font-semibold">Reports</h2>
            </div>
            {projectName && (
              <p className="text-xs text-[var(--theme-textSecondary)]">
                Project: {projectName}
              </p>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {REPORTS.map((report) => {
              const Icon = report.icon;
              const isActive = activeReport === report.id;
              return (
                <button
                  key={report.id}
                  onClick={() => setActiveReport(report.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 flex items-center gap-3 transition-all duration-200 ${
                    isActive
                      ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20'
                      : 'text-[var(--theme-text)] hover:bg-[var(--theme-surface)]'
                  }`}
                >
                  <Icon size={16} />
                  <span className="text-sm">{report.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <ActiveReportComponent projectName={projectName} />
        </div>
      </div>
    </div>
  );
}

