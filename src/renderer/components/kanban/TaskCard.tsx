// TaskCard - Compact task card for swimlane layout

import type { Issue } from '../../../shared/types/beads';
import { getTypeDisplay } from '@renderer/lib/iconMap';

interface TaskCardProps {
  task: Issue;
  isSelected?: boolean;
  onClick: () => void;
}

export function TaskCard({ task, isSelected, onClick }: TaskCardProps) {
  // Extract short ID (e.g., "bd-a1b2.3" -> "a1b2.3")
  const shortId = task.id.replace('bd-', '');
  const typeDisplay = getTypeDisplay(task.labels);

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-2 rounded-md transition-all
        ${isSelected
          ? 'bg-sky-900/40 ring-1 ring-sky-500'
          : 'bg-slate-800/60 hover:bg-slate-800'
        }
      `}
    >
      {/* Title with ID prefix and type icon */}
      <h4 className="text-xs font-medium text-slate-200 line-clamp-2 leading-tight">
        {typeDisplay && (
          <span className={`${typeDisplay.color} mr-1`} title={`Type: ${task.labels?.find(l => l.startsWith('type:'))?.replace('type:', '')}`}>
            {typeDisplay.icon}
          </span>
        )}
        <span className="text-sky-400 font-mono">{shortId}</span>{' '}
        {task.title}
      </h4>
    </button>
  );
}

export default TaskCard;
