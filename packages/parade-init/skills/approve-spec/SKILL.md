---
name: approve-spec
description: Approve a specification and export it to beads as an epic with tasks. Creates the epic, child tasks, dependencies, and agent assignment labels. Use after reviewing the spec from /start-discovery.
---

# Approve Spec Skill

## Purpose

Convert an approved specification into actionable beads:
1. Create an epic for the feature
2. Create child tasks from the task breakdown
3. Set up dependencies between tasks
4. Assign agent labels for execution
5. Add close-up checklist task (final task depends on all others)
6. Link back to discovery.db

## When to Use

- User approves a spec after `/start-discovery`
- User says "approve", "looks good", "let's do it"
- Spec status is 'review'

## Arguments

```
/approve-spec <spec-id>
```

---

## ⚡ Performance Notes

**IMPORTANT**: This skill should complete in under 30 seconds. To ensure fast execution:

1. **Use `--no-daemon` flag** on all `bd` commands to skip daemon startup (saves ~5s per command)
2. **Batch operations** where possible using `&&` chains
3. **No code generation** happens here - only metadata/task creation

If this skill is taking longer than expected, check:
- Daemon issues: `bd doctor`
- Context compaction: PreCompact hook should preserve beads context

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

### Step 0b: Load Project Configuration

Check for `project.yaml` to determine testing commands and TDD mode:

```bash
if [ -f "project.yaml" ]; then
  # Parse for:
  # - stacks.<type>.testing.commands (test, lint, build)
  # - workflow.tdd_enabled
fi
```

**Default values if not configured:**
- test: `npm test`
- lint: `npm run lint`
- build: `npm run build`
- tdd_enabled: `false`

### Step 1: Load Spec

```bash
sqlite3 -json "$DISCOVERY_DB" "SELECT * FROM specs WHERE id = '<spec-id>';"
```

Verify spec exists and status is 'review'. Also load the associated brief.

### Step 2: Create Epic

```bash
bd --no-daemon create "<spec-title>" \
  --type epic \
  --description "<spec-description>" \
  --acceptance "<acceptance-criteria-formatted>"
```

Capture epic ID (e.g., `bd-a1b2`).

### Step 3: Parse Task Breakdown

The spec's `task_breakdown` is a JSON array with structure:
```json
[
  {
    "title": "Task title",
    "description": "Task description",
    "agent": "sql|typescript|swift|test|context-builder",
    "depends_on": [0, 1],  // Indices of blocking tasks
    "skip_tests": false     // Optional: skip TDD for this task
  }
]
```

See [beads-patterns.md](docs/beads-patterns.md#task-breakdown-json-schema) for full schema.

### Step 4: Create Tasks (Optimized)

**Option A: Batch Creation (Preferred)**

Generate a temporary markdown file with all tasks, then create in one command:

```bash
# Write tasks to temp file
cat > /tmp/tasks.md << 'EOF'
# Task: <task-1-title>
Type: task
Parent: <epic-id>
Labels: agent:<agent-type>
Description: <task-1-description>

---

# Task: <task-2-title>
Type: task
Parent: <epic-id>
Labels: agent:<agent-type>
Description: <task-2-description>
EOF

# Create all tasks at once
bd --no-daemon create -f /tmp/tasks.md
```

**Option B: Sequential with --no-daemon**

If batch isn't feasible, use `--no-daemon` on each command:

```bash
bd --no-daemon create "<task-title>" \
  --parent <epic-id> \
  --type task \
  --description "<task-description>" \
  --labels "agent:<agent-type>"
```

**Verification criteria** based on agent type and project.yaml config:

| Agent Type | Verification |
|------------|-------------|
| sql | Run migrations, verify schema |
| typescript | `<test_command>` + `<lint_command>` |
| swift | `<test_command>` |
| test | Full test suite |

Track mapping: `task_index → bead_id`

Example:
```
0 → bd-a1b2.1 (Database schema)
1 → bd-a1b2.2 (API endpoint)
2 → bd-a1b2.3 (iOS integration)
```

### Step 4a: Create Test Tasks (TDD Mode)

**Only if `workflow.tdd_enabled: true` in project.yaml:**

For each implementation task (except tasks with `skip_tests` or `agent:test-writer`):

1. Create test task with naming convention: `"Write tests for: <impl-task-title>"`
2. Add `agent:test-writer` label
3. Store bidirectional metadata in notes:
   ```bash
   bd update <impl-task-id> --notes "test_task_id: <test-task-id>"
   bd update <test-task-id> --notes "impl_task_id: <impl-task-id>"
   ```
4. Add dependency (test blocks implementation):
   ```bash
   bd dep add <impl-task-id> <test-task-id>
   ```

**Test task naming:** Use `.Nt` suffix (e.g., `bd-a1b2.2t`)

See [beads-patterns.md](docs/beads-patterns.md#tdd-mode-patterns) for full TDD patterns.

### Step 5: Add Dependencies (Batched)

For each task with `depends_on` indices, resolve to bead IDs and create dependencies.

**Batch with `&&` chains:**

```bash
# Chain multiple dep adds in one command
bd --no-daemon dep add <id-1> <dep-1> && \
bd --no-daemon dep add <id-2> <dep-2> && \
bd --no-daemon dep add <id-3> <dep-3>
```

**Note:** Test task dependencies are already added in Step 4a. Original task dependencies from spec breakdown are still applied.

See [beads-patterns.md](docs/beads-patterns.md#dependency-patterns) for dependency patterns.

### Step 6: Add Agent Labels (Batched)

**Note:** If using batch creation (Step 4 Option A), labels are included in the markdown file. Otherwise:

```bash
# Chain label adds
bd --no-daemon label add <task-1> agent:sql && \
bd --no-daemon label add <task-2> agent:typescript && \
bd --no-daemon label add <task-3> agent:swift
```

Test task labels (`agent:test-writer`) are already added in Step 4a.

See [beads-patterns.md](docs/beads-patterns.md#agent-label-conventions) for label conventions.

### Step 6a: Add Close-Up Checklist Task

Create a final close-up task that runs after all other tasks complete:

```bash
bd --no-daemon create "Epic close-up checklist" \
  --parent <epic-id> \
  --type task \
  --labels "agent:test" \
  --description "Final verification, documentation review, and pattern extraction before closing the epic. See: .claude/skills/approve-spec/docs/closeup-checklist.md" \
  --acceptance "All checklist items verified. Close-up report generated."
```

**Add dependencies on ALL other tasks (batched):**

```bash
# Chain all dependency adds
bd --no-daemon dep add <closeup-id> <task-1> && \
bd --no-daemon dep add <closeup-id> <task-2> && \
bd --no-daemon dep add <closeup-id> <task-3>
# ... etc for all tasks
```

The close-up task ensures:
- All tests pass and build succeeds
- Code review and refactoring complete
- Documentation is updated
- Patterns are extracted to shared utilities/agents
- No integration regressions
- Cleanup of temporary artifacts

See [closeup-checklist.md](docs/closeup-checklist.md) for the full checklist.

### Step 7: Update Discovery.db

Mark spec as approved and export epic reference:

```sql
UPDATE specs
SET status = 'approved',
    approved_at = datetime('now'),
    exported_epic_id = '<epic-id>'
WHERE id = '<spec-id>';

UPDATE briefs
SET status = 'exported',
    exported_epic_id = '<epic-id>',
    updated_at = datetime('now')
WHERE id = (SELECT brief_id FROM specs WHERE id = '<spec-id>');

INSERT INTO workflow_events (brief_id, event_type, details)
VALUES (
  (SELECT brief_id FROM specs WHERE id = '<spec-id>'),
  'exported',
  '{"epic_id": "<epic-id>", "task_count": <n>}'
);
```

### Step 8: Display Summary

**Without TDD:**
```
## Spec Approved and Exported to Beads

Epic: <epic-id> - <title>

Tasks created:
- <bd-a1b2.1>: Database schema [agent:sql]
- <bd-a1b2.2>: API endpoint [agent:typescript] → depends on .1
- <bd-a1b2.3>: iOS integration [agent:swift] → depends on .1, .2
- <bd-a1b2.final>: Epic close-up checklist [agent:test] → depends on ALL

Ready work (no blockers):
- <bd-a1b2.1>: Database schema

---

To start execution: /run-tasks
To view in Kanban: Open Parade app
```

**With TDD enabled:**
```
## Spec Approved and Exported to Beads (TDD Mode)

Epic: <epic-id> - <title>

Tasks created (with test-first pairing):
- <bd-a1b2.1>: Database schema [agent:sql]
- <bd-a1b2.2t>: Write tests for: API endpoint [agent:test-writer]
- <bd-a1b2.2>: API endpoint [agent:typescript] → depends on .1, .2t
- <bd-a1b2.3t>: Write tests for: iOS integration [agent:test-writer]
- <bd-a1b2.3>: iOS integration [agent:swift] → depends on .1, .2, .3t
- <bd-a1b2.final>: Epic close-up checklist [agent:test] → depends on ALL

Test/Impl Pairings:
- bd-a1b2.2t ⟷ bd-a1b2.2 (test blocks impl)
- bd-a1b2.3t ⟷ bd-a1b2.3 (test blocks impl)

Ready work (no blockers):
- <bd-a1b2.1>: Database schema [agent:sql]
- <bd-a1b2.2t>: Write tests for: API endpoint [agent:test-writer]
- <bd-a1b2.3t>: Write tests for: iOS integration [agent:test-writer]

---

To start execution: /run-tasks
To view in Kanban: Open Parade app

TDD Workflow: Test tasks will run first (RED), then implementation (GREEN), then refactor
Close-Up: Final checklist runs after all tasks complete
```

---

## Core Export Logic

The skill implements this conversion flow:

```
Spec (discovery.db)
  ↓ Parse task_breakdown JSON
Tasks Array with Indices
  ↓ Create beads tasks
Index → Bead ID Mapping
  ↓ Resolve dependencies
Dependencies Added
  ↓ Assign agent labels
Tasks Ready for Execution
  ↓ (Optional: TDD Mode)
Test/Impl Task Pairs
  ↓ Add close-up checklist task
Final Task Depends on All
  ↓ Update discovery.db
Spec Approved, Epic Exported
```

### Skip Tests Logic

Tasks can opt-out of TDD test creation by setting `skip_tests: true` in the task breakdown JSON. Common use cases:
- Database schema tasks (verified through migrations)
- Documentation tasks
- Configuration tasks
- One-time migration tasks

When `skip_tests` is set, no companion test task is created even in TDD mode.

### Backward Compatibility

- **TDD disabled** (default): Standard task creation, no test tasks, no metadata
- **TDD enabled**: Test tasks created with metadata, fully backward compatible with existing specs

---

## Reference Documentation

For detailed patterns, examples, and command reference:
- [beads-patterns.md](docs/beads-patterns.md) - Complete beads command patterns, dependency examples, label conventions, TDD workflows, and full examples

---

## Output

After successful execution:
- Epic created in beads with full description
- All tasks created as children of epic
- Test tasks created (if TDD enabled) with proper pairing
- **Close-up checklist task created** (depends on all other tasks)
- Dependencies set up correctly (including test → impl if TDD)
- Agent labels applied (including agent:test-writer if TDD)
- Metadata stored for test/impl tracking (if TDD)
- Spec marked as approved in discovery.db
- Brief marked as exported
- User knows which tasks are ready to start

Next step: `/run-tasks` to begin orchestrated execution
