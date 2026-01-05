# Beads Task Creation Patterns

Reference documentation for approve-spec skill: beads commands, dependency patterns, label conventions, and examples.

---

## Task Breakdown JSON Schema

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "title": { "type": "string" },
      "description": { "type": "string" },
      "agent": {
        "type": "string",
        "enum": ["sql", "typescript", "swift", "test", "context-builder"]
      },
      "depends_on": {
        "type": "array",
        "items": { "type": "integer" },
        "description": "Indices of tasks this depends on"
      },
      "verification": {
        "type": "string",
        "description": "Command or criteria to verify completion"
      },
      "skip_tests": {
        "type": "boolean",
        "description": "If true, skip TDD test task creation for this task. Useful for schema, config, docs, migrations."
      }
    },
    "required": ["title", "agent"]
  }
}
```

---

## Beads Command Patterns

### Creating an Epic

```bash
bd create "<spec-title>" \
  --type epic \
  --description "<spec-description>" \
  --acceptance "<acceptance-criteria-formatted>"
```

### Creating Tasks

```bash
bd create "<task-title>" \
  --parent <epic-id> \
  --type task \
  --description "<task-description>" \
  --acceptance "<verification-criteria>"
```

### Adding Dependencies

```bash
# Task B depends on Task A (A blocks B)
bd dep add <task-b-id> <task-a-id>

# Multiple dependencies
bd dep add <task-c-id> <task-a-id>
bd dep add <task-c-id> <task-b-id>
```

### Adding Agent Labels

```bash
bd label add <task-id> agent:sql
bd label add <task-id> agent:typescript
bd label add <task-id> agent:swift
bd label add <task-id> agent:test-writer
```

### Adding Metadata via Notes

```bash
# Link implementation task to its test task
bd update <impl-task-id> --notes "test_task_id: <test-task-id>"

# Link test task to its implementation task
bd update <test-task-id> --notes "impl_task_id: <impl-task-id>"
```

---

## Dependency Patterns

### Simple Linear Dependency
```
Task A → Task B → Task C
```
```bash
bd dep add bd-x.2 bd-x.1  # B depends on A
bd dep add bd-x.3 bd-x.2  # C depends on B
```

### Diamond Pattern
```
    Task A
   /      \
Task B    Task C
   \      /
    Task D
```
```bash
bd dep add bd-x.2 bd-x.1  # B depends on A
bd dep add bd-x.3 bd-x.1  # C depends on A
bd dep add bd-x.4 bd-x.2  # D depends on B
bd dep add bd-x.4 bd-x.3  # D depends on C
```

### TDD Test-First Dependency
```
Test Task → Implementation Task
```
```bash
bd dep add <impl-task-id> <test-task-id>  # Impl blocks until test is done
```

---

## Agent Label Conventions

| Label | Agent Type | Use Case |
|-------|-----------|----------|
| `agent:sql` | SQL Agent | Database schemas, migrations, RLS |
| `agent:typescript` | TypeScript Agent | Backend code, APIs, edge functions |
| `agent:swift` | Swift Agent | iOS/macOS client code |
| `agent:test` | Test Agent | End-to-end testing |
| `agent:test-writer` | Test Writer Agent | TDD test creation (RED phase) |
| `skip_tests` | N/A | Opt-out of TDD for this task |

---

## Verification Criteria Patterns

### By Agent Type

| Agent Type | Default Verification |
|------------|---------------------|
| sql | Run migrations, verify schema |
| typescript | `npm test` + `npm run lint` |
| swift | `swift test` |
| test | Full test suite passes |

### Using project.yaml Configuration

When project.yaml exists with stack testing commands:

```yaml
stacks:
  backend:
    testing:
      commands:
        test: "npm test"
        lint: "npm run lint"
        build: "npm run build"
  mobile:
    testing:
      commands:
        test: "swift test"
```

Use these commands in acceptance criteria:
```
Acceptance: Tests pass (swift test), no linting errors (swiftlint)
```

---

## TDD Mode Patterns

### Test Task Naming Convention

| Original Task | Test Task Name |
|---------------|----------------|
| "Build user service" | "Write tests for: Build user service" |
| "Create assessment edge function" | "Write tests for: Create assessment edge function" |

### TDD Task Pairing

```
Original: bd-x.2 "Create experience assessment edge function" [agent:typescript]

Becomes:
- bd-x.2t "Write tests for: Create experience assessment edge function" [agent:test-writer]
- bd-x.2 "Create experience assessment edge function" [agent:typescript] → depends on bd-x.2t
  Metadata: test_task_id=bd-x.2t
```

### Test Task Creation Flow

1. Create companion test task with `.Nt` suffix (e.g., `bd-x.2t`)
2. Add `agent:test-writer` label
3. Store bidirectional metadata in notes field
4. Add dependency: implementation depends on test
5. Test tasks inherit no dependencies (can run immediately)

### Skip Tests Cases

Add `skip_tests: true` in task breakdown for:
- Database schema tasks (`agent:sql`)
- Documentation tasks
- Configuration tasks
- Migration tasks
- Any task where unit tests don't make sense

---

## Example: Full Task Breakdown

**Input Spec Task Breakdown:**
```json
[
  {"title": "Add experience_level column to athletes table", "agent": "sql", "depends_on": [], "skip_tests": true},
  {"title": "Create experience assessment edge function", "agent": "typescript", "depends_on": [0]},
  {"title": "Build experience level picker UI", "agent": "swift", "depends_on": []},
  {"title": "Integrate experience into plan generation", "agent": "typescript", "depends_on": [0, 1]},
  {"title": "End-to-end testing", "agent": "test", "depends_on": [2, 3]}
]
```

**Generated Beads (TDD disabled):**
```
bd-x7y8      Epic: Athlete Experience Level Tracking
├── bd-x7y8.1  Add experience_level column [agent:sql] - READY
├── bd-x7y8.2  Create assessment edge function [agent:typescript] → .1
├── bd-x7y8.3  Build experience picker UI [agent:swift] - READY
├── bd-x7y8.4  Integrate into plan generation [agent:typescript] → .1, .2
└── bd-x7y8.5  End-to-end testing [agent:test] → .3, .4
```

**Generated Beads (TDD enabled):**
```
bd-x7y8       Epic: Athlete Experience Level Tracking
├── bd-x7y8.1   Add experience_level column [agent:sql, skip_tests] - READY
├── bd-x7y8.2t  Write tests for: Create assessment edge function [agent:test-writer] - READY
├── bd-x7y8.2   Create assessment edge function [agent:typescript] → .1, .2t
├── bd-x7y8.3t  Write tests for: Build experience picker UI [agent:test-writer] - READY
├── bd-x7y8.3   Build experience picker UI [agent:swift] → .3t
├── bd-x7y8.4t  Write tests for: Integrate into plan generation [agent:test-writer] - READY
├── bd-x7y8.4   Integrate into plan generation [agent:typescript] → .1, .2, .4t
└── bd-x7y8.5   End-to-end testing [agent:test] → .3, .4

Test/Impl Metadata (stored in notes field):
- bd-x7y8.2:  notes="test_task_id: bd-x7y8.2t"
- bd-x7y8.2t: notes="impl_task_id: bd-x7y8.2"
- bd-x7y8.3:  notes="test_task_id: bd-x7y8.3t"
- bd-x7y8.3t: notes="impl_task_id: bd-x7y8.3"
- bd-x7y8.4:  notes="test_task_id: bd-x7y8.4t"
- bd-x7y8.4t: notes="impl_task_id: bd-x7y8.4"

Notes:
- Task .1 (agent:sql, skip_tests) does not get a test task
- Task .5 (agent:test) does not get a test task - it IS the test task
```

---

## TDD Metadata Format

### Implementation Task Metadata
```bash
bd show <impl-task-id> --json | jq -r '.notes'
# Returns: "test_task_id: bd-x.2t"
```

### Test Task Metadata
```bash
bd show <test-task-id> --json | jq -r '.notes'
# Returns: "impl_task_id: bd-x.2"
```

**Metadata Format:** Stored in the `notes` field as `key: value` pairs:
- Implementation tasks: `test_task_id: <test-task-id>`
- Test tasks: `impl_task_id: <impl-task-id>`

This bidirectional linking allows:
- Implementation agents to find their test files
- Test agents to understand what they're testing
- UI/visualization to show test-first pairing
- Auditing TDD compliance

---

## Task Index Mapping Pattern

When creating tasks, maintain an index-to-bead-id mapping:

```
0 → bd-a1b2.1 (Database schema) [agent:sql, skip_tests]
    No test task (skip_tests label applied)
1 → bd-a1b2.2 (API endpoint) [agent:typescript]
    Test: bd-a1b2.2t [agent:test-writer] → blocks bd-a1b2.2
2 → bd-a1b2.3 (iOS integration) [agent:swift]
    Test: bd-a1b2.3t [agent:test-writer] → blocks bd-a1b2.3
```

This mapping is essential for resolving `depends_on` indices from the task breakdown JSON to actual bead IDs when creating dependencies.
