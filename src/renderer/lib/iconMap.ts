import {
  Circle,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  Pause,
  Rocket,
  FileText,
  Search,
  ClipboardList,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Ban,
  Check,
  X,
  Info,
  Radio,
  HelpCircle,
  Edit3,
  Wrench,
  BarChart3,
  Pin,
  Briefcase,
  Palette,
  Bot,
  type LucideIcon,
} from 'lucide-react';

/**
 * Icon mapping system for converting emoji-based icons to lucide-react components.
 * This provides consistent, scalable, and accessible icons throughout the application.
 */

// Status Icons (Brief and Epic statuses)
export const StatusIcons = {
  // Brief statuses
  draft: FileText,
  in_discovery: Search,
  spec_ready: ClipboardList,
  approved: CheckCircle,
  exported: Rocket,
  in_progress: PlayCircle,
  completed: CheckCircle2,
  canceled: XCircle,

  // Additional statuses
  review: Eye,
  blocked: Ban,
  failed: XCircle,
  success: Check,

  // Epic/Task statuses (IssueStatus)
  open: Circle,
  deferred: Pause,
  closed: CheckCircle2,
} as const;

// Activity/Event Icons
export const ActivityIcons = {
  discovery_started: Search,
  questions_generated: HelpCircle,
  questions_answered: Edit3,
  sme_technical_complete: Wrench,
  sme_business_complete: BarChart3,
  spec_generated: ClipboardList,
  exported: Rocket,
  default: Pin,
  activity_header: Radio,
} as const;

// SME/Agent Icons
export const AgentIcons = {
  'technical-sme': Wrench,
  'business-sme': Briefcase,
  'ux-sme': Palette,
  default: Bot,
} as const;

// Toast/Alert Icons
export const ToastIcons = {
  success: Check,
  error: X,
  warning: AlertTriangle,
  info: Info,
} as const;

// Priority Icons (for future use)
export const PriorityIcons = {
  critical: AlertCircle,
  high: AlertTriangle,
  medium: AlertCircle,
  low: Info,
} as const;

// Navigation Icons (for future use)
export const NavigationIcons = {
  pipeline: BarChart3,
  briefs: FileText,
  kanban: ClipboardList,
  settings: Circle, // placeholder
} as const;

/**
 * Helper type to extract icon names from a mapping object
 */
type IconMapKeys<T> = keyof T;

/**
 * Get an icon component from a mapping object with fallback
 */
export function getIcon<T extends Record<string, LucideIcon>>(
  iconMap: T,
  key: IconMapKeys<T> | string,
  fallback?: LucideIcon
): LucideIcon {
  if (key in iconMap) {
    return iconMap[key as IconMapKeys<T>];
  }
  return fallback || Circle;
}

/**
 * Convenience function to get status icon
 */
export function getStatusIcon(status: keyof typeof StatusIcons): LucideIcon {
  return StatusIcons[status] || Circle;
}

/**
 * Convenience function to get activity icon
 */
export function getActivityIcon(activityType: string): LucideIcon {
  return getIcon(ActivityIcons, activityType, ActivityIcons.default);
}

/**
 * Convenience function to get agent icon
 */
export function getAgentIcon(agentType: string): LucideIcon {
  return getIcon(AgentIcons, agentType, AgentIcons.default);
}

/**
 * Convenience function to get toast icon
 */
export function getToastIcon(toastType: keyof typeof ToastIcons): LucideIcon {
  return ToastIcons[toastType];
}

// Export all icon mappings as a single object for reference
export const IconMap = {
  status: StatusIcons,
  activity: ActivityIcons,
  agent: AgentIcons,
  toast: ToastIcons,
  priority: PriorityIcons,
  navigation: NavigationIcons,
} as const;

/**
 * Type label configuration for task categorization
 * Maps type:* labels to icon and color for visual distinction
 */
export const TypeLabelConfig: Record<string, { icon: string; color: string }> = {
  bug: { icon: '🐛', color: 'text-red-400' },
  feature: { icon: '✨', color: 'text-green-400' },
  enhancement: { icon: '💡', color: 'text-yellow-400' },
  chore: { icon: '🔧', color: 'text-slate-400' },
  docs: { icon: '📝', color: 'text-blue-400' },
};

const DEFAULT_TYPE_DISPLAY = { icon: '📌', color: 'text-slate-400' };

/**
 * Extract type display info from labels array
 * Looks for type:* labels and returns corresponding icon/color
 */
export function getTypeDisplay(labels: string[] = []): { icon: string; color: string } | null {
  const typeLabel = labels.find((l) => l.startsWith('type:'));
  if (!typeLabel) return null;

  const type = typeLabel.replace('type:', '');
  return TypeLabelConfig[type] || DEFAULT_TYPE_DISPLAY;
}

export default IconMap;
