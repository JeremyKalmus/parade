// Beads issue types - matching bd CLI output

export type BeadId = string; // e.g., "bd-a3f8" or "bd-a3f8.1"

export type IssueStatus = 'open' | 'in_progress' | 'blocked' | 'deferred' | 'closed';
export type IssueType = 'bug' | 'feature' | 'task' | 'epic' | 'chore' | 'merge-request';
export type Priority = 0 | 1 | 2 | 3 | 4; // 0 = critical, 4 = lowest

export type DependencyType = 'blocks' | 'tracks' | 'parent-child' | 'relates_to' | 'discovered-from' | 'conditional-blocks';

export interface Issue {
  id: BeadId;
  title: string;
  description?: string;
  issue_type: IssueType;  // bd CLI uses issue_type
  type?: IssueType;       // alias for compatibility
  status: IssueStatus;
  priority: Priority;
  labels?: string[];
  assignee?: string;
  parent?: BeadId;
  acceptance_criteria?: string;  // bd CLI uses acceptance_criteria
  acceptance?: string;           // alias for compatibility
  design?: string;
  notes?: string;
  created_at: string;   // bd CLI uses snake_case
  updated_at: string;
  closed_at?: string;
  close_reason?: string;
  due_at?: string;
  defer_until?: string;
  external_ref?: string;
  estimated_minutes?: number;
}

export interface Dependency {
  from: BeadId;
  to: BeadId;
  type: DependencyType;
}

export interface Label {
  issueId: BeadId;
  label: string;
}

export interface CreateIssueParams {
  title: string;
  type?: IssueType;
  description?: string;
  priority?: Priority;
  parent?: BeadId;
  acceptance?: string;
  design?: string;
  labels?: string[];
  assignee?: string;
}

export interface UpdateIssueParams {
  title?: string;
  description?: string;
  status?: IssueStatus;
  priority?: Priority;
  acceptance?: string;
  design?: string;
  notes?: string;
  assignee?: string;
  dueAt?: string;
}

export interface ListFilters {
  status?: IssueStatus | IssueStatus[];
  type?: IssueType | IssueType[];
  parent?: BeadId;
  label?: string;
  assignee?: string;
}

export interface DepTreeNode {
  issue: Issue;
  children: DepTreeNode[];
  blockedBy: BeadId[];
}

export interface Worktree {
  name: string;
  path: string;
  branch: string;
  is_main: boolean;
  beads_state: 'primary' | 'shared' | 'redirect';
}
