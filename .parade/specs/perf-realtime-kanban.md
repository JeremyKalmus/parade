# Spec: Real-time Kanban Performance

**Brief**: Improve Kanban board responsiveness to feel "real-time" when beads data changes

**Status**: approved
**Complexity**: standard
**Epic ID**: customTaskTracker-c94

---

## Problem Statement

The Kanban board feels choppy and doesn't update in real-time when `.beads/` files change. Users must manually refresh or navigate away to see updates.

**Root cause**: The `beadsStore` doesn't subscribe to file change events, unlike `discoveryStore` which does.

---

## Proposed Solution

### Task 1: Add beads event subscription to beadsStore

Add `subscribeToChanges()` method to `beadsStore.ts` following the pattern in `discoveryStore.ts`.

**Files**:
- `src/renderer/store/beadsStore.ts`

**Acceptance criteria**:
- [ ] `subscribeToChanges()` method exists on beadsStore
- [ ] Method subscribes to `window.electron.events.onBeadsChange`
- [ ] On change event, calls `fetchIssues()` and `fetchIssuesWithDeps()` if epic selected
- [ ] Returns unsubscribe function

---

### Task 2: Subscribe to beads changes in KanbanBoard

Call `subscribeToChanges()` in KanbanBoard's useEffect and clean up on unmount.

**Files**:
- `src/renderer/components/kanban/KanbanBoard.tsx`

**Acceptance criteria**:
- [ ] useEffect subscribes on mount
- [ ] Cleanup function calls unsubscribe
- [ ] Board auto-refreshes when `.beads/` files change

---

### Task 3: Reduce debounce latency

Current: 200ms (file watcher) + 300ms (IPC) = 500ms minimum latency.
Target: 100ms + 150ms = 250ms.

**Files**:
- `src/main/services/fileWatcher.ts` (line 58: `debounceMs = 200`)
- `src/main/index.ts` (lines 31-37: debounce 300ms)

**Acceptance criteria**:
- [ ] File watcher debounce reduced to 100ms
- [ ] IPC debounce reduced to 150ms
- [ ] No duplicate events on rapid file changes (test with `bd update` commands)

---

### Task 4: Add loading indicator during refresh

Show subtle loading state when auto-refreshing so users know data is updating.

**Files**:
- `src/renderer/components/kanban/KanbanBoard.tsx`
- `src/renderer/components/kanban/KanbanFilters.tsx`

**Acceptance criteria**:
- [ ] Refresh icon spins or pulses during fetch
- [ ] No jarring flash or layout shift
- [ ] Loading state clears when fetch completes

---

### Task 5: Implement optimistic updates for status changes

Update UI immediately when user changes status, before CLI confirms. Rollback on failure.

**Files**:
- `src/renderer/store/beadsStore.ts`

**Acceptance criteria**:
- [ ] `updateIssueStatus` updates local state BEFORE calling `beads.update()`
- [ ] On success, state already reflects change (no additional update needed)
- [ ] On failure, rollback to previous state and show error toast
- [ ] Ignore file watcher events for issues currently being updated (prevent flicker)

---

## Out of Scope (Future)

- List virtualization for 100+ tasks
- Diffing (only update changed issues on refresh)
- Native macOS FSEvents (would require native module)

---

## Verification

After implementation, test by:
1. Open Parade with a project
2. In another terminal, run `bd update <task-id> --status in_progress`
3. Kanban should update within ~300ms without manual refresh

---

## Dependencies

None — all tasks can run in parallel.
