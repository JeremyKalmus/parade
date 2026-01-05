# TDD Protocol Reference

## Overview

When `workflow.tdd_enabled: true` in project.yaml, the run-tasks skill enforces a test-first gating workflow with RED/GREEN/DEBUG phases.

---

## TDD Workflow Summary

```
1. TEST PHASE (RED)
   ├─ Get ready test tasks (agent:test label)
   ├─ Spawn test-writer-agent
   ├─ Verify tests FAIL correctly
   └─ Close test task → Unblocks impl task

2. IMPLEMENTATION PHASE (GREEN)
   ├─ Get ready impl tasks (test_task_id dependency satisfied)
   ├─ Spawn implementation agent (swift/typescript/sql)
   ├─ Run tests to verify
   ├─ If PASS: Close impl task ✅
   └─ If FAIL: Enter debug loop ⚠️

3. DEBUG LOOP (on GREEN phase failure)
   ├─ Initialize debug_attempts metadata
   ├─ Spawn debug-agent (attempt 1/3)
   ├─ Check debug-knowledge for patterns
   ├─ Apply systematic fix
   ├─ Verify tests pass
   ├─ If PASS: Close impl task, document pattern ✅
   ├─ If FAIL and attempts < 3: Increment, retry
   └─ If FAIL and attempts >= 3: Block, escalate ❌

4. KNOWLEDGE BUILDING
   ├─ Debug-agent documents patterns in .claude/debug-knowledge/
   ├─ Future failures check patterns first
   └─ Continuous improvement of debugging efficiency
```

---

## TDD Gating Rules

For each ready task, check metadata and labels via `bd show <task-id> --json`:

```json
{
  "metadata": {
    "test_task_id": "bd-x7y8.2"
  },
  "labels": ["agent:typescript"]
}
```

**Gating Logic:**
- If task has `skip_tests` label → ALLOW immediately (no TDD gating)
- If task has `test_task_id` and test task is NOT closed → EXCLUDE from ready batch
- Test tasks (those without test_task_id) can run immediately
- Implementation tasks wait for their test tasks to close (RED phase verified)

---

## RED Phase (Test Task Verification)

When test-writer-agent reports completion:

### 1. Verify tests exist
```bash
# Check test file was created
ls <test-file-path>
```

### 2. Run tests and verify they FAIL
```bash
# Based on project.yaml testing framework
npm test <test-file>  # For TypeScript/vitest
```

### 3. Expected outcome
- Tests should FAIL with "not implemented" or similar errors
- NO syntax errors in test files
- Clear indication of missing functionality

### 4. RED Phase Validation
- **If tests fail correctly**: Close test task, unblock implementation task
- **If tests pass (wrong!)**: Report FAIL, mark test task as blocked
- **If syntax errors**: Spawn test-writer-agent again to fix

```bash
# On successful RED phase
bd close <test-task-id>

# This unblocks the implementation task (test_task_id dependency satisfied)
```

---

## GREEN Phase (Implementation Task Verification)

When implementation agent reports completion:

### 1. Run test suite
```bash
# Run tests specific to this implementation
npm test <test-file>
```

### 2. Expected outcome
- Tests should PASS (GREEN phase)
- All acceptance criteria validated
- No regressions

### 3. GREEN Phase Validation
- **If tests PASS**: Close implementation task (success!)
- **If tests FAIL**: Spawn debug-agent with failure context

---

## DEBUG Phase (Test Failure Resolution)

When implementation tests fail, enter debug loop:

### 1. Initialize debug tracking
```bash
# Add metadata to track debug attempts
bd update <task-id> --metadata '{"debug_attempts": 1}'
```

### 2. Spawn debug-agent
```
Spawning debug-agent for <task-id> (Attempt 1/3)...

---
Task: <task-id> - <title>

Failed Test Output:
<paste full test failure output>

Implementation Files:
- <files modified by implementation agent>

Test Files:
- <test files from test task>

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

### 3. After debug-agent completes
- **PASS**: Tests now pass → Close task
- **FAIL**: Increment debug_attempts, check limit

### 4. Check attempt limit
```bash
# Get current attempt count
bd show <task-id> --json | jq '.metadata.debug_attempts'

# If < 3: Spawn debug-agent again (attempt N+1)
# If >= 3: Mark as blocked, escalate to user
```

### 5. On max attempts reached
```bash
bd update <task-id> --status blocked --notes "Test failures persist after 3 debug attempts. Manual review needed."
bd update <epic-id> --status blocked
```

---

## Task Metadata in TDD Mode

### Test Task
```json
{
  "id": "bd-x7y8.1",
  "title": "Write database schema tests",
  "labels": ["agent:test"],
  "status": "open"
}
```

### Implementation Task
```json
{
  "id": "bd-x7y8.2",
  "title": "Implement database schema",
  "labels": ["agent:sql"],
  "metadata": {
    "test_task_id": "bd-x7y8.1"
  },
  "status": "open"
}
```

After test task closes, impl task becomes ready (dependency satisfied).

### During Debug
```json
{
  "id": "bd-x7y8.2",
  "metadata": {
    "test_task_id": "bd-x7y8.1",
    "debug_attempts": 2
  },
  "status": "in_progress"
}
```

---

## Skip Tests Label

The `skip_tests` label allows tasks to bypass TDD requirements during execution.

### Common use cases
- **Database schema tasks** (`agent:sql`) - Schema changes verified through migrations
- **Documentation tasks** - No code to test
- **Configuration tasks** - Static config files
- **Migration tasks** - One-time operations verified differently

### How it works

1. **Task created with skip_tests label** (set during `/approve-spec`):
```bash
bd show <task-id> --json
# Returns: {"labels": ["agent:sql", "skip_tests"], ...}
```

2. **TDD gating check**:
- Task has `skip_tests` label → bypasses TDD gating
- No test task required
- Can execute immediately when dependencies met

3. **Implementation verification**:
- Task still requires acceptance criteria verification
- Uses standard verification commands (not test suite)
- For example: `psql` to verify schema, `cat` to verify config

### Example execution flow

```
Ready work:
- bd-x.1: Add experience column [agent:sql, skip_tests] - No TDD gating
- bd-x.2t: Write API tests [agent:test-writer] - Test task
- bd-x.3t: Write UI tests [agent:test-writer] - Test task

Batch 1 executes:
- bd-x.1 → sql-agent (skip_tests, no test required)
- bd-x.2t → test-writer-agent (RED phase)
- bd-x.3t → test-writer-agent (RED phase)
```

**Important:**
- `skip_tests` only affects TDD gating, not other dependencies
- Task must still meet acceptance criteria
- Verification happens through acceptance criteria checks, not test suite

---

## Execution Order Example

```
Epic: bd-a1b2 - User Authentication

Tasks:
  bd-a1b2.1 [agent:test] Write auth tests
  bd-a1b2.2 [agent:typescript] Implement auth (metadata: test_task_id=bd-a1b2.1)
  bd-a1b2.3 [agent:test] Write session tests
  bd-a1b2.4 [agent:typescript] Implement sessions (metadata: test_task_id=bd-a1b2.3)

Execution Flow:
  Batch 1 (RED Phase):
    - bd-a1b2.1 → test-writer-agent → tests fail ✓ → close
    - bd-a1b2.3 → test-writer-agent → tests fail ✓ → close

  Batch 2 (GREEN Phase):
    - bd-a1b2.2 → typescript-agent → tests pass ✓ → close
    - bd-a1b2.4 → typescript-agent → tests fail ✗ → debug-agent

  Debug Loop (bd-a1b2.4):
    Attempt 1: debug-agent → still failing
    Attempt 2: debug-agent → tests pass ✓ → close
    Pattern documented: jwt-token-expiry.md
```

---

## Progress Logging

### TDD Mode Progress Log

```
## Batch 1 Complete (Test Phase)

✅ bd-x7y8.1: Write database tests - RED PHASE PASS (tests fail correctly, closed)
✅ bd-x7y8.3: Write picker UI tests - RED PHASE PASS (tests fail correctly, closed)

Newly unblocked (Implementation Phase):
- bd-x7y8.2: Implement database schema [agent:sql]
- bd-x7y8.4: Implement picker UI [agent:swift]

Proceeding to Batch 2 (Implementation)...
```

```
## Batch 2 Complete (Implementation Phase)

✅ bd-x7y8.2: Implement database schema - GREEN PHASE PASS (tests pass, closed)
⚠️ bd-x7y8.4: Implement picker UI - GREEN PHASE FAIL (spawning debug-agent, attempt 1/3)

Debug in progress for bd-x7y8.4...
```

```
## Debug Complete

✅ bd-x7y8.4: Implement picker UI - DEBUG SUCCESS (tests pass after 1 attempt, closed)

Knowledge base updated: .claude/debug-knowledge/swiftui-state-binding.md
```

---

## Completion Summary

### TDD Mode Summary

```
## Execution Complete (TDD Mode)

Epic: bd-x7y8 - Athlete Experience Level Tracking

Test Phase (RED):
✅ bd-x7y8.1: Write database tests - RED PASS
✅ bd-x7y8.3: Write picker UI tests - RED PASS
✅ bd-x7y8.5: Write integration tests - RED PASS

Implementation Phase (GREEN):
✅ bd-x7y8.2: Database schema - GREEN PASS
✅ bd-x7y8.4: Experience picker UI - GREEN PASS (1 debug attempt)
✅ bd-x7y8.6: Plan integration - GREEN PASS

Debug Summary:
- Total debug sessions: 1
- Successful fixes: 1
- Patterns documented: 1 (swiftui-state-binding.md)

All tasks closed. Feature ready for review.
```

---

## Failure Handling

### Test Task Failures (RED Phase)

When test-writer-agent reports FAIL or tests don't fail correctly:

1. **Check the failure reason:**
   - Tests pass without implementation (test is wrong)
   - Syntax errors in test file
   - Test framework not found

2. **Actions:**
   - **Syntax errors**: Spawn test-writer-agent again to fix
   - **Tests pass**: Mark as blocked, needs review
   - **Framework missing**: Install framework, retry

```bash
# Retry test writing (syntax errors)
# Spawn test-writer-agent again with error context

# Block for review (tests pass without impl)
bd update <test-task-id> --status blocked --notes "Tests pass without implementation - needs review"
```

### Implementation Task Failures (GREEN Phase)

When implementation agent reports FAIL or tests don't pass:

1. **Enter debug loop** (see DEBUG Phase above)
2. **Track attempts** in metadata
3. **Spawn debug-agent** with full context
4. **Max 3 attempts** before blocking

```bash
# Initialize debug tracking
bd update <impl-task-id> --metadata '{"debug_attempts": 1}'

# Spawn debug-agent (see DEBUG Phase for full template)

# After 3 failed attempts
bd update <impl-task-id> --status blocked --notes "Test failures persist after 3 debug attempts"
bd update <epic-id> --status blocked
```
