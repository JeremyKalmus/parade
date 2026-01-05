// Client wrapper for beads IPC calls

import type {
  BeadId,
  Issue,
  CreateIssueParams,
  UpdateIssueParams,
  ListFilters,
  Dependency,
  Worktree,
} from '../../shared/types/beads';

// Re-export the electron API with proper typing
export const beads = {
  async list(filters?: ListFilters): Promise<Issue[]> {
    const result = await window.electron.beads.list(filters);
    if (result.error) {
      throw new Error(result.error);
    }
    return result.issues;
  },

  async get(id: BeadId): Promise<Issue | null> {
    const result = await window.electron.beads.get(id);
    if (result.error) {
      throw new Error(result.error);
    }
    return result.issue;
  },

  async create(params: CreateIssueParams): Promise<BeadId> {
    const result = await window.electron.beads.create(params);
    if (result.error || !result.id) {
      throw new Error(result.error || 'Failed to create issue');
    }
    return result.id;
  },

  async update(id: BeadId, params: UpdateIssueParams): Promise<void> {
    const result = await window.electron.beads.update(id, params);
    if (result.error) {
      throw new Error(result.error);
    }
  },

  async close(id: BeadId, reason?: string): Promise<void> {
    const result = await window.electron.beads.close(id, reason);
    if (result.error) {
      throw new Error(result.error);
    }
  },

  async reopen(id: BeadId): Promise<void> {
    const result = await window.electron.beads.reopen(id);
    if (result.error) {
      throw new Error(result.error);
    }
  },

  async ready(): Promise<Issue[]> {
    const result = await window.electron.beads.ready();
    if (result.error) {
      throw new Error(result.error);
    }
    return result.issues;
  },

  async depAdd(from: BeadId, to: BeadId, type?: Dependency['type']): Promise<void> {
    const result = await window.electron.beads.depAdd(from, to, type);
    if (result.error) {
      throw new Error(result.error);
    }
  },

  async depRemove(from: BeadId, to: BeadId): Promise<void> {
    const result = await window.electron.beads.depRemove(from, to);
    if (result.error) {
      throw new Error(result.error);
    }
  },

  async depTree(id: BeadId, direction?: 'up' | 'down' | 'both'): Promise<any> {
    const result = await window.electron.beads.depTree(id, direction);
    if (result.error) {
      throw new Error(result.error);
    }
    return result.tree;
  },

  async getAllWithDependencies(): Promise<(Issue & { dependencies?: Issue[]; blockedBy?: string[]; parent?: string })[]> {
    const result = await window.electron.beads.getAllWithDependencies();
    if (result.error) {
      throw new Error(result.error);
    }
    // Process the result to extract blockedBy IDs and parent from dependencies
    // bd export format: dependencies[].depends_on_id is the blocking issue
    // parent-child deps indicate the parent epic
    return result.issues.map((issue) => {
      const deps = issue.dependencies || [];
      // Find parent from parent-child dependency
      const parentDep = deps.find((d: any) => d.type === 'parent-child');
      const parent = parentDep ? (parentDep as any).depends_on_id : undefined;
      // Get blockedBy from non-parent-child deps
      const blockedBy = deps
        .filter((d: any) => d.type !== 'parent-child')
        .map((d: any) => d.depends_on_id || d.id);

      return {
        ...issue,
        parent,
        blockedBy,
      };
    });
  },

  async worktreeList(): Promise<Worktree[]> {
    const result = await window.electron.beads.worktreeList();
    if (result.error) {
      throw new Error(result.error);
    }
    return result.worktrees;
  },
};

export const settings = {
  async get<T>(key: string): Promise<T | null> {
    return window.electron.settings.get(key);
  },

  async set(key: string, value: any): Promise<void> {
    return window.electron.settings.set(key, value);
  },
};

export const appInfo = {
  async getVersion(): Promise<string> {
    return window.electron.app.getVersion();
  },
};
