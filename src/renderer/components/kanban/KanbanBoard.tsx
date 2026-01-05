import { useEffect, useCallback, useRef } from 'react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { KanbanFilters } from './KanbanFilters';
import { BatchGrid } from './BatchGrid';
import { EpicInfoHeader } from './EpicInfoHeader';
import { useBeadsStore } from '../../store/beadsStore';
import type { Issue, BeadId } from '../../../shared/types/beads';
import { Layers } from 'lucide-react';

export function KanbanBoard() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Store state
  const issues = useBeadsStore((state) => state.issues);
  const isLoading = useBeadsStore((state) => state.isLoading);
  const error = useBeadsStore((state) => state.error);
  const batches = useBeadsStore((state) => state.batches);
  const collapsedBatches = useBeadsStore((state) => state.collapsedBatches);
  const isLoadingBatches = useBeadsStore((state) => state.isLoadingBatches);
  const selectedEpic = useBeadsStore((state) => state.selectedEpic);

  // Get epicId from URL query params
  const epicIdFromUrl = searchParams.get('epicId');

  // Filter state - initialize epicId from URL
  const [filters, setFilters] = useState({
    type: null as string | null,
    label: null as string | null,
    epicId: epicIdFromUrl as BeadId | null,
    search: '',
  });

  // Sync filter state with URL when epicId param changes
  useEffect(() => {
    if (epicIdFromUrl !== filters.epicId) {
      setFilters((prev) => ({
        ...prev,
        epicId: epicIdFromUrl as BeadId | null,
      }));
    }
  }, [epicIdFromUrl]);

  // Update URL when filter changes
  const handleFilterChange = useCallback(
    (newFilters: typeof filters) => {
      setFilters(newFilters);

      // Update URL search params
      const newSearchParams = new URLSearchParams(searchParams);
      if (newFilters.epicId) {
        newSearchParams.set('epicId', newFilters.epicId);
      } else {
        newSearchParams.delete('epicId');
      }
      setSearchParams(newSearchParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // Fetch on mount, load collapsed state, and subscribe to real-time updates
  useEffect(() => {
    const store = useBeadsStore.getState();
    store.fetchIssues();
    store.loadCollapsedBatches();

    // Subscribe to beads changes for real-time updates
    const unsubscribe = store.subscribeToChanges();

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []); // Empty deps - run only once on mount

  // Track previous epicId to detect actual changes vs background refreshes
  const prevEpicIdRef = useRef<BeadId | null>(null);

  // When epic filter changes, fetch issues with deps and compute batches
  useEffect(() => {
    if (filters.epicId) {
      const store = useBeadsStore.getState();
      const epicIdChanged = prevEpicIdRef.current !== filters.epicId;

      if (epicIdChanged) {
        // Epic actually changed - fetch with loading indicator
        prevEpicIdRef.current = filters.epicId;
        store.fetchIssuesWithDeps().then(() => {
          store.computeBatchesForEpic(filters.epicId!);
        });

        // Only auto-select the epic if no task is currently selected
        // This prevents resetting task selection when issues update
        const currentSelection = store.selectedEpic;
        const isTaskSelected = currentSelection?.issue_type === 'task';
        
        if (!isTaskSelected) {
          // Get fresh issues from store to find the epic
          const currentIssues = store.issues;
          const epic = currentIssues.find((i) => i.id === filters.epicId);
          if (epic && epic.id !== currentSelection?.id) {
            store.selectEpic(epic);
          }
        }
      } else {
        // Just a background refresh of issues - recompute batches silently
        // Don't change selection on background refreshes to prevent flickering
        store.computeBatchesForEpic(filters.epicId);
      }
    } else {
      prevEpicIdRef.current = null;
    }
  }, [filters.epicId]); // Removed 'issues' dependency to prevent flickering on real-time updates

  // Handle card click - select the task to show details
  const handleCardClick = useCallback((issue: Issue) => {
    useBeadsStore.getState().selectEpic(issue);
  }, []);

  // Handle batch toggle
  const handleToggleBatch = useCallback((batchNumber: number) => {
    useBeadsStore.getState().toggleBatchCollapse(batchNumber);
  }, []);

  // Get unique values for filters
  const allTypes = [...new Set(issues.map((i) => i.issue_type))];
  const allLabels = [...new Set(issues.flatMap((i) => i.labels || []))];

  if (isLoading && issues.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading issues...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-950/50 border border-red-900 rounded-lg p-4">
          <h3 className="font-medium text-red-300 mb-1">Error loading issues</h3>
          <p className="text-red-400 text-sm">{error}</p>
          <p className="text-sm text-red-400 mt-2">
            Make sure beads is initialized in your project directory with{' '}
            <code className="bg-red-900/50 px-1 rounded text-red-300">bd init</code>
          </p>
          <button
            onClick={() => useBeadsStore.getState().fetchIssues()}
            className="mt-3 px-3 py-1.5 bg-red-900/50 hover:bg-red-900 text-red-300 rounded text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Filters */}
      <KanbanFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        types={allTypes}
        labels={allLabels}
        isLoading={isLoading || isLoadingBatches}
        onRefresh={() => {
          const store = useBeadsStore.getState();
          store.fetchIssues();
          if (filters.epicId) {
            store.fetchIssuesWithDeps().then(() => {
              store.computeBatchesForEpic(filters.epicId!);
            });
          }
        }}
      />

      {/* Board content */}
      <div className="flex-1 overflow-hidden">
        {filters.epicId ? (
          // Batch swimlane view with epic header
          <>
            <EpicInfoHeader epicId={filters.epicId} />
            <BatchGrid
              batches={batches}
              collapsedBatches={collapsedBatches}
              onToggleBatch={handleToggleBatch}
              onCardClick={handleCardClick}
              selectedTaskId={selectedEpic?.id}
              isLoading={isLoadingBatches}
            />
          </>
        ) : (
          // No epic selected - prompt to select one
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                <Layers className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-200 mb-2">
                Select an Epic
              </h3>
              <p className="text-slate-400 text-sm">
                Choose an epic from the sidebar to view its tasks organized by execution batch.
                Tasks are automatically grouped based on their dependencies.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
