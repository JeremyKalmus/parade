# Git Commit Strategy

## Overview

This document defines the git workflow for automated feature development. The goal is predictable, conflict-free parallel execution with clean, traceable history.

---

## Branch Architecture

```
main (or develop)
│
├── epic/<epic-id>                    ← Epic integration branch
│   │
│   ├── agent/<task-id>               ← Task work branch (worktree)
│   ├── agent/<task-id>               ← Task work branch (worktree)
│   └── agent/<task-id>               ← Task work branch (worktree)
│
└── epic/<epic-id>                    ← Another epic (if parallel)
```

### Branch Naming

| Branch Type | Pattern | Example |
|-------------|---------|---------|
| Epic integration | `epic/<epic-id>` | `epic/bd-x7y8` |
| Task work | `agent/<task-id>` | `agent/bd-x7y8.3` |

---

## Workflow Phases

### Phase 1: Epic Start

When `/run-tasks` begins for an epic:

```bash
# Create epic integration branch from main
git checkout main
git pull origin main
git checkout -b epic/<epic-id>
git push -u origin epic/<epic-id>
```

This creates a stable base for all task branches.

### Phase 2: Task Execution (Per Batch)

For each task in the batch:

```bash
# Create worktree from epic branch (not main)
git worktree add ../agent-<task-id> -b agent/<task-id> epic/<epic-id>

# Or using bd worktree (handles beads redirect)
bd worktree create agent-<task-id> --branch agent/<task-id> --base epic/<epic-id>
```

### Phase 3: Agent Commits

Agents commit their work with structured messages:

```bash
# Commit format
git commit -m "<task-id>: <imperative summary>

<optional body explaining what and why>

Acceptance-Criteria: <criteria met>
Closes: <task-id>"
```

#### Commit Message Examples

```
bd-x7y8.3: Add experience level picker component

Implements SwiftUI picker with beginner/intermediate/advanced options.
Integrates with AthleteProfile state management.

Acceptance-Criteria: Picker displays three options, selection persists
Closes: bd-x7y8.3
```

```
bd-x7y8.1: Create experience_level column migration

Adds nullable experience_level enum to athletes table.
Includes RLS policy for authenticated users.

Acceptance-Criteria: Migration runs without error, column exists
Closes: bd-x7y8.1
```

#### Commit Frequency

| Task Type | Recommendation |
|-----------|----------------|
| Small tasks (<1 hour) | Single commit at completion |
| Medium tasks | Commit at logical checkpoints |
| Large tasks | Commit frequently, squash on merge |

Agents should commit when:
- A logical unit of work is complete
- Before switching context
- When tests pass for a component
- At task completion (required)

### Phase 4: Task Merge (After Verification)

After successful verification, merge task back to epic branch:

```bash
# Switch to epic branch
git checkout epic/<epic-id>

# Squash merge (recommended for clean history)
git merge agent/<task-id> --squash
git commit -m "<task-id>: <task title>

<summary of changes>

Reviewed-by: orchestrator
Verified: <verification result>"

# Cleanup
git worktree remove ../agent-<task-id>
git branch -D agent/<task-id>
```

#### Why Squash Merge?

- **Clean history**: One commit per task on epic branch
- **Atomic rollback**: Easy to revert a single task
- **Clear traceability**: Commit message references task ID
- **Reduced noise**: Internal agent commits don't clutter history

### Phase 5: Epic Completion

When all tasks are complete and user confirms:

```bash
# Ensure epic branch is up to date
git checkout epic/<epic-id>

# Merge epic to main (with merge commit for visibility)
git checkout main
git pull origin main
git merge epic/<epic-id> --no-ff -m "Merge epic/<epic-id>: <epic title>

Completed tasks:
- <task-id>: <title>
- <task-id>: <title>
- <task-id>: <title>

Closes: <epic-id>"

# Push to remote
git push origin main

# Cleanup epic branch
git branch -d epic/<epic-id>
git push origin --delete epic/<epic-id>
```

---

## Conflict Resolution

### Prevention

The workflow minimizes conflicts through:
1. **Epic branch isolation**: All task branches stem from same base
2. **Task dependencies**: Dependent tasks run sequentially
3. **File ownership**: Tasks should touch different files when possible

### Detection

Before merging task to epic branch:

```bash
# Check for conflicts
git checkout epic/<epic-id>
git merge agent/<task-id> --no-commit --no-ff

# If conflict detected
if [ $? -ne 0 ]; then
    git merge --abort
    # Handle conflict
fi
```

### Resolution Protocol

When conflicts occur:

#### Level 1: Auto-Resolution (Orchestrator)

For simple conflicts (whitespace, imports, adjacent changes):

```bash
# Attempt auto-resolution
git merge agent/<task-id> -X theirs  # Or -X ours based on context

# Verify build/tests still pass
npm run build && npm test
```

#### Level 2: Sequential Re-execution

If auto-resolution fails or is risky:

```bash
# Abort current merge
git merge --abort

# Re-run the conflicting task with updated base
git worktree remove ../agent-<task-id>
git branch -D agent/<task-id>

# Recreate from current epic state
bd worktree create agent-<task-id> --branch agent/<task-id> --base epic/<epic-id>

# Re-spawn agent with note about previous attempt
```

#### Level 3: User Escalation

If conflicts persist or involve architectural decisions:

```
⚠️ Merge conflict detected for <task-id>

Conflicting files:
- src/components/Picker.swift
- src/models/Athlete.swift

Options:
1. Keep changes from <task-id> (discard epic changes)
2. Keep epic changes (re-run task)
3. Manual resolution (pause for user)

Please select an option:
```

---

## Push Strategy

### During Execution

| Event | Push? | Why |
|-------|-------|-----|
| Epic branch created | Yes | Backup, visibility |
| Task merged to epic | Optional | Progress backup |
| Batch complete | Yes | Checkpoint |
| Epic complete | Yes | Final state |

### Push Commands

```bash
# After batch completion (checkpoint)
git push origin epic/<epic-id>

# After epic completion (to main)
git push origin main
git push origin --delete epic/<epic-id>
```

### Remote Sync Settings

Configure in `project.yaml`:

```yaml
git:
  # Push strategy: 'batch' | 'task' | 'epic' | 'manual'
  push_frequency: batch

  # Auto-push epic branch for backup
  push_epic_branch: true

  # Delete remote epic branch after merge
  cleanup_remote_branches: true

  # Require pull before epic start
  pull_before_epic: true
```

---

## Rollback Procedures

### Rollback Single Task

If a merged task causes issues:

```bash
# Find the squash commit
git log --oneline epic/<epic-id>

# Revert the specific task commit
git revert <commit-hash> -m 1

# Re-open task in beads
bd reopen <task-id>
bd update <task-id> --notes "Reverted due to: <reason>"
```

### Rollback Entire Epic

If epic needs to be abandoned:

```bash
# Switch to main
git checkout main

# Delete epic branch (local and remote)
git branch -D epic/<epic-id>
git push origin --delete epic/<epic-id>

# Clean up any remaining worktrees
bd worktree list | grep "agent-" | xargs -I {} bd worktree remove {}

# Update beads
bd update <epic-id> --status blocked --notes "Epic abandoned: <reason>"
```

### Recovery from Failed Merge to Main

If main is broken after epic merge:

```bash
# Revert the merge commit
git revert -m 1 <merge-commit-hash>
git push origin main

# Epic branch should still exist if cleanup hasn't run
# Re-work and re-merge when ready
```

---

## Commit Hooks

Recommended git hooks for the workflow:

### pre-commit (Agent Worktrees)

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Ensure task ID in commit message
TASK_ID=$(git rev-parse --abbrev-ref HEAD | sed 's/agent\///')
if ! grep -q "$TASK_ID" "$1"; then
    echo "Commit message must reference task: $TASK_ID"
    exit 1
fi

# Run linter
npm run lint --fix
```

### commit-msg

```bash
#!/bin/bash
# .git/hooks/commit-msg

# Validate commit message format
if ! grep -qE "^bd-[a-z0-9]+\.[0-9]+:" "$1"; then
    echo "Commit message must start with task ID (e.g., bd-x7y8.3: ...)"
    exit 1
fi
```

---

## Summary: Complete Git Flow

```
1. EPIC START
   main → epic/<epic-id> (branch + push)

2. BATCH SETUP
   epic/<epic-id> → agent/<task-id> (worktree per task)

3. AGENT WORK
   Agent commits to agent/<task-id>
   Format: "<task-id>: <summary>"

4. TASK MERGE
   agent/<task-id> → epic/<epic-id> (squash merge)
   Cleanup worktree and branch

5. BATCH COMPLETE
   Push epic/<epic-id> (checkpoint)

6. REPEAT
   Steps 2-5 for each batch

7. EPIC COMPLETE
   epic/<epic-id> → main (--no-ff merge)
   Push main, cleanup epic branch

8. DONE
   Clean history with one commit per task,
   one merge commit per epic
```

---

## Example: Full Epic History

After completing an epic, `git log --oneline main` shows:

```
a1b2c3d Merge epic/bd-x7y8: Athlete Experience Level Tracking
│
├── f4e5d6c bd-x7y8.5: Add E2E tests for experience flow
├── 9g8h7i6 bd-x7y8.4: Integrate picker with plan generation
├── j5k4l3m bd-x7y8.3: Create experience level picker UI
├── n2o1p0q bd-x7y8.2: Implement assessment edge function
└── r9s8t7u bd-x7y8.1: Add experience_level database column

previous commits...
```

Each task is a single squashed commit, epic is a merge commit for easy identification and rollback.
