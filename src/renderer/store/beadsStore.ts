// Zustand store for beads data with multi-project support

import { create } from 'zustand';
import type { Issue, BeadId, ListFilters, IssueStatus, Worktree } from '../../shared/types/beads';
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
  isSwitchingProject: boolean;
  error: string | null;

  // Batch state
  batches: Batch[];
  collapsedBatches: Set<number>;
  isLoadingBatches: boolean;

  // Worktree state
  worktrees: Worktree[];
  isLoadingWorktrees: boolean;

  // Filters
  filters: ListFilters;

  // Track recent updates to prevent race conditions
  recentUpdates: Map<BeadId, number>;

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

  // Worktree Actions
  fetchWorktrees: (options?: { silent?: boolean }) => Promise<void>;
  getEpicWorktree: (epicId: BeadId) => Worktree | null;

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
  isSwitchingProject: false,
  error: null,

  // Initial state - Batch
  batches: [],
  collapsedBatches: new Set<number>(),
  isLoadingBatches: false,

  // Initial state - Worktree
  worktrees: [],
  isLoadingWorktrees: false,

  filters: {},

  recentUpdates: new Map<BeadId, number>(),

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

    set({ activeProjectId: projectId, isSwitchingProject: true, error: null });

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

      // Project switch complete
      set({ isSwitchingProject: false });
    } catch (err) {
      console.error('Failed to switch project:', err);
      set({
        error: err instanceof Error ? err.message : 'Failed to switch project',
        isSwitchingProject: false,
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
    const { activeProjectId, projects, recentUpdates } = get();
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
      const fetchedIssues = await beads.list(get().filters);
      
      // Preserve optimistic updates for issues we recently updated (within last 2 seconds)
      // This prevents race conditions where file watcher triggers before our update completes
      const now = Date.now();
      const RECENT_UPDATE_THRESHOLD = 2000; // 2 seconds
      const currentIssues = get().issues;
      
      const mergedIssues = fetchedIssues.map((fetchedIssue) => {
        const recentUpdateTime = recentUpdates.get(fetchedIssue.id);
        if (recentUpdateTime && (now - recentUpdateTime) < RECENT_UPDATE_THRESHOLD) {
          // We recently updated this issue - preserve the optimistic update
          const optimisticIssue = currentIssues.find((i) => i.id === fetchedIssue.id);
          if (optimisticIssue) {
            // Merge: use fetched data but preserve status from optimistic update
            return {
              ...fetchedIssue,
              status: optimisticIssue.status,
            };
          }
        }
        return fetchedIssue;
      });
      
      // Clean up old recent updates (older than threshold)
      const cleanedUpdates = new Map<BeadId, number>();
      for (const [id, timestamp] of recentUpdates.entries()) {
        if (now - timestamp < RECENT_UPDATE_THRESHOLD) {
          cleanedUpdates.set(id, timestamp);
        }
      }
      
      // If we have a selected epic/task, refresh its reference to point to the updated object
      // This prevents stale references that could cause the sidebar to close unexpectedly
      const { selectedEpic } = get();
      let updatedSelectedEpic = selectedEpic;
      if (selectedEpic) {
        const updatedIssue = mergedIssues.find((i) => i.id === selectedEpic.id);
        if (updatedIssue) {
          updatedSelectedEpic = updatedIssue;
        } else {
          // Selected issue no longer exists - clear selection
          updatedSelectedEpic = null;
        }
      }
      
      set({ 
        issues: mergedIssues, 
        isLoading: false,
        selectedEpic: updatedSelectedEpic,
        recentUpdates: cleanedUpdates,
      });
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

    // Track this update to prevent race conditions with file watcher
    const now = Date.now();
    set((state) => {
      const newRecentUpdates = new Map(state.recentUpdates);
      newRecentUpdates.set(id, now);
      return {
        issues: state.issues.map((issue) =>
          issue.id === id ? { ...issue, status } : issue
        ),
        recentUpdates: newRecentUpdates,
      };
    });

    try {
      await beads.update(id, { status });
      // Success - state already reflects the change
      // Keep the recent update timestamp for a bit longer to handle file watcher delays
    } catch (err) {
      // Rollback to previous state on failure
      set((state) => {
        const newRecentUpdates = new Map(state.recentUpdates);
        newRecentUpdates.delete(id); // Remove from recent updates on failure
        return {
          issues: state.issues.map((issue) =>
            issue.id === id ? { ...issue, status: previousStatus || issue.status } : issue
          ),
          recentUpdates: newRecentUpdates,
        };
      });
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

  // Worktree Actions
  fetchWorktrees: async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    // Only show loading indicator for non-silent fetches
    if (!silent) {
      set({ isLoadingWorktrees: true });
    }
    try {
      const worktrees = await beads.worktreeList();
      set({ worktrees, isLoadingWorktrees: false });
    } catch (err) {
      console.error('Failed to fetch worktrees:', err);
      set({ isLoadingWorktrees: false });
    }
  },

  getEpicWorktree: (epicId: BeadId) => {
    const { worktrees } = get();
    // Match worktree.branch against pattern `epic/<epicId>` or `agent/<epicId>.*`
    const epicBranchPattern = `epic/${epicId}`;
    const agentBranchPattern = new RegExp(`^agent/${epicId}\\.`);

    return worktrees.find((wt) =>
      wt.branch === epicBranchPattern || agentBranchPattern.test(wt.branch)
    ) ?? null;
  },

  // Event subscription for real-time updates
  subscribeToChanges: () => {
    const unsubscribe = window.electron.events.onBeadsChange(() => {
      try {
        // Refresh data when .beads/ files change
        // Use silent mode to avoid showing the "switching project" overlay
        const { fetchIssues, fetchIssuesWithDeps, fetchWorktrees, computeBatchesForEpic, selectedEpic } = get();

        // Add a small delay to avoid race conditions with file writes
        // This gives the file system time to fully write the changes
        setTimeout(() => {
          fetchIssues({ silent: true }).catch((err) => {
            console.error('Error fetching issues in real-time update:', err);
          });

          fetchWorktrees({ silent: true }).catch((err) => {
            console.error('Error fetching worktrees in real-time update:', err);
          });

          // If something is selected, also refresh issues with dependencies and recompute batches
          if (selectedEpic) {
            fetchIssuesWithDeps({ silent: true })
              .then(() => {
                // Determine which epic to compute batches for
                // If selectedEpic is a task, use its parent epic
                // If selectedEpic is an epic, use it directly
                let epicId: BeadId | null = null;
                
                if (selectedEpic.issue_type === 'task' && selectedEpic.parent) {
                  // Task selected - find its parent epic
                  epicId = selectedEpic.parent;
                } else if (selectedEpic.issue_type === 'epic') {
                  // Epic selected - use it directly
                  epicId = selectedEpic.id;
                }

                // Only compute batches if we have a valid epic ID
                if (epicId) {
                  computeBatchesForEpic(epicId);
                }
              })
              .catch((err) => {
                console.error('Error fetching issues with deps in real-time update:', err);
              });
          }
        }, 250); // 250ms delay to let file writes complete and reduce flickering
      } catch (err) {
        console.error('Error in beads change handler:', err);
      }
    });
    return unsubscribe;
  },
}));
