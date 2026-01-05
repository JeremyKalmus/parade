# Spec: Worktree Visibility in Parade UI

**Brief**: Show git worktree/branch info in the UI so users understand which features are on which worktree

**Status**: review
**Complexity**: standard
**Epic ID**: (pending approval)

---

## Problem Statement

The `/run-tasks` workflow creates epic branches (`epic/<epic-id>`) and task worktrees (`agent/<task-id>`), but this is completely invisible in the Parade UI. Users can't see:
- Which branch an epic is on
- Whether task worktrees are active
- The overall development status of a feature

This makes it hard to understand what's happening when working on multiple features simultaneously.

---

## Proposed Solution

### Task 1: Add worktreeList method to BeadsService

Add a method to call `bd worktree list --json` and return structured data.

**Files**:
- `src/main/services/beads.ts`
- `src/shared/types/beads.ts` (add Worktree type)

**Acceptance criteria**:
- [ ] `worktreeList()` method returns array of Worktree objects
- [ ] Worktree type includes: name, path, branch, is_main, beads_state
- [ ] Handles errors gracefully (returns empty array on failure)

---

### Task 2: Add IPC handler and preload exposure for worktrees

Wire up the worktree method through Electron's IPC layer.

**Files**:
- `src/main/ipc/handlers.ts`
- `src/preload/preload.ts`
- `src/shared/types/ipc.ts`

**Acceptance criteria**:
- [ ] IPC handler for `beads:worktree-list` channel
- [ ] Preload exposes `window.electron.beads.worktreeList()`
- [ ] TypeScript types are complete

**Dependencies**: Task 1

---

### Task 3: Add worktree state to beadsStore

Add worktree slice to the existing beadsStore with real-time subscription.

**Files**:
- `src/renderer/store/beadsStore.ts`

**Acceptance criteria**:
- [ ] `worktrees: Worktree[]` state field
- [ ] `fetchWorktrees()` action
- [ ] Subscription updates worktrees on file changes (alongside existing beads subscription)
- [ ] `getEpicWorktree(epicId)` selector to find worktree for a specific epic

**Dependencies**: Task 2

---

### Task 4: Add Development Status section to EpicDetailPanel

Show worktree/branch info in the epic detail sidebar.

**Files**:
- `src/renderer/components/kanban/EpicDetailPanel.tsx`

**Acceptance criteria**:
- [ ] New "Development" section between Labels and Description
- [ ] Shows epic branch name (e.g., `epic/bd-abc123`) with GitBranch icon
- [ ] Shows worktree path if active
- [ ] Shows "No branch yet" if epic branch doesn't exist
- [ ] Uses existing Badge and Card components from design registry

**Dependencies**: Task 3

---

### Task 5: Add Epic Info Header above swimlanes

Create a new component showing epic overview above the BatchGrid.

**Files**:
- `src/renderer/components/kanban/EpicInfoHeader.tsx` (new)
- `src/renderer/components/kanban/KanbanBoard.tsx`

**Acceptance criteria**:
- [ ] Shows epic title and ID
- [ ] Shows worktree/branch indicator badge
- [ ] Shows task completion progress (X of Y complete)
- [ ] Link to brief in discovery.db (if exists)
- [ ] Compact horizontal layout, doesn't take too much vertical space

**Dependencies**: Task 3

---

### Task 6: Update close-up checklist with auto-merge step

Ensure the epic close-up process includes merging the worktree back.

**Files**:
- `.claude/skills/approve-spec/docs/closeup-checklist.md`
- `.claude/skills/run-tasks/docs/git-strategy.md`

**Acceptance criteria**:
- [ ] Close-up checklist includes "Merge epic branch to main" step
- [ ] Documents auto-merge behavior (attempt merge, prompt on conflicts)
- [ ] Clear instructions for handling merge conflicts
- [ ] Cleanup steps: remove worktree, delete epic branch

**Dependencies**: None (documentation task)

---

## Design Notes

**Existing Patterns Used**:
- Zustand Store Pattern (beadsStore extension)
- IPC Handler Pattern (handlers.ts)
- Preload API Pattern (preload.ts)
- Badge component for status indicators
- Card component for sections

**New Components**:
- `EpicInfoHeader` - Compact header showing epic overview above swimlanes

**Data Flow**:
```
bd worktree list --json
    ↓
BeadsService.worktreeList()
    ↓
IPC: beads:worktree-list
    ↓
beadsStore.fetchWorktrees()
    ↓
EpicDetailPanel / EpicInfoHeader (consume state)
```

---

## Out of Scope

- Creating/removing worktrees from UI (use terminal or Claude Code)
- Showing worktrees for closed epics
- Git diff or commit history visualization

---

## Verification

After implementation, test by:
1. Create an epic branch: `git checkout -b epic/test-epic`
2. Open Parade and select an epic
3. Verify "Development" section shows the branch
4. Create a worktree: `bd worktree create test-task --branch agent/test-task`
5. Verify EpicInfoHeader shows worktree indicator
6. Remove worktree and verify UI updates in real-time

