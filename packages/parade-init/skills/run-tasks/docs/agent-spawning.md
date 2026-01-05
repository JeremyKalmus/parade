# Agent Spawning Reference

## Overview

This document defines the agent spawning protocol for the run-tasks skill, including agent type mapping, prompt templates, and parallel execution strategies.

---

## Minimal Context Principle

Provide agents with:
- Task ID and title
- Description from beads
- Acceptance criteria
- Pointer to relevant files (they read themselves)

DO NOT provide:
- Full implementation details
- Code snippets
- Decisions they should make themselves

---

## Agent Type Mapping

| Label | Agent | Typical Tasks | TDD Role | Skip Tests? |
|-------|-------|---------------|----------|-------------|
| `agent:sql` | sql-agent | Migrations, RLS, database | Implementation | Often yes (use `skip_tests` label) |
| `agent:typescript` | typescript-agent | Edge functions, API, backend | Implementation | No |
| `agent:swift` | swift-agent | iOS, SwiftUI, services | Implementation | No |
| `agent:test` | test-writer-agent (TDD) / test-agent (standard) | Test writing, verification | RED phase | N/A (is the test) |
| `agent:context-builder` | context-builder | Research, investigation | N/A | Yes (use `skip_tests` label) |
| N/A | debug-agent | Test failure resolution | GREEN phase debugging | N/A |

**Note:** Add `skip_tests` label to bypass TDD gating for tasks that don't need unit tests (schema, config, docs, migrations).

---

## Spawning Process

For each task in the current batch:

### 1. Get task details
```bash
bd show <task-id> --json
```

### 2. Identify agent from labels
Look for `agent:*` label (e.g., `agent:swift`, `agent:sql`, `agent:test`)

### 3. Create output directory
```bash
# Ensure the epic folder exists
mkdir -p docs/features/<epic-id>
```

The output path pattern is: `docs/features/<epic-id>/<task-id>.md`
- Example: `docs/features/customTaskTracker-xbi/xbi.3.md`

### 4. Update epic status (first batch only)
```bash
# When first task starts, move epic to in_progress
bd update <epic-id> --status in_progress
```

### 5. Update task status
```bash
bd update <task-id> --status in_progress
```

### 6. Spawn appropriate agent
See prompt templates below for each agent type.

---

## Agent Prompt Templates

### Test Writer Agent (TDD Mode)

For tasks with label `agent:test`:

```
Spawning test-writer-agent for <task-id>...

---
Task: <task-id> - <title>

Description: <from beads>

Acceptance Criteria:
<from beads>

Output Location: docs/features/<epic-id>/<task-id>.md
Write any detailed findings, decisions, or artifacts to this file.

Your job:
1. Write comprehensive test cases covering all acceptance criteria
2. Ensure tests FAIL (RED phase) before implementation exists
3. Report test file location and failure output

When complete, report:
TEST WRITER REPORT with Status: PASS (tests fail correctly) or FAIL
---
```

### Implementation Agent (Standard/TDD GREEN Phase)

For tasks with labels like `agent:swift`, `agent:typescript`, `agent:sql`:

```
Spawning <agent-type> for <task-id>...

---
Task: <task-id> - <title>

Description: <from beads>

Acceptance Criteria:
<from beads>

Output Location: docs/features/<epic-id>/<task-id>.md
Write any detailed findings, decisions, or artifacts to this file.

Files context: Read relevant files based on task description

When complete:
1. Ensure tests pass (if applicable)
2. Report: PASS or FAIL with brief summary
---
```

### Debug Agent (TDD Mode Only)

For test failures during GREEN phase:

```
Spawning debug-agent for <task-id> (Attempt <N>/3)...

---
Task: <task-id> - <title>

Failed Test Output:
<paste full test failure output>

Implementation Files:
- <files modified by implementation agent>

Test Files:
- <test files from test task>

Output Location: docs/features/<epic-id>/<task-id>.md
Write any detailed findings, decisions, or artifacts to this file.

Max Attempts: 3

Your job:
1. Analyze the test failure
2. Check .claude/debug-knowledge/ for known patterns
3. Apply systematic fix (prefer implementation over test changes)
4. Verify tests pass
5. Document new patterns in debug-knowledge

Report: PASS (tests now pass) or FAIL (still failing)
---
```

### General Agent Template

For any agent type:

```
Task: <task-id> - <title>

<description>

Acceptance Criteria:
<criteria from beads>

Output Location: docs/features/<epic-id>/<task-id>.md
Write any detailed findings, decisions, or artifacts to this file.

Relevant files to examine:
- <inferred from task description>

Your job:
1. Understand the requirements
2. Implement the solution
3. Write/update tests if applicable
4. Verify your changes work

## OUTPUT FORMAT (CRITICAL - Follow exactly)

Your response MUST be minimal to avoid context overflow.

1. Brief summary (2-3 sentences max)
2. On your LAST LINE, output ONLY this compact JSON (no other text on this line):

{"s":"<status>","t":<tokens>,"m":[<modified>],"c":[<created>]}

Where:
- "s": "s" for success, "f" for fail, "b" for blocked
- "t": estimated tokens used (number)
- "m": array of modified file paths
- "c": array of created file paths
- Add "e":"<type>" if failed: "t"=test, "b"=build, "o"=timeout
- Add "x":"<msg>" for error message (max 200 chars)

Example success:
Implemented the user authentication module with JWT tokens. Added tests.
{"s":"s","t":1500,"m":["src/auth.ts","src/auth.test.ts"],"c":["src/middleware/jwt.ts"]}

Example failure:
Build failed due to missing dependency.
{"s":"f","t":800,"m":[],"c":[],"e":"b","x":"Cannot find module 'jsonwebtoken'"}

DO NOT include:
- Full file contents in your response
- Long code blocks
- Verbose explanations
- Anything after the JSON line
```

---

## Git Worktree Isolation

Use git worktrees to isolate each agent's work, preventing file conflicts and enabling true parallel development. Beads has built-in worktree support that automatically shares the `.beads` database across all worktrees.

For complete git workflow including branching, commits, merges, and rollbacks, see [git-strategy.md](./git-strategy.md).

### Why Worktrees?

Without worktrees, parallel agents working in the same directory can cause:
- File conflicts when modifying overlapping files
- Build artifact collisions
- Git operations interfering with each other
- Race conditions in shared state

With worktrees, each agent works in complete isolation with its own branch, all stemming from the epic integration branch.

### Worktree Lifecycle

#### 1. Create Worktrees (Before Spawning Batch)

For each task in the batch, create an isolated worktree from the epic branch:

```bash
# Create worktree from epic branch (not main!)
bd worktree create agent-<task-id> --branch agent/<task-id> --base epic/<epic-id>

# Example for a batch of 3 tasks:
bd worktree create agent-bd-x7y8.1 --branch agent/bd-x7y8.1 --base epic/bd-x7y8
bd worktree create agent-bd-x7y8.3 --branch agent/bd-x7y8.3 --base epic/bd-x7y8
bd worktree create agent-bd-x7y8.6 --branch agent/bd-x7y8.6 --base epic/bd-x7y8
```

Beads automatically:
- Creates the worktree directory (sibling to main repo)
- Sets up a redirect so `.beads` database is shared
- Creates a new branch from the epic branch for the agent's work

#### 2. Spawn Agents with Worktree Path

Include the worktree path in agent prompts:

```
Spawning <agent-type> for <task-id>...

---
Task: <task-id> - <title>

**Working Directory**: ../agent-<task-id>

Description: <from beads>

Acceptance Criteria:
<from beads>

Output Location: docs/features/<epic-id>/<task-id>.md
Write any detailed findings, decisions, or artifacts to this file.

IMPORTANT: You are working in an isolated git worktree.
- All file operations should be relative to ../agent-<task-id>
- Commit your changes to the agent/<task-id> branch
- Do not switch branches

When complete:
1. Commit all changes with message: "<task-id>: <summary>"
2. Report: PASS or FAIL with brief summary
---
```

#### 3. Merge Changes (After Successful Verification)

After a task passes verification, squash merge to the epic branch:

```bash
# Switch to epic branch
git checkout epic/<epic-id>

# Squash merge for clean history (one commit per task)
git merge agent/<task-id> --squash
git commit -m "<task-id>: <task title>

<summary of changes>

Verified: PASS"
```

See [git-strategy.md](./git-strategy.md) for commit message format and conventions.

#### 4. Cleanup Worktree

After merge (or if task is blocked/abandoned):

```bash
# Remove the worktree
bd worktree remove agent-<task-id>

# Delete the branch (after successful merge)
git branch -d agent/<task-id>

# Force delete if not merged (blocked/abandoned)
git branch -D agent/<task-id>
```

### When to Use Worktrees

**Use worktrees when:**
- Batch has 2+ tasks that might touch overlapping files
- Tasks modify build configuration or shared dependencies
- Long-running tasks that might conflict with other work

**Skip worktrees when:**
- Single task in batch (no conflict risk)
- Read-only tasks (context-builder, research)
- Tasks with `skip_worktree` label
- Quick tasks that complete in seconds

### Worktree Directory Structure

```
parent-directory/
├── main-repo/              ← orchestrator runs here
│   ├── .beads/             ← shared database
│   ├── src/
│   └── ...
├── agent-bd-x7y8.1/        ← sql-agent worktree
│   ├── .beads              ← redirect file (not directory)
│   └── ...
├── agent-bd-x7y8.3/        ← swift-agent worktree
│   └── ...
└── agent-bd-x7y8.6/        ← typescript-agent worktree
    └── ...
```

### Complete Batch Workflow with Worktrees

```python
def execute_batch_with_worktrees(tasks, epic_id):
    worktrees = []

    # 1. Create worktrees from epic branch
    for task in tasks:
        worktree_name = f"agent-{task.id}"
        run(f"bd worktree create {worktree_name} --branch agent/{task.id} --base epic/{epic_id}")
        worktrees.append((task, worktree_name))

    # 2. Spawn agents with worktree paths
    results = []
    for task, worktree in worktrees:
        agent = select_agent(task)
        bd_update(task.id, status='in_progress')
        result = spawn_agent(agent, task,
                            working_dir=f"../{worktree}",
                            background=True)
        results.append((task, worktree, result))

    # 3. Wait and process results
    for task, worktree, result in results:
        if result.status == 'PASS' and verify_task(task):
            # Squash merge to epic branch (not main)
            run(f"git checkout epic/{epic_id}")
            run(f"git merge agent/{task.id} --squash")
            run(f"git commit -m '{task.id}: {task.title}'")
            bd_close(task.id)
            # Cleanup
            run(f"bd worktree remove {worktree}")
            run(f"git branch -D agent/{task.id}")
        else:
            # Keep worktree for debugging
            bd_update(task.id, status='blocked',
                     notes=f"Worktree preserved at ../{worktree}")

    # 4. Push checkpoint after batch
    run(f"git push origin epic/{epic_id}")
```

---

## Parallel Execution

Use Claude's Task tool with `run_in_background: true` for parallel batches:

### Launching a batch (with worktrees)

```
Setting up worktrees for Batch 1 (3 tasks):
✓ Created agent-bd-x7y8.1 (branch: agent/bd-x7y8.1)
✓ Created agent-bd-x7y8.3 (branch: agent/bd-x7y8.3)
✓ Created agent-bd-x7y8.6 (branch: agent/bd-x7y8.6)

Launching agents in parallel:
- bd-x7y8.1 → sql-agent in ../agent-bd-x7y8.1 (background)
- bd-x7y8.3 → swift-agent in ../agent-bd-x7y8.3 (background)
- bd-x7y8.6 → typescript-agent in ../agent-bd-x7y8.6 (background)

Waiting for completion...
```

### Collecting results

After all complete:

```
Batch 1 Results:
- bd-x7y8.1: PASS → merged to main, worktree cleaned
- bd-x7y8.3: PASS → merged to main, worktree cleaned
- bd-x7y8.6: FAIL → worktree preserved for debugging

Processing results...
```

---

## Batch Identification

Tasks can run in parallel if they don't depend on each other.

From the ready work, group tasks:
- **Batch 1**: All currently ready tasks (no deps on each other)
- **Batch 2**: Tasks that will become ready after Batch 1

### Example

```
Ready now (Batch 1):
- bd-x7y8.1 [agent:sql]
- bd-x7y8.3 [agent:swift]

Blocked (future batches):
- bd-x7y8.2 [agent:typescript] → waiting on .1
- bd-x7y8.4 [agent:typescript] → waiting on .1, .2
- bd-x7y8.5 [agent:test] → waiting on .3, .4
```

---

## Result Collection

Wait for all agents in batch to complete.

For each agent result:
- **PASS**: Continue to verification
- **FAIL**: Handle based on task type and mode

### Telemetry Capture

**IMPORTANT**: After each agent completes, capture telemetry for retrospective analysis.

Agents output a compact JSON telemetry line as their **last line of output**:
```json
{"s":"s","t":1200,"m":["src/file.ts"],"c":["src/new.ts"]}
```

Parse this and record to the telemetry database:

```python
def capture_telemetry(task, epic_id, agent_type, result, start_time):
    # Parse the compact JSON from last line of agent output
    output_lines = result.output.strip().split('\n')
    telemetry_line = output_lines[-1] if output_lines else '{}'

    try:
        telemetry = json.loads(telemetry_line)
    except:
        telemetry = {}  # Fallback if no valid JSON

    # Map compact keys to full names
    status_map = {'s': 'PASS', 'f': 'FAIL', 'b': 'BLOCKED'}
    error_map = {'t': 'test_failure', 'b': 'build_error', 'o': 'timeout', 'v': 'validation', 'u': 'unknown'}

    # Record to discovery.db via SQL
    record = {
        'id': f'tel-{uuid4().hex[:8]}',
        'task_id': task.id,
        'epic_id': epic_id,
        'agent_type': agent_type,
        'status': status_map.get(telemetry.get('s'), 'UNKNOWN'),
        'token_count': telemetry.get('t'),
        'duration_ms': int((time.now() - start_time) * 1000),
        'files_modified': json.dumps(telemetry.get('m', [])),
        'files_created': json.dumps(telemetry.get('c', [])),
        'error_type': error_map.get(telemetry.get('e')),
        'error_summary': telemetry.get('x'),
        'debug_attempts': task.metadata.get('debug_attempts', 0),
        'started_at': start_time.isoformat(),
        'completed_at': time.now().isoformat()
    }

    # Insert into agent_telemetry table
    sqlite3_exec(f"""
        INSERT INTO agent_telemetry
        (id, task_id, epic_id, agent_type, status, token_count, duration_ms,
         files_modified, files_created, error_type, error_summary,
         debug_attempts, started_at, completed_at)
        VALUES ('{record['id']}', '{record['task_id']}', ...)
    """)
```

**Compact Output Keys:**
| Key | Meaning | Values |
|-----|---------|--------|
| `s` | status | `"s"` (success), `"f"` (fail), `"b"` (blocked) |
| `t` | tokens | estimated token count |
| `m` | modified | array of modified file paths |
| `c` | created | array of created file paths |
| `e` | error type | `"t"` (test), `"b"` (build), `"o"` (timeout), `"v"` (validation), `"u"` (unknown) |
| `x` | error msg | error message (max 200 chars) |

### Standard Mode

```bash
# Block the task
bd update <task-id> --status blocked

# Add notes about the failure
bd update <task-id> --notes "Blocked: <reason>. Needs: <what's needed>"
```

### TDD Mode

See [tdd-protocol.md](./tdd-protocol.md) for RED/GREEN/DEBUG phase handling.

---

## Progress Logging

### Standard Mode

```
## Batch 1 Complete

✅ bd-x7y8.1: Database schema - PASS (closed)
✅ bd-x7y8.3: Experience picker UI - PASS (closed)

Newly unblocked:
- bd-x7y8.2: Assessment edge function [agent:typescript]

Proceeding to Batch 2...
```

### TDD Mode

```
## Batch 1 Complete (Test Phase)

✅ bd-x7y8.1: Write database tests - RED PHASE PASS (tests fail correctly, closed)
✅ bd-x7y8.3: Write picker UI tests - RED PHASE PASS (tests fail correctly, closed)

Newly unblocked (Implementation Phase):
- bd-x7y8.2: Implement database schema [agent:sql]
- bd-x7y8.4: Implement picker UI [agent:swift]

Proceeding to Batch 2 (Implementation)...
```

---

## Agent Selection Logic

```python
def select_agent(task):
    labels = task.get('labels', [])

    # Extract agent label
    agent_label = next((l for l in labels if l.startswith('agent:')), None)

    if not agent_label:
        raise ValueError(f"No agent label found for task {task['id']}")

    agent_type = agent_label.replace('agent:', '')

    # Map to agent name
    agent_map = {
        'sql': 'sql-agent',
        'typescript': 'typescript-agent',
        'swift': 'swift-agent',
        'test': 'test-writer-agent' if tdd_enabled else 'test-agent',
        'context-builder': 'context-builder'
    }

    return agent_map.get(agent_type, f'{agent_type}-agent')
```

---

## Completion Summary

### Standard Mode

```
## Execution Complete

Epic: bd-x7y8 - Athlete Experience Level Tracking

Completed:
✅ bd-x7y8.1: Database schema
✅ bd-x7y8.2: Assessment edge function
✅ bd-x7y8.3: Experience picker UI
✅ bd-x7y8.4: Plan integration
✅ bd-x7y8.5: E2E testing

All tasks closed. Feature ready for review.
```

### TDD Mode

See [tdd-protocol.md](./tdd-protocol.md#completion-summary) for TDD completion summary format.
