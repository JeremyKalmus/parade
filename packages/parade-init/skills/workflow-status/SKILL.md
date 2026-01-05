---
name: workflow-status
description: Display current workflow state across discovery.db and beads. Shows active briefs, open epics, blocked tasks, recent activity, and suggests next actions. Use when resuming work or checking project status.
---

# Workflow Status Skill

## Purpose

Provide a comprehensive view of the current state of all workflow activities, combining data from both `discovery.db` (pre-approval pipeline) and `.beads/` (post-approval execution). This skill helps users understand where they left off and what to do next.

## When to Use

- User asks "What's the status?", "Where did I leave off?", "What should I work on?"
- Resuming work after an interruption or break
- Getting oriented on overall project state
- Understanding what's blocked or needs attention
- Checking on progress across multiple features

## Process

### Step 0: Path Detection

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

### Step 1: Query Discovery Pipeline

Check for briefs in the pre-approval workflow:

```bash
sqlite3 -json "$DISCOVERY_DB" "
SELECT
  id,
  title,
  status,
  priority,
  datetime(updated_at, 'localtime') as updated_at,
  datetime(created_at, 'localtime') as created_at
FROM briefs
WHERE status IN ('draft', 'in_discovery', 'spec_ready')
ORDER BY
  CASE priority
    WHEN 1 THEN 1
    WHEN 2 THEN 2
    WHEN 3 THEN 3
    WHEN 4 THEN 4
  END,
  updated_at DESC;
"
```

### Step 2: Query Beads for Active Epics

Get all open and in-progress epics with task counts:

```bash
bd list --status open --json
bd list --status in_progress --json
```

For each epic, get child task breakdown:

```bash
# Count tasks by status for each epic
bd list --json | jq '[.[] | select(.parent_id == "<epic-id>") | group_by(.status) | {status: .[0].status, count: length}]'
```

### Step 3: Identify Blocked Tasks

Find all tasks that are blocked:

```bash
bd list --status blocked --json
```

### Step 4: Get Ready Work

Show what's available to work on right now:

```bash
bd ready --json
```

### Step 5: Query Recent Activity

Get the last 10 workflow events:

```bash
sqlite3 -json "$DISCOVERY_DB" "
SELECT
  brief_id,
  event_type,
  details,
  datetime(created_at, 'localtime') as created_at
FROM workflow_events
ORDER BY created_at DESC
LIMIT 10;
"
```

### Step 6: Format and Display

Present information in a structured format:

```
## Workflow Status

### Discovery Pipeline
- [brief-id]: Title (status: draft) - Priority: High - Last updated: 2 hours ago
- [brief-id]: Title (status: in_discovery) - Priority: Medium - Last updated: 1 day ago
- [brief-id]: Title (status: spec_ready) - Priority: High - Created: 3 days ago

### Active Epics
- [epic-id]: Epic Title (status: in_progress)
  - Tasks: 3 open, 2 in_progress, 1 completed, 0 blocked

- [epic-id]: Another Epic (status: open)
  - Tasks: 5 open, 0 in_progress, 0 completed, 0 blocked

### Blocked Tasks
- [task-id]: Task Title - Epic: [epic-id]
  - Reason: Dependency on [other-task-id]
  - Blocked since: 2 hours ago

### Ready to Work
- [task-id]: Task Title (epic: [epic-id])
- [task-id]: Another Task (epic: [epic-id])

### Recent Activity (Last 10 Events)
- 2 hours ago: spec_approved for brief-id
- 1 day ago: discovery_completed for brief-id
- 2 days ago: created for brief-id
```

### Step 7: Suggest Next Actions

Based on the current state, provide actionable recommendations:

#### If there are draft briefs:
```
Suggested Actions:
- Run /start-discovery <brief-id> to begin discovery for "<title>"
```

#### If there are spec_ready briefs:
```
Suggested Actions:
- Run /approve-spec <brief-id> to export "<title>" to beads
```

#### If there are ready tasks:
```
Suggested Actions:
- Run /run-tasks to begin execution on <N> ready tasks
```

#### If there are blocked tasks but no ready work:
```
Suggested Actions:
- Review blocked tasks: bd show <task-id>
- Resolve dependencies or blockers manually
```

#### If everything is idle:
```
Suggested Actions:
- Run /create-brief to start a new feature
- Review completed work: bd list --status closed --json
```

---

## Implementation Details

### SQL Queries

#### Get Briefs by Status
```sql
SELECT
  id,
  title,
  status,
  priority,
  problem_statement,
  datetime(updated_at, 'localtime') as updated_at,
  datetime(created_at, 'localtime') as created_at
FROM briefs
WHERE status IN ('draft', 'in_discovery', 'spec_ready')
ORDER BY priority, updated_at DESC;
```

#### Get Recent Workflow Events
```sql
SELECT
  brief_id,
  event_type,
  details,
  datetime(created_at, 'localtime') as created_at
FROM workflow_events
ORDER BY created_at DESC
LIMIT 10;
```

#### Count Briefs by Status
```sql
SELECT
  status,
  COUNT(*) as count,
  GROUP_CONCAT(id, ', ') as brief_ids
FROM briefs
WHERE status != 'archived'
GROUP BY status;
```

### Beads Commands

#### List All Epics
```bash
bd list --json | jq '[.[] | select(.issue_type == "epic")]'
```

#### Get Task Counts for Epic
```bash
# For a specific epic ID
EPIC_ID="<epic-id>"
bd list --json | jq --arg epic "$EPIC_ID" '
  [.[] | select(.parent_id == $epic)] |
  group_by(.status) |
  map({status: .[0].status, count: length})
'
```

#### List Blocked Tasks with Details
```bash
bd list --status blocked --json | jq '.[] | {
  id: .id,
  title: .title,
  parent_id: .parent_id,
  updated_at: .updated_at
}'
```

#### Get Ready Work
```bash
bd ready --json
```

---

## Display Format

### Priority Levels
- 1: Critical (🔴)
- 2: High (🟠)
- 3: Medium (🟡)
- 4: Low (🟢)

### Status Indicators
- `draft`: Initial brief created
- `in_discovery`: Discovery process running
- `spec_ready`: Specification complete, ready for approval
- `open`: Task/epic created but not started
- `in_progress`: Actively being worked on
- `blocked`: Cannot proceed due to dependency or issue
- `completed`: Finished successfully

### Time Formatting
Show relative time when recent (< 24h), otherwise show absolute:
- "2 hours ago"
- "Yesterday"
- "Jan 2, 2026"

---

## Example Output

```
## Workflow Status (as of Jan 2, 2026 2:30 PM)

### Discovery Pipeline (2 active)

- [athlete-experience-tracking]: Athlete Experience Level Tracking
  Status: spec_ready | Priority: High (2) | Updated: 3 hours ago

- [data-export-feature]: Export Training Data
  Status: in_discovery | Priority: Medium (3) | Updated: 1 day ago

### Active Epics (1)

- [customTaskTracker-xbi]: Workflow Orchestration System
  Status: in_progress | Tasks: 8 open, 2 in_progress, 3 completed, 1 blocked

### Blocked Tasks (1)

- [customTaskTracker-xbi.9]: Implement sub-agent spawning
  Epic: Workflow Orchestration System
  Blocked since: 2 hours ago
  Run: bd show customTaskTracker-xbi.9 for details

### Ready to Work (3 tasks)

- [customTaskTracker-xbi.12]: Create /workflow-status skill
- [customTaskTracker-xbi.13]: Add status update commands
- [customTaskTracker-xbi.14]: Create verification tests

### Recent Activity

- 2 hours ago: spec_approved for athlete-experience-tracking
- 4 hours ago: sme_review_completed for athlete-experience-tracking
- 1 day ago: discovery_started for data-export-feature
- 2 days ago: created for data-export-feature
- 3 days ago: task_completed for customTaskTracker-xbi.8

### Suggested Next Actions

1. Run /run-tasks to work on 3 ready tasks
2. Run /approve-spec athlete-experience-tracking to export to beads
3. Review blocked task: bd show customTaskTracker-xbi.9
```

---

## Error Handling

### Discovery DB Not Found
```
Warning: discovery.db not found at .parade/ or project root.
No discovery pipeline data available.

Run /create-brief to start a new feature.
```

### Beads Not Initialized
```
Warning: Beads not initialized (.beads/ directory missing).
No task execution data available.

Tasks will appear here after running /approve-spec.
```

### No Active Work
```
## Workflow Status

No active briefs, epics, or tasks found.

Suggested Actions:
- Run /create-brief to start a new feature
- Check archived work: sqlite3 "$DISCOVERY_DB" "SELECT * FROM briefs WHERE status = 'archived';"
```

---

## Tips

- Use this skill at the start of each session to get oriented
- Combine with `bd show <id>` to drill into specific tasks
- Check workflow status before running /run-tasks to ensure work is ready
- Use recent activity to understand what happened while you were away
- Suggested actions are prioritized by workflow stage (discovery → spec → execution)

