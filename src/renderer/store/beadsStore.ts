// Zustand store for beads data with multi-project support

import { create } from 'zustand';
import type { Issue, BeadId, ListFilters, IssueStatus } from '../../shared/types/beads';
import type { Project, Settings } from '../../shared/types/settings';
import { beads, settings } from '../lib/beadsClient';
import { computeBatches, type Batch, type TaskWithDeps } from '../lib/batchComputation';

interface BeadsState {
  // Multi-project support
  projects: Project[];
  activeProjectId: string | null;

  // Data
  issues: Issue[];
  issuesWithDeps: TaskWithDeps[];
  selectedIssueId: BeadId | null;
  selectedEpic: Issue | null;
  childTasks: Issue[];
  isLoading: boolean;
  isLoadingChildren: boolean;
  error: string | null;

  // Batch state
  batches: Batch[];
  collapsedBatches: Set<number>;
  isLoadingBatches: boolean;

  // Filters
  filters: ListFilters;

  // Project Actions
  loadProjects: () => Promise<void>;
  setActiveProject: (projectId: string | null) => Promise<void>;
  getActiveProject: () => Project | null;

  // Issue Actions
  fetchIssues: (options?: { silent?: boolean }) => Promise<void>;
  fetchIssuesWithDeps: (options?: { silent?: boolean }) => Promise<void>;
  setFilters: (filters: ListFilters) => void;
  selectIssue: (id: BeadId | null) => void;
  selectEpic: (epic: Issue | null) => void;
  fetchChildTasks: (epicId: BeadId) => Promise<void>;
  updateIssueStatus: (id: BeadId, status: IssueStatus) => Promise<void>;
  refreshIssue: (id: BeadId) => Promise<void>;
  clearSelection: () => void;

  // Batch Actions
  computeBatchesForEpic: (epicId: BeadId) => void;
  toggleBatchCollapse: (batchNumber: number) => void;
  loadCollapsedBatches: () => void;
  saveCollapsedBatches: () => void;

  // Event subscription
  subscribeToChanges: () => () => void; // Returns unsubscribe function
}

// localStorage key for collapsed batches
const COLLAPSED_BATCHES_KEY = 'beadsStore:collapsedBatches';

export const useBeadsStore = create<BeadsState>((set, get) => ({
  // Initial state - Multi-project
  projects: [],
  activeProjectId: null,

  // Initial state - Data
  issues: [],
  issuesWithDeps: [],
  selectedIssueId: null,
  selectedEpic: null,
  childTasks: [],
  isLoading: false,
  isLoadingChildren: false,
  error: null,

  // Initial state - Batch
  batches: [],
  collapsedBatches: new Set<number>(),
  isLoadingBatches: false,

  filters: {},

  // Project Actions
  loadProjects: async () => {
    try {
      const allSettings = await settings.get<Settings>('all');
      const projectList = allSettings?.projects ?? [];

      // Find the active project (first one marked as active, or first project)
      const activeProject = projectList.find((p) => p.isActive) ?? projectList[0] ?? null;

      set({
        projects: projectList,
        activeProjectId: activeProject?.id ?? null,
      });

      // If we have an active project, set it up and fetch issues
      if (activeProject) {
        // Update the beads project path in settings to match active project
        await settings.set('beadsProjectPath', activeProject.path);
        // Fetch issues for the active project
        await get().fetchIssues();
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
      set({
        error: err instanceof Error ? err.message : 'Failed to load projects',
      });
    }
  },

  setActiveProject: async (projectId: string | null) => {
    const { projects } = get();

    // If switching to "all projects" view (null), just clear the active project
    if (projectId === null) {
      set({ activeProjectId: null, issues: [], error: null });
      return;
    }

    // Find the project
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      console.error('Project not found:', projectId);
      return;
    }

    set({ activeProjectId: projectId, isLoading: true, error: null });

    try {
      // Update the beads project path in main process
      await settings.set('beadsProjectPath', project.path);

      // Update project isActive flags
      const updatedProjects = projects.map((p) => ({
        ...p,
        isActive: p.id === projectId,
      }));
      await settings.set('projects', updatedProjects);

      set({ projects: updatedProjects });

      // Fetch issues for the new project
      await get().fetchIssues();
    } catch (err) {
      console.error('Failed to switch project:', err);
      set({
        error: err instanceof Error ? err.message : 'Failed to switch project',
        isLoading: false,
      });
    }
  },

  getActiveProject: () => {
    const { projects, activeProjectId } = get();
    if (!activeProjectId) return null;
    return projects.find((p) => p.id === activeProjectId) ?? null;
  },

  // Issue Actions
  fetchIssues: async (options?: { silent?: boolean }) => {
    const { activeProjectId, projects } = get();
    const silent = options?.silent ?? false;

    // If no active project is selected, don't fetch
    // This supports the "all projects" view where we'd show nothing or aggregate
    if (!activeProjectId) {
      if (!silent) set({ issues: [], isLoading: false });
      return;
    }

    // Verify the project exists
    const activeProject = projects.find((p) => p.id === activeProjectId);
    if (!activeProject) {
      set({
        issues: [],
        isLoading: false,
        error: 'Active project not found',
      });
      return;
    }

    // Only show loading indicator for non-silent fetches (e.g., project switch)
    // Silent fetches are for real-time updates and shouldn't show the overlay
    if (!silent) {
      set({ isLoading: true, error: null });
    }
    try {
      const issues = await beads.list(get().filters);
      set({ issues, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch issues',
        isLoading: false,
      });
    }
  },

  fetchIssuesWithDeps: async (options?: { silent?: boolean }) => {
    const { activeProjectId, projects } = get();
    const silent = options?.silent ?? false;

    if (!activeProjectId) {
      if (!silent) set({ issuesWithDeps: [], isLoadingBatches: false });
      return;
    }

    const activeProject = projects.find((p) => p.id === activeProjectId);
    if (!activeProject) {
      return;
    }

    // Only show loading indicator for non-silent fetches
    if (!silent) {
      set({ isLoadingBatches: true });
    }
    try {
      const issuesWithDeps = await beads.getAllWithDependencies();
      set({ issuesWithDeps: issuesWithDeps as TaskWithDeps[], isLoadingBatches: false });
    } catch (err) {
      console.error('Failed to fetch issues with dependencies:', err);
      set({ isLoadingBatches: false });
    }
  },

  setFilters: (filters) => {
    set({ filters });
    get().fetchIssues();
  },

  selectIssue: (id) => {
    set({ selectedIssueId: id });
  },

  selectEpic: (epic) => {
    set({ selectedEpic: epic, childTasks: [] });
    // Only fetch child tasks for epics, not for tasks
    if (epic && epic.issue_type === 'epic') {
      get().fetchChildTasks(epic.id);
    }
  },

  fetchChildTasks: async (epicId) => {
    set({ isLoadingChildren: true });
    try {
      const result = await beads.list({ parent: epicId });
      set({ childTasks: result, isLoadingChildren: false });
    } catch (err) {
      console.error('Failed to fetch child tasks:', err);
      set({ isLoadingChildren: false });
    }
  },

  clearSelection: () => {
    set({ selectedEpic: null, childTasks: [], selectedIssueId: null });
  },

  updateIssueStatus: async (id, status) => {
    // Get previous status for rollback
    const previousIssue = get().issues.find((i) => i.id === id);
    const previousStatus = previousIssue?.status;

    // Optimistic update - update UI immediately before API call
    set((state) => ({
      issues: state.issues.map((issue) =>
        issue.id === id ? { ...issue, status } : issue
      ),
    }));

    try {
      await beads.update(id, { status });
      // Success - state already reflects the change
    } catch (err) {
      // Rollback to previous state on failure
      if (previousStatus) {
        set((state) => ({
          issues: state.issues.map((issue) =>
            issue.id === id ? { ...issue, status: previousStatus } : issue
          ),
        }));
      } else {
        // If we don't have previous state, refresh from server
        get().fetchIssues();
      }
      throw err;
    }
  },

  refreshIssue: async (id) => {
    try {
      const issue = await beads.get(id);
      if (issue) {
        set((state) => ({
          issues: state.issues.map((i) => (i.id === id ? issue : i)),
        }));
      }
    } catch (err) {
      console.error('Failed to refresh issue:', err);
    }
  },

  // Batch Actions
  computeBatchesForEpic: (epicId) => {
    const { issuesWithDeps } = get();
    const batches = computeBatches(issuesWithDeps, epicId);
    set({ batches });
  },

  toggleBatchCollapse: (batchNumber) => {
    set((state) => {
      const newCollapsed = new Set(state.collapsedBatches);
      if (newCollapsed.has(batchNumber)) {
        newCollapsed.delete(batchNumber);
      } else {
        newCollapsed.add(batchNumber);
      }
      return { collapsedBatches: newCollapsed };
    });
    // Save to localStorage
    get().saveCollapsedBatches();
  },

  loadCollapsedBatches: () => {
    try {
      const stored = localStorage.getItem(COLLAPSED_BATCHES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          set({ collapsedBatches: new Set(parsed) });
        }
      }
    } catch (err) {
      console.error('Failed to load collapsed batches:', err);
    }
  },

  saveCollapsedBatches: () => {
    try {
      const { collapsedBatches } = get();
      localStorage.setItem(COLLAPSED_BATCHES_KEY, JSON.stringify([...collapsedBatches]));
    } catch (err) {
      console.error('Failed to save collapsed batches:', err);
    }
  },

  // Event subscription for real-time updates
  subscribeToChanges: () => {
    const unsubscribe = window.electron.events.onBeadsChange(() => {
      // Refresh data when .beads/ files change
      // Use silent mode to avoid showing the "switching project" overlay
      const { fetchIssues, fetchIssuesWithDeps, computeBatchesForEpic, selectedEpic } = get();

      fetchIssues({ silent: true });

      // If an epic is selected, also refresh issues with dependencies and recompute batches
      if (selectedEpic) {
        fetchIssuesWithDeps({ silent: true }).then(() => {
          // Recompute batches after deps are updated
          computeBatchesForEpic(selectedEpic.id);
        });
      }
    });
    return unsubscribe;
  },
}));
