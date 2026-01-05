import { useBeadsStore } from '../../store/beadsStore';
import { Badge } from '@renderer/components/ui/badge';
import { GitBranch, CheckCircle2 } from 'lucide-react';
import type { BeadId } from '../../../shared/types/beads';

interface Props {
  epicId: BeadId;
}

export function EpicInfoHeader({ epicId }: Props) {
  const issues = useBeadsStore((state) => state.issues);
  const getEpicWorktree = useBeadsStore((state) => state.getEpicWorktree);

  const epic = issues.find((i) => i.id === epicId);
  const worktree = getEpicWorktree(epicId);

  // Count child tasks
  const childTasks = issues.filter((i) => i.parent === epicId);
  const completedCount = childTasks.filter((t) => t.status === 'closed').length;
  const totalCount = childTasks.length;

  if (!epic) return null;

  return (
    <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/50 flex items-center gap-4 flex-wrap">
      {/* Epic title and ID */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 font-mono">{epicId}</span>
        <span className="text-sm font-medium text-slate-200">{epic.title}</span>
      </div>

      {/* Worktree badge */}
      <div className="flex items-center gap-1.5">
        <GitBranch className="w-3.5 h-3.5 text-slate-400" />
        {worktree ? (
          <Badge variant="secondary" className="text-xs bg-green-900/30 text-green-400">
            {worktree.branch}
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs bg-slate-800 text-slate-500">
            no branch
          </Badge>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1.5 text-sm text-slate-400">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>
          {completedCount}/{totalCount} complete
        </span>
      </div>
    </div>
  );
}
