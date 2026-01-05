---
name: run-tasks
description: Orchestrate task execution via beads and sub-agents. Gets ready work from beads, spawns appropriate agents based on labels, monitors completion, and updates status. Use after /approve-spec has created tasks.
---

# Run Tasks Skill

## Purpose

Execute implementation tasks through coordinated sub-agents with optional TDD workflow:
1. Get ready work from beads (no blockers)
2. Check TDD configuration and enforce test-first gating if enabled
3. Group tasks for parallel execution (with git worktree isolation)
4. Spawn agents based on `agent:*` labels
5. Monitor completion and run verification
6. Handle failures with debug loop (TDD mode) or blocking
7. Update beads status and merge completed work
8. **Repeat until truly done** (stop hook prevents premature exit)

**Key guarantee**: The stop hook ensures ALL tasks complete before exit. Claude queries beads state each cycle rather than tracking in context, enabling token-efficient persistence.

## When to Use

- After `/approve-spec` has created tasks
- User says "run tasks", "start implementation", "execute"
- There are open tasks in beads

## Arguments

```
/run-tasks [epic-id]       # Run tasks for specific epic
/run-tasks                  # Run all ready tasks
```

---

## Process Overview

### Step 0a: Path Detection

Determine the location of discovery.db to support both new `.parade/` structure and legacy project root:

```bash
# Path detection for .parade/ structure
if [ -f ".parade/discovery.db" ]; then
  DISCOVERY_DB=".parade/discovery.db"
else
  DISCOVERY_DB="./discovery.db"
fi
```

All subsequent database operations in this skill use `$DISCOVERY_DB` instead of hardcoded `discovery.db`.

### Step 0b: Check TDD Configuration

Before starting task execution, check if TDD is enabled:

```bash
cat project.yaml | grep -A 1 "workflow:"
```

If `tdd_enabled: true`, enforce test-first gating workflow (see [TDD Protocol](./docs/tdd-protocol.md)).
If `tdd_enabled: false`, use standard workflow without gating.

### Step 0a: Git Setup (Epic Branch)

Create an epic integration branch to isolate all work for this epic:

```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Create epic branch
git checkout -b epic/<epic-id>
git push -u origin epic/<epic-id>
```

All task branches will be created from this epic branch, enabling:
- Clean parallel execution without affecting main
- Atomic epic-level rollback if needed
- Single merge commit when epic completes

See [Git Strategy](./docs/git-strategy.md) for complete branching and commit workflow.

### Step 1: Get Ready Work

```bash
bd ready --json
```

This returns tasks that:
- Have status `open`
- Have no blocking dependencies (or all blockers are closed)

If epic-id is provided, filter:
```bash
bd list --parent <epic-id> --status open --json
```

### Step 1a: Apply TDD Gating (if tdd_enabled)

For each ready task, check metadata and labels:

```bash
bd show <task-id> --json
```

**TDD Gating Rules:**
- If task has `skip_tests` label → ALLOW immediately (no TDD gating)
- If task has `test_task_id` metadata and test task is NOT closed → EXCLUDE from ready batch
- Test tasks (those without test_task_id) can run immediately
- Implementation tasks wait for their test tasks to close (RED phase verified)

See [TDD Protocol](./docs/tdd-protocol.md) for complete gating details.

### Step 2: Identify Parallel Batches

Tasks can run in parallel if they don't depend on each other.

**CRITICAL: Apply batch size limit to prevent context overflow.**

```bash
# Check project config for max parallel tasks (default: 3)
MAX_PARALLEL=$(grep -A1 "workflow:" project.yaml | grep "max_parallel_tasks:" | awk '{print $2}')
MAX_PARALLEL=${MAX_PARALLEL:-3}
```

From the ready work, group tasks with size limit:
- **Sub-batch 1**: First MAX_PARALLEL ready tasks
- **Sub-batch 2**: Next MAX_PARALLEL ready tasks
- Continue until all ready tasks are batched

**Why this matters**: Each agent returns ~2-3K tokens. Running 8+ agents in parallel returns 16-24K tokens simultaneously, overwhelming context and preventing compaction.

Example with MAX_PARALLEL=3:
```
Ready now (8 tasks):
- bd-x7y8.1 [agent:sql]
- bd-x7y8.2 [agent:swift]
- bd-x7y8.3 [agent:typescript]
- bd-x7y8.4 [agent:typescript]
- bd-x7y8.5 [agent:sql]
- bd-x7y8.6 [agent:swift]
- bd-x7y8.7 [agent:typescript]
- bd-x7y8.8 [agent:test]

Split into sub-batches:
- Sub-batch 1: [.1, .2, .3] → execute, wait, collect telemetry
- Sub-batch 2: [.4, .5, .6] → execute, wait, collect telemetry
- Sub-batch 3: [.7, .8] → execute, wait, collect telemetry
```

**Execution pattern**:
1. Spawn sub-batch agents in parallel
2. Wait for ALL agents in sub-batch to complete
3. Capture telemetry for each (see Step 4a)
4. Proceed to next sub-batch
5. After all sub-batches: check for newly unblocked tasks

### Step 3: Spawn Agents for Batch

For each task in the current batch:

1. **Get task details:**
```bash
bd show <task-id> --json
```

2. **Identify agent from labels:**
Look for `agent:*` label (e.g., `agent:swift`, `agent:sql`, `agent:test`)

3. **Create output directory:**
```bash
# Ensure the epic folder exists
mkdir -p docs/features/<epic-id>
```

The output path pattern is: `docs/features/<epic-id>/<task-id>.md`

4. **Create worktrees for parallel isolation (multi-task batches):**
```bash
# Create isolated worktree from epic branch
bd worktree create agent-<task-id> --branch agent/<task-id> --base epic/<epic-id>
```

5. **Update epic status (first batch only):**
```bash
bd update <epic-id> --status in_progress
```

6. **Update task status:**
```bash
bd update <task-id> --status in_progress
```

7. **Spawn appropriate agent:**

See [Agent Spawning Reference](./docs/agent-spawning.md) for:
- Agent type mapping
- Prompt templates for each agent (including output path specification)
- Git worktree isolation for parallel execution
- Parallel execution using `run_in_background: true`

### Step 4: Collect Results

Wait for all agents in batch to complete.

For each agent result:
- **PASS**: Continue to verification
- **FAIL**: Handle based on task type and mode

### Step 4a: Capture Telemetry (REQUIRED)

**After each agent completes, IMMEDIATELY capture telemetry to discovery.db.**

This is critical for retrospective analysis and debugging workflow issues.

1. **Parse agent output** - Look for compact JSON on last line:
```json
{"s":"s","t":1200,"m":["src/file.ts"],"c":["src/new.ts"]}
```

2. **Record to database** - Execute this SQL for EACH completed agent:
```sql
INSERT INTO agent_telemetry (
  id, task_id, epic_id, agent_type, status, token_count,
  duration_ms, files_modified, files_created, error_type,
  error_summary, debug_attempts, started_at, completed_at
) VALUES (
  'tel-' || hex(randomblob(4)),  -- Generate unique ID
  '<task-id>',
  '<epic-id>',
  '<agent-type>',                 -- e.g., 'typescript', 'swift', 'sql'
  CASE '<status>' WHEN 's' THEN 'PASS' WHEN 'f' THEN 'FAIL' ELSE 'UNKNOWN' END,
  <token_count>,                  -- From 't' field in JSON
  <duration_ms>,                  -- Calculate from start/end time
  '<files_modified_json>',        -- From 'm' field
  '<files_created_json>',         -- From 'c' field
  '<error_type>',                 -- From 'e' field if present
  '<error_summary>',              -- From 'x' field if present
  0,                              -- debug_attempts (increment on retries)
  '<started_at>',
  datetime('now')
);
```

3. **Compact Output Key Reference**:
| Key | Meaning | Values |
|-----|---------|--------|
| `s` | status | `"s"` (success), `"f"` (fail), `"b"` (blocked) |
| `t` | tokens | estimated token count used |
| `m` | modified | array of modified file paths |
| `c` | created | array of created file paths |
| `e` | error | `"t"` (test), `"b"` (build), `"o"` (timeout) |
| `x` | error msg | truncated error message (max 200 chars) |

**If agent output lacks JSON**: Record with status='UNKNOWN', token_count=NULL. This indicates agents need prompt updates.

### Step 5: Run Verification

#### Standard Mode

When agent reports completion, verify acceptance criteria are met:

1. **Run verification commands** (from acceptance criteria if specified)
2. **Check output** for success/failure indicators
3. **Update status** based on results

#### TDD Mode - RED Phase (Test Tasks)

When test-writer-agent reports completion:

1. **Verify tests exist**
2. **Run tests and verify they FAIL**
3. **Expected outcome**: Tests should fail with "not implemented" errors
4. **RED Phase Validation**:
   - If tests fail correctly: Close test task, unblock implementation task
   - If tests pass (wrong!): Mark test task as blocked
   - If syntax errors: Spawn test-writer-agent again to fix

```bash
# On successful RED phase
bd close <test-task-id>
```

#### TDD Mode - GREEN Phase (Implementation Tasks)

When implementation agent reports completion:

1. **Run test suite**
2. **Expected outcome**: Tests should PASS
3. **GREEN Phase Validation**:
   - If tests PASS: Close implementation task
   - If tests FAIL: Enter debug loop

See [TDD Protocol](./docs/tdd-protocol.md) for complete RED/GREEN/DEBUG phase details.

### Step 5a: Debug Loop (TDD Mode)

When implementation tests fail, enter debug loop:

1. **Initialize debug tracking**: Add `debug_attempts` metadata
2. **Spawn debug-agent** with failure context
3. **After debug-agent completes**:
   - PASS: Tests now pass → Close task
   - FAIL: Increment attempts, check limit
4. **Max 3 attempts** with sub-agent before escalating

**Hybrid approach (token-optimized):**
- Attempts 1-2: Spawn debug-agent (fresh context, cheaper)
- Attempt 3+: Switch to Ralph loop (iterative, more thorough)

```python
def smart_debug(task, test_output):
    # Try sub-agent first (cheaper)
    for attempt in range(2):
        result = spawn_debug_agent(task, test_output)
        if result.success:
            return result

    # Fall back to Ralph for persistent issues
    if config.ralph.use_for_debug:
        return debug_with_ralph(task, max_iterations=10)
    else:
        bd_update(task.id, status='blocked')
```

See [TDD Protocol](./docs/tdd-protocol.md#debug-phase-test-failure-resolution) and [Ralph Integration](./docs/ralph-integration.md) for details.

### Step 6: Update Beads Status

#### Success Cases

```bash
# Standard success
bd close <task-id>

# Test task success (RED phase)
bd close <test-task-id>  # Unblocks implementation task

# Implementation task success (GREEN phase)
bd close <impl-task-id>
```

#### Failure Cases

```bash
# Test task: tests pass without implementation (bad)
bd update <test-task-id> --status blocked --notes "Tests pass without implementation"

# Implementation task: debug attempts exhausted
bd update <impl-task-id> --status blocked --notes "Test failures persist after 3 attempts"

# Mark epic as blocked when any task fails
bd update <epic-id> --status blocked
```

#### Blocker Resolution

When a blocker is resolved and work continues:
```bash
bd update <epic-id> --status in_progress
```

### Step 7: Log Progress

#### Standard Mode
```
## Batch 1 Complete

✅ bd-x7y8.1: Database schema - PASS (closed)
✅ bd-x7y8.3: Experience picker UI - PASS (closed)

Newly unblocked:
- bd-x7y8.2: Assessment edge function [agent:typescript]

Proceeding to Batch 2...
```

#### TDD Mode
```
## Batch 1 Complete (Test Phase)

✅ bd-x7y8.1: Write database tests - RED PHASE PASS (closed)
✅ bd-x7y8.3: Write picker UI tests - RED PHASE PASS (closed)

Newly unblocked (Implementation Phase):
- bd-x7y8.2: Implement database schema [agent:sql]
- bd-x7y8.4: Implement picker UI [agent:swift]

Proceeding to Batch 2 (Implementation)...
```

See [TDD Protocol - Progress Logging](./docs/tdd-protocol.md#progress-logging) for complete examples.

### Step 8: Repeat

Check for new ready work:
```bash
bd ready --json
```

If tasks remain, return to Step 2.

### Step 9: Completion Summary

When no more ready work:

#### Standard Mode
```
## Execution Complete

Epic: bd-x7y8 - Feature Name

Completed:
✅ bd-x7y8.1: Task 1
✅ bd-x7y8.2: Task 2
✅ bd-x7y8.3: Task 3

All tasks closed. Feature ready for review.
```

#### TDD Mode
```
## Execution Complete (TDD Mode)

Epic: bd-x7y8 - Feature Name

Test Phase (RED):
✅ bd-x7y8.1: Write tests - RED PASS
✅ bd-x7y8.3: Write tests - RED PASS

Implementation Phase (GREEN):
✅ bd-x7y8.2: Implementation - GREEN PASS
✅ bd-x7y8.4: Implementation - GREEN PASS (1 debug attempt)

Debug Summary:
- Total debug sessions: 1
- Successful fixes: 1
- Patterns documented: 1

All tasks closed. Feature ready for review.
```

### Step 10: Epic Completion Check

When no more ready work AND all child tasks are closed:

**Step 10a: Check for evolutions**

Before presenting options, run evolution detection:

```bash
# Analyze git diff for new additions
git diff main...HEAD --name-only | wc -l

# Quick check for new exports (components, types, patterns)
git diff main...HEAD -- "src/renderer/**/*.tsx" | grep -c "^+export" || echo 0
git diff main...HEAD -- "src/shared/types/**/*.ts" | grep -c "^+export" || echo 0
```

**Step 10b: Present options to user:**
```
All tasks for "<epic-title>" are complete.

Completed: X tasks
Blocked: Y tasks (if any)
Debug loops: Z
New additions detected: N (components, fields, patterns)

Options:
1. Merge and close epic
2. Capture evolutions and close (recommended if new additions > 0)
3. Run retrospective + evolutions (recommended if debug loops > 0)
4. Keep open for manual review
```

**Option 1: Merge and close:**

1. **Merge epic branch to main:**
```bash
git checkout main
git pull origin main
git merge epic/<epic-id> --no-ff -m "Merge epic/<epic-id>: <epic-title>

Completed tasks:
- <task-id>: <title>
- <task-id>: <title>

Closes: <epic-id>"
```

2. **Push to remote:**
```bash
git push origin main
```

3. **Cleanup epic branch:**
```bash
git branch -d epic/<epic-id>
git push origin --delete epic/<epic-id>
```

4. **Close epic in beads:**
```bash
bd close <epic-id>
```

5. **Update brief status in discovery.db:**
```bash
sqlite3 "$DISCOVERY_DB" "UPDATE briefs SET status = 'completed', updated_at = datetime('now') WHERE exported_epic_id = '<epic-id>';"
```

**Option 2: Capture evolutions and close:**

Before merge, invoke the evolution skill:

1. **Invoke `/evolve <epic-id>` skill** - detects new components, fields, and patterns
2. **Review and approve** additions to design registries
3. **Then proceed with merge and close** (Option 1 steps 1-5, including brief status update)

See [Evolve Skill](../evolve/SKILL.md) for evolution capture process.

**Option 3: Retrospective + evolutions:**

For epics with both debug loops AND new additions:

1. **Invoke `/retro <epic-id>` skill** - handles failure analysis, recommendations, and archiving
2. **Invoke `/evolve <epic-id>` skill** - captures positive evolutions
3. **Then proceed with merge and close** (Option 1 steps 1-5, including brief status update)

This captures both lessons learned (from failures) and knowledge gained (from new patterns).

See [Retro Skill](../retro/SKILL.md) and [Evolve Skill](../evolve/SKILL.md) for details.

**Option 4: Keep open:**
Leave epic as `in_progress` on its branch for further review or manual testing.

See [Git Strategy](./docs/git-strategy.md) for rollback procedures if issues are discovered after merge.

---

## Core Orchestration Logic

### Get Ready Work with Gating

```python
def get_ready_work(epic_id=None, tdd_enabled=False):
    # Get base ready work from beads
    if epic_id:
        tasks = bd_list(parent=epic_id, status='open')
    else:
        tasks = bd_ready()

    if not tdd_enabled:
        return tasks

    # Apply TDD gating
    ready = []
    for task in tasks:
        # Skip tests label bypasses gating
        if 'skip_tests' in task.labels:
            ready.append(task)
            continue

        # Test tasks can run immediately
        if 'test_task_id' not in task.metadata:
            ready.append(task)
            continue

        # Implementation tasks wait for test task to close
        test_task_id = task.metadata['test_task_id']
        test_task = bd_show(test_task_id)
        if test_task.status == 'closed':
            ready.append(task)

    return ready
```

### Execute Batch

```python
def execute_batch(tasks, epic_id, tdd_enabled=False):
    results = []
    worktrees = {}

    # Create output directories for all tasks
    run(f"mkdir -p docs/features/{epic_id}")

    # Create worktrees from epic branch (multi-task batches)
    if len(tasks) > 1:
        for task in tasks:
            worktree_name = f"agent-{task.id}"
            run(f"bd worktree create {worktree_name} --branch agent/{task.id} --base epic/{epic_id}")
            worktrees[task.id] = worktree_name

    # Spawn all agents in parallel
    for task in tasks:
        agent = select_agent(task)  # See agent-spawning.md
        bd_update(task.id, status='in_progress')

        # Spawn with background=true, include worktree path and output path
        working_dir = f"../{worktrees[task.id]}" if task.id in worktrees else None
        output_path = f"docs/features/{epic_id}/{task.id}.md"
        result = spawn_agent(agent, task, working_dir=working_dir,
                           output_path=output_path, background=True)
        results.append((task, result))

    # Wait for all to complete
    for task, result in results:
        if result.status == 'PASS':
            verify_and_close(task, tdd_enabled)
            # Squash merge to epic branch and cleanup
            if task.id in worktrees:
                run(f"git checkout epic/{epic_id}")
                run(f"git merge agent/{task.id} --squash")
                run(f"git commit -m '{task.id}: {task.title}'")
                run(f"bd worktree remove {worktrees[task.id]}")
                run(f"git branch -D agent/{task.id}")
        else:
            handle_failure(task, result, tdd_enabled)
            # Keep worktree for debugging if failure

    # Push checkpoint after batch completes
    run(f"git push origin epic/{epic_id}")
```

### Verify and Close

```python
def verify_and_close(task, tdd_enabled):
    if not tdd_enabled:
        # Standard mode: just close
        bd_close(task.id)
        return

    # TDD mode: verify phase
    if 'agent:test' in task.labels:
        # RED phase: verify tests fail
        if verify_tests_fail(task):
            bd_close(task.id)  # Unblocks impl task
        else:
            bd_update(task.id, status='blocked',
                     notes='Tests pass without implementation')
    else:
        # GREEN phase: verify tests pass
        if verify_tests_pass(task):
            bd_close(task.id)
        else:
            enter_debug_loop(task)  # See tdd-protocol.md
```

---

## Reference Documentation

### TDD Protocol
See [docs/tdd-protocol.md](./docs/tdd-protocol.md) for:
- Complete RED/GREEN/DEBUG workflow
- Task metadata structures
- Skip tests label usage
- Execution order examples
- Failure handling in TDD mode

### Agent Spawning
See [docs/agent-spawning.md](./docs/agent-spawning.md) for:
- Agent type mapping table
- Prompt templates for each agent type
- Git worktree isolation for parallel execution
- Parallel execution strategies
- Result collection and handling
- Progress logging examples

### Git Strategy
See [docs/git-strategy.md](./docs/git-strategy.md) for:
- Branch architecture (epic → task branches)
- Commit message format and conventions
- Squash merge workflow for clean history
- Conflict resolution protocol
- Push strategy and checkpoints
- Rollback procedures (task and epic level)

### Stop Hook Enforcement
See [docs/stop-hook-enforcement.md](./docs/stop-hook-enforcement.md) for:
- Preventing premature exit from task execution
- Completion promise patterns
- Token-optimized orchestration prompts
- Beads-based completion detection
- Edge case handling (context limits, stuck tasks)

### Ralph Loops (Optional)
See [docs/ralph-integration.md](./docs/ralph-integration.md) for:
- Iterative debugging with Ralph loops
- When to use Ralph vs sub-agents for bug fixes
- Token optimization for iteration cycles

### Retrospective & Improvement
See [docs/retrospective.md](./docs/retrospective.md) for:
- Execution metrics capture during `/run-tasks`
- Post-epic analysis and recommendations
- Accumulated insights across epics
- Self-improving workflow patterns

---

## Output

After successful execution:
- All completable tasks are closed in beads
- Blocked tasks are marked with reasons
- User has summary of what was done
- Parade app shows updated status
- Debug knowledge base updated (TDD mode)
