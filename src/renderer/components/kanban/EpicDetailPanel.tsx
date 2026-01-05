import { useBeadsStore } from '../../store/beadsStore';
import type { Issue, IssueStatus } from '../../../shared/types/beads';
import { Card } from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { Progress } from '@renderer/components/ui/progress';
import { StatusIcons } from '@renderer/lib/iconMap';
import { X, Loader2, GitBranch } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const STATUS_CONFIG: Record<IssueStatus, { icon: LucideIcon; color: string; bgColor: string; label: string }> = {
  open: { icon: StatusIcons.open, color: 'text-slate-400', bgColor: 'bg-slate-800/50', label: 'Open' },
  in_progress: { icon: StatusIcons.in_progress, color: 'text-blue-400', bgColor: 'bg-blue-900/30', label: 'In Progress' },
  blocked: { icon: StatusIcons.blocked, color: 'text-red-400', bgColor: 'bg-red-900/30', label: 'Blocked' },
  deferred: { icon: StatusIcons.deferred, color: 'text-amber-400', bgColor: 'bg-amber-900/30', label: 'Deferred' },
  closed: { icon: StatusIcons.closed, color: 'text-green-400', bgColor: 'bg-green-900/30', label: 'Closed' },
};

function TaskStatusIcon({ status }: { status: IssueStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  const Icon = config.icon;
  return (
    <div title={config.label}>
      <Icon className={`w-4 h-4 ${config.color}`} />
    </div>
  );
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm text-slate-300 mb-2">
        <span>{completed} of {total} tasks completed</span>
        <span>{percentage}%</span>
      </div>
      <Progress value={percentage} className="bg-slate-800" />
    </div>
  );
}

function ChildTaskItem({ task }: { task: Issue }) {
  const config = STATUS_CONFIG[task.status] || STATUS_CONFIG.open;

  return (
    <Card className={`p-3 ${config.bgColor} border-slate-700`}>
      <div className="flex items-start gap-2">
        <TaskStatusIcon status={task.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-mono">{task.id}</span>
            {task.labels?.map((label) => (
              <Badge
                key={label}
                variant="secondary"
                className="text-xs bg-slate-800 text-slate-300"
              >
                {label}
              </Badge>
            ))}
          </div>
          <h4 className="text-sm font-medium text-slate-100 mt-0.5">{task.title}</h4>
          {task.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{task.description}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

export function EpicDetailPanel() {
  const { selectedEpic, childTasks, isLoadingChildren, clearSelection, getEpicWorktree } = useBeadsStore();

  if (!selectedEpic) {
    return (
      <div className="p-6 text-center text-slate-500">
        Select a task to view details
      </div>
    );
  }

  // Check if this is a task or an epic
  const isTask = selectedEpic.issue_type === 'task';
  const completedCount = childTasks.filter((t) => t.status === 'closed').length;
  const totalCount = childTasks.length;
  const statusConfig = STATUS_CONFIG[selectedEpic.status] || STATUS_CONFIG.open;

  // Get worktree info for this epic (only for epics, not tasks)
  const worktree = !isTask ? getEpicWorktree(selectedEpic.id) : null;

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full bg-slate-950">
      {/* Header with close button */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs text-slate-400 font-mono">{selectedEpic.id}</span>
            <Badge
              variant="outline"
              className={`text-xs ${statusConfig.bgColor} ${statusConfig.color} border-slate-700`}
            >
              {statusConfig.label}
            </Badge>
            {isTask && selectedEpic.parent && (
              <Badge variant="secondary" className="text-xs bg-slate-800 text-slate-300">
                Parent: {selectedEpic.parent}
              </Badge>
            )}
          </div>
          <h2 className="text-xl font-semibold text-slate-100">
            {selectedEpic.title}
          </h2>
        </div>
        <button
          onClick={clearSelection}
          className="text-slate-400 hover:text-slate-100 p-1 hover:bg-slate-800 rounded transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Labels */}
      {selectedEpic.labels && selectedEpic.labels.length > 0 && (
        <section>
          <div className="flex flex-wrap gap-1">
            {selectedEpic.labels.map((label) => (
              <Badge key={label} variant="secondary" className="text-xs bg-slate-800 text-slate-300">
                {label}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* Development - only for epics */}
      {!isTask && (
        <section>
          <h3 className="font-medium text-slate-200 mb-2 flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Development
          </h3>
          <Card className="p-3 bg-slate-800/50 border-slate-700">
            {worktree ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-300 font-mono">{worktree.branch}</span>
                  <Badge variant="secondary" className="text-xs bg-green-900/30 text-green-400">
                    active
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">{worktree.path}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No branch yet</p>
            )}
          </Card>
        </section>
      )}

      {/* Description */}
      {selectedEpic.description && (
        <section>
          <h3 className="font-medium text-slate-200 mb-1">Description</h3>
          <p className="text-sm text-slate-400 whitespace-pre-wrap">
            {selectedEpic.description}
          </p>
        </section>
      )}

      {/* Acceptance Criteria */}
      {selectedEpic.acceptance_criteria && (
        <section>
          <h3 className="font-medium text-slate-200 mb-1">Acceptance Criteria</h3>
          <p className="text-sm text-slate-400 whitespace-pre-wrap">
            {selectedEpic.acceptance_criteria}
          </p>
        </section>
      )}

      {/* Design Notes - for tasks */}
      {isTask && selectedEpic.design && (
        <section>
          <h3 className="font-medium text-slate-200 mb-1">Design Notes</h3>
          <p className="text-sm text-slate-400 whitespace-pre-wrap">
            {selectedEpic.design}
          </p>
        </section>
      )}

      {/* Progress and Child Tasks - only for epics */}
      {!isTask && (
        <>
          {totalCount > 0 && (
            <section>
              <h3 className="font-medium text-slate-200 mb-2">Progress</h3>
              <ProgressBar completed={completedCount} total={totalCount} />
            </section>
          )}

          <section>
            <h3 className="font-medium text-slate-200 mb-2">
              Tasks ({totalCount})
            </h3>
            {isLoadingChildren ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Loader2 className="animate-spin h-4 w-4" />
                Loading tasks...
              </div>
            ) : childTasks.length === 0 ? (
              <p className="text-sm text-slate-500">No tasks created yet</p>
            ) : (
              <div className="space-y-2">
                {childTasks.map((task) => (
                  <ChildTaskItem key={task.id} task={task} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default EpicDetailPanel;
