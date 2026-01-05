// BeadsService - CLI wrapper for bd commands

import { spawn } from 'child_process';
import type {
  Issue,
  BeadId,
  CreateIssueParams,
  UpdateIssueParams,
  ListFilters,
  Dependency,
  Worktree,
} from '../../shared/types/beads';

interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

class BeadsService {
  private bdPath: string = 'bd'; // Assumes bd is in PATH
  private projectPath: string | null = null;

  setProjectPath(path: string) {
    this.projectPath = path;
  }

  private async exec(args: string[]): Promise<ExecResult> {
    return new Promise((resolve) => {
      const options: { cwd?: string } = {};
      if (this.projectPath) {
        options.cwd = this.projectPath;
      }

      const proc = spawn(this.bdPath, args, options);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({ stdout, stderr, code: code ?? 0 });
      });

      proc.on('error', (err) => {
        resolve({ stdout: '', stderr: err.message, code: 1 });
      });
    });
  }

  private parseJsonOutput<T>(output: string): T | null {
    try {
      return JSON.parse(output) as T;
    } catch {
      return null;
    }
  }

  async list(filters?: ListFilters): Promise<{ issues: Issue[]; error?: string }> {
    const args = ['list', '--json'];

    // Default to showing all statuses if not specified
    // This ensures the Kanban shows issues in all columns including closed
    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      statuses.forEach((s) => args.push('--status', s));
    } else {
      args.push('--status', 'all');
    }

    if (filters?.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      types.forEach((t) => args.push('--type', t));
    }

    if (filters?.parent) {
      args.push('--parent', filters.parent);
    }

    if (filters?.label) {
      args.push('--label', filters.label);
    }

    if (filters?.assignee) {
      args.push('--assignee', filters.assignee);
    }

    const result = await this.exec(args);

    if (result.code !== 0) {
      return { issues: [], error: result.stderr || 'Failed to list issues' };
    }

    const issues = this.parseJsonOutput<Issue[]>(result.stdout);
    return { issues: issues ?? [] };
  }

  async get(id: BeadId): Promise<{ issue: Issue | null; error?: string }> {
    const result = await this.exec(['show', id, '--json']);

    if (result.code !== 0) {
      return { issue: null, error: result.stderr || `Failed to get issue ${id}` };
    }

    // bd show returns an array with one item
    const issues = this.parseJsonOutput<Issue[]>(result.stdout);
    return { issue: issues?.[0] ?? null };
  }

  async getWithDependencies(id: BeadId): Promise<{ issue: (Issue & { dependencies?: Issue[]; parent?: string }) | null; error?: string }> {
    const result = await this.exec(['show', id, '--json']);

    if (result.code !== 0) {
      return { issue: null, error: result.stderr || `Failed to get issue ${id}` };
    }

    const issues = this.parseJsonOutput<(Issue & { dependencies?: Issue[]; parent?: string })[]>(result.stdout);
    return { issue: issues?.[0] ?? null };
  }

  async getAllWithDependencies(): Promise<{ issues: (Issue & { dependencies?: Issue[]; parent?: string })[]; error?: string }> {
    // Use bd export for a single subprocess call that includes all dependencies
    // Much faster than N+1 calls (bd list + bd show for each issue)
    // bd export defaults to all issues (no --status flag needed)
    const result = await this.exec(['export']);

    if (result.code !== 0) {
      return { issues: [], error: result.stderr || 'Failed to export issues' };
    }

    // Parse JSONL output (one JSON object per line)
    const issues: (Issue & { dependencies?: Issue[]; parent?: string })[] = [];
    const lines = result.stdout.trim().split('\n');

    for (const line of lines) {
      if (line.trim()) {
        try {
          const issue = JSON.parse(line);
          issues.push(issue);
        } catch {
          // Skip malformed lines
        }
      }
    }

    return { issues };
  }

  async create(params: CreateIssueParams): Promise<{ id: BeadId | null; error?: string }> {
    const args = ['create', params.title];

    if (params.type) {
      args.push('--type', params.type);
    }

    if (params.description) {
      args.push('--description', params.description);
    }

    if (params.priority !== undefined) {
      args.push('--priority', params.priority.toString());
    }

    if (params.parent) {
      args.push('--parent', params.parent);
    }

    if (params.acceptance) {
      args.push('--acceptance', params.acceptance);
    }

    if (params.design) {
      args.push('--design', params.design);
    }

    if (params.labels) {
      params.labels.forEach((label) => args.push('--label', label));
    }

    if (params.assignee) {
      args.push('--assignee', params.assignee);
    }

    const result = await this.exec(args);

    if (result.code !== 0) {
      return { id: null, error: result.stderr || 'Failed to create issue' };
    }

    // bd create outputs the new issue ID
    const match = result.stdout.match(/bd-[a-z0-9]+(?:\.\d+)?/);
    return { id: match ? match[0] : null };
  }

  async update(id: BeadId, params: UpdateIssueParams): Promise<{ success: boolean; error?: string }> {
    const args = ['update', id];

    if (params.title) {
      args.push('--title', params.title);
    }

    if (params.description) {
      args.push('--description', params.description);
    }

    if (params.status) {
      args.push('--status', params.status);
    }

    if (params.priority !== undefined) {
      args.push('--priority', params.priority.toString());
    }

    if (params.acceptance) {
      args.push('--acceptance', params.acceptance);
    }

    if (params.design) {
      args.push('--design', params.design);
    }

    if (params.notes) {
      args.push('--notes', params.notes);
    }

    if (params.assignee) {
      args.push('--assignee', params.assignee);
    }

    if (params.dueAt) {
      args.push('--due', params.dueAt);
    }

    const result = await this.exec(args);

    if (result.code !== 0) {
      return { success: false, error: result.stderr || `Failed to update issue ${id}` };
    }

    return { success: true };
  }

  async close(id: BeadId, reason?: string): Promise<{ success: boolean; error?: string }> {
    const args = ['close', id];

    if (reason) {
      args.push('--reason', reason);
    }

    const result = await this.exec(args);

    if (result.code !== 0) {
      return { success: false, error: result.stderr || `Failed to close issue ${id}` };
    }

    return { success: true };
  }

  async reopen(id: BeadId): Promise<{ success: boolean; error?: string }> {
    const result = await this.exec(['reopen', id]);

    if (result.code !== 0) {
      return { success: false, error: result.stderr || `Failed to reopen issue ${id}` };
    }

    return { success: true };
  }

  async ready(): Promise<{ issues: Issue[]; error?: string }> {
    const result = await this.exec(['ready', '--json']);

    if (result.code !== 0) {
      return { issues: [], error: result.stderr || 'Failed to get ready work' };
    }

    const issues = this.parseJsonOutput<Issue[]>(result.stdout);
    return { issues: issues ?? [] };
  }

  async depAdd(
    from: BeadId,
    to: BeadId,
    type: Dependency['type'] = 'blocks'
  ): Promise<{ success: boolean; error?: string }> {
    const args = ['dep', 'add', from, to];

    if (type !== 'blocks') {
      args.push('--type', type);
    }

    const result = await this.exec(args);

    if (result.code !== 0) {
      return { success: false, error: result.stderr || 'Failed to add dependency' };
    }

    return { success: true };
  }

  async depRemove(from: BeadId, to: BeadId): Promise<{ success: boolean; error?: string }> {
    const result = await this.exec(['dep', 'remove', from, to]);

    if (result.code !== 0) {
      return { success: false, error: result.stderr || 'Failed to remove dependency' };
    }

    return { success: true };
  }

  async depTree(
    id: BeadId,
    direction: 'up' | 'down' | 'both' = 'both'
  ): Promise<{ tree: any; error?: string }> {
    const args = ['dep', 'tree', id, '--json'];

    if (direction !== 'both') {
      args.push('--direction', direction);
    }

    const result = await this.exec(args);

    if (result.code !== 0) {
      return { tree: null, error: result.stderr || 'Failed to get dependency tree' };
    }

    const tree = this.parseJsonOutput(result.stdout);
    return { tree };
  }

  async init(): Promise<{ success: boolean; error?: string }> {
    const result = await this.exec(['init']);

    if (result.code !== 0) {
      return { success: false, error: result.stderr || 'Failed to initialize beads' };
    }

    return { success: true };
  }

  async isInitialized(): Promise<boolean> {
    const result = await this.exec(['list', '--json']);
    return result.code === 0;
  }

  async worktreeList(): Promise<{ worktrees: Worktree[]; error?: string }> {
    const result = await this.exec(['worktree', 'list', '--json']);

    if (result.code !== 0) {
      return { worktrees: [], error: result.stderr || 'Failed to list worktrees' };
    }

    const worktrees = this.parseJsonOutput<Worktree[]>(result.stdout);
    return { worktrees: worktrees ?? [] };
  }
}

export const beadsService = new BeadsService();
export default beadsService;
