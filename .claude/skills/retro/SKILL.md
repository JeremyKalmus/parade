---
name: retro
description: Analyze epic execution and generate improvement recommendations. Reads telemetry data, calculates efficiency score, and proposes workflow improvements. Use after epic completion or to review recent executions.
---

# Retro Skill

## Purpose

Analyze completed epic executions and generate actionable recommendations for workflow improvement. The retrospective process:
1. Reads execution telemetry from TelemetryService
2. Calculates an efficiency score based on debug loops and blocked tasks
3. Generates specific recommendations for agent prompts, debug knowledge, and workflow config
4. Requires user approval before applying any changes
5. Archives the retrospective for future reference

## When to Use

- User invokes `/retro <epic-id>` directly
- User invokes `/retro --recent [n]` to review recent epics
- User selects Option 2 at `/run-tasks` Step 10 (epic completion)
- After any epic with debug loops or blocked tasks
- Periodically to review accumulated patterns

---

## Entry Points

| Invocation | Description |
|------------|-------------|
| `/retro <epic-id>` | Analyze a specific epic by ID |
| `/retro <epic-id> --dry-run` | Preview analysis without modifying files |
| `/retro --recent [n]` | Analyze most recent n epics (default: 1) |
| `/retro --recent [n] --dry-run` | Preview recent epics analysis without modifying files |
| `/run-tasks` Step 10, Option 2 | Triggered from epic completion flow |

---

## Arguments

| Flag | Description |
|------|-------------|
| `--dry-run` | Run analysis and generate recommendations without applying any changes. Skips file modifications, archiving, and insights updates. Useful for previewing what a retrospective would recommend. |

---

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

### Step 1: Resolve Epic Context

Determine which epic(s) to analyze based on invocation:

**For `/retro <epic-id>`:**
```bash
bd show <epic-id> --json
```

Validate the epic exists and has status `closed` or all child tasks closed.

**For `/retro --recent [n]`:**
```bash
# Get recently closed epics
bd list -t epic --status closed --json | head -n <n>
```

**From `/run-tasks` Step 10:**
Epic ID is passed from the completion context.

### Step 2: Check for Sufficient Data

Before proceeding, verify telemetry exists:

```typescript
// Read via TelemetryService
const summary = TelemetryService.getEpicSummary(epicId);
```

If no telemetry data exists:
```
## Retrospective: <epic-id>

Insufficient data for analysis.

The telemetry file `.claude/metrics/<epic-id>.json` was not found or contains no execution data.

This can happen if:
- The epic was created before telemetry was enabled
- Execution was interrupted before metrics were captured
- The metrics file was manually deleted

Options:
1. Skip retrospective and close epic
2. Generate a basic summary from beads data only
```

If user selects option 2, proceed with limited analysis using only beads data.

### Step 3: Gather Context (Token-Efficient)

Read only essential data (~500 tokens total):

```typescript
// 1. Epic summary from telemetry
const telemetry = TelemetryService.getEpicSummary(epicId);

// 2. Task list from beads
const tasks = await exec('bd list --parent <epic-id> --json');

// 3. Existing debug knowledge patterns
const patterns = await glob('.claude/debug-knowledge/*.md');

// 4. Existing insights
const insights = await readIfExists('.claude/retrospectives/INSIGHTS.md');
```

**Do NOT:**
- Re-read source code files
- Re-read full task descriptions
- Load agent output files
- Read git history beyond summary

### Step 4: Calculate Efficiency Score

**Base Score: 10**

Apply adjustments:
- `-1` per debug loop (task required debug-agent spawn)
- `-2` per blocked task (task ended in blocked status)
- `+1` if all tasks passed on first attempt (no debug loops)

**Minimum score: 1**

```typescript
function calculateEfficiencyScore(summary: EpicSummary): number {
  let score = 10;

  // Penalty for debug loops
  score -= summary.totalDebugLoops;

  // Penalty for blocked tasks
  score -= summary.blockedTasks * 2;

  // Bonus for clean execution
  if (summary.totalDebugLoops === 0 && summary.blockedTasks === 0) {
    score += 1;
  }

  return Math.max(1, score);
}
```

### Step 5: Analyze Patterns

Identify recurring issues from telemetry:

```typescript
interface AnalysisResult {
  debugPatterns: DebugPattern[];      // Repeated failure types
  agentIssues: AgentIssue[];          // Agent-specific problems
  workflowFriction: FrictionPoint[];  // Process bottlenecks
}

function analyzePatterns(summary: EpicSummary): AnalysisResult {
  const patterns: DebugPattern[] = [];

  // Group debug sessions by error type
  for (const debug of summary.debugSessions) {
    const existing = patterns.find(p => p.errorType === debug.errorType);
    if (existing) {
      existing.count++;
      existing.tasks.push(debug.taskId);
    } else {
      patterns.push({
        errorType: debug.errorType,
        count: 1,
        tasks: [debug.taskId],
        resolution: debug.resolution
      });
    }
  }

  return { debugPatterns: patterns, agentIssues: [], workflowFriction: [] };
}
```

### Step 6: Generate Recommendations

Create structured recommendations in three categories:

#### 6a. Agent Prompt Improvements

For each agent that had failures:
```markdown
### Agent Prompt: <agent-type>

**Issue**: <description of failure pattern>
**Frequency**: <N> occurrences

**Suggested Addition**:
```diff
# .claude/agents/<agent-type>.md
+ ## Common Pitfalls
+ - <specific warning based on failure>
```
```

#### 6b. Debug Knowledge Entries

For each new pattern discovered:
```markdown
### Debug Knowledge: <pattern-name>

**Pattern**: <slug-for-filename>
**Symptom**: <error message or behavior>
**Cause**: <root cause from debug resolution>
**Fix**: <solution that worked>

**Suggested File**: `.claude/debug-knowledge/<pattern>.md`
```

#### 6c. Workflow Config Updates

For systemic issues:
```markdown
### Workflow Config

**Issue**: <systemic problem>
**Recommendation**: <config change>

**Suggested Update**:
```yaml
# project.yaml
workflow:
  <setting>: <new-value>
```
```

### Step 7: Present Report for Approval

Display the complete analysis:

```markdown
## Retrospective Analysis: <epic-id>

### Executive Summary
- **Epic**: <title>
- **Tasks**: <completed>/<total> (<blocked> blocked)
- **Debug Loops**: <count>
- **Efficiency Score**: <score>/10

### Analysis

#### What Went Well
- <positive observation 1>
- <positive observation 2>

#### Areas for Improvement
- <issue 1>: <brief description>
- <issue 2>: <brief description>

### Recommendations

<recommendations from Step 6>

---

**Approval Required**

Which changes should be applied?

1. Apply all recommendations
2. Apply selectively (I'll specify which)
3. Skip all changes (archive report only)
4. Cancel retrospective
```

#### Dry Run Mode

When `--dry-run` is specified, present the report and then skip to completion:

```markdown
---

**DRY RUN: No files were modified**

This was a preview of the retrospective analysis. To apply changes, run:
`/retro <epic-id>` (without --dry-run)
```

In dry-run mode:
- **Skip Step 8** (Apply Approved Changes)
- **Skip Step 9** (Archive Retrospective)
- **Skip Step 10** (Update Accumulated Insights)

No approval prompt is shown since no changes will be applied.

### Step 8: Apply Approved Changes

For each approved change:

#### Agent Prompt Updates
```bash
# Append to agent file
cat >> .claude/agents/<agent-type>.md << 'EOF'

## Common Pitfalls
- <new pitfall warning>
EOF
```

#### Debug Knowledge Entries
```bash
# Create new debug knowledge file
cat > .claude/debug-knowledge/<pattern>.md << 'EOF'
# <Pattern Name>

## Symptom
<symptom description>

## Cause
<root cause>

## Fix
<solution>

## Source
Discovered during epic: <epic-id>
EOF
```

#### Workflow Config Updates
Require explicit confirmation before modifying `project.yaml`.

### Step 9: Archive Retrospective

Write the full retrospective to archive:

```bash
mkdir -p .claude/retrospectives

cat > .claude/retrospectives/<epic-id>.md << 'EOF'
# Retrospective: <epic-id>

**Date**: <date>
**Efficiency Score**: <score>/10

## Summary
- Tasks: <completed>/<total>
- Debug Loops: <count>
- Blocked: <count>

## Findings
<analysis content>

## Changes Applied
- [ ] <change 1> - Applied/Skipped
- [ ] <change 2> - Applied/Skipped

## Recommendations Deferred
<any skipped recommendations for future consideration>
EOF
```

### Step 10: Update Accumulated Insights

Append to the insights file:

```bash
cat >> .claude/retrospectives/INSIGHTS.md << 'EOF'

## Epic: <epic-id> (<date>)
- **Score**: <score>/10
- **Key Learning**: <one-line summary>
- **Patterns Added**: <list of new debug-knowledge entries>
EOF
```

If INSIGHTS.md doesn't exist, create with header:
```markdown
# Workflow Insights

Accumulated learnings from epic retrospectives.

---
```

---

## Output Format

### Retrospective Report

```markdown
# Retrospective: <epic-id>

**Date**: YYYY-MM-DD
**Efficiency Score**: N/10

## Executive Summary

| Metric | Value |
|--------|-------|
| Tasks Completed | X/Y |
| Tasks Blocked | Z |
| Debug Loops | N |
| Token Estimate | ~NK |

## Task Breakdown

| Task | Status | Attempts | Notes |
|------|--------|----------|-------|
| <id> | closed | 1 | First try |
| <id> | closed | 2 | Debug: null check |
| <id> | blocked | 3 | Max attempts |

## Patterns Identified

### <Pattern Name>
- **Occurrences**: N
- **Resolution**: <how it was fixed>
- **Prevention**: <how to avoid in future>

## Recommendations

### Immediate
- [ ] <actionable item>

### For Future Epics
- [ ] <consideration for similar work>

## Changes Applied
- <list of files modified>
```

---

## Handling Edge Cases

### Insufficient Data

When telemetry is missing or incomplete:

```markdown
## Retrospective: <epic-id>

**Limited Analysis Mode**

Telemetry data unavailable. Analysis based on beads data only.

### Available Information
- Tasks: <from bd list>
- Final status: <from bd show>

### Unable to Determine
- Debug loop count
- Token usage
- Failure patterns

Recommendation: Enable telemetry capture for future epics.
```

### No Issues Found

When execution was flawless:

```markdown
## Retrospective: <epic-id>

**Efficiency Score**: 11/10 (Perfect execution bonus)

All tasks completed on first attempt with no debug loops or blocked tasks.

### Analysis
No issues to address. Current workflow configuration is working well for this type of feature.

### Optional
- Archive this as a reference for similar features
- Note the task structure for reuse
```

### Multiple Epics (--recent)

When analyzing multiple epics:

```markdown
## Retrospective Summary: Last N Epics

| Epic | Score | Debug | Blocked | Key Issue |
|------|-------|-------|---------|-----------|
| <id> | 8/10 | 2 | 0 | State binding |
| <id> | 10/10 | 0 | 0 | Clean |
| <id> | 6/10 | 3 | 1 | Type errors |

### Cross-Epic Patterns
- <pattern> appeared in N epics
- <agent> had issues in N epics

### Consolidated Recommendations
<merged recommendations addressing multiple epics>
```

---

## Token Budget

Target: ~2000 tokens total for retrospective

| Component | Budget |
|-----------|--------|
| Read telemetry | ~300 |
| Read beads summary | ~200 |
| Read existing patterns | ~200 |
| Analysis prompt | ~300 |
| Generate report | ~500 |
| Apply changes | ~300 |
| Archive | ~200 |

**Efficiency principle**: The 2K token investment should prevent 5-10K in future debug loops.

---

## Example Interactions

### Example 1: Standard Retrospective

**User:** /retro bd-x7y8

**Claude:**
```markdown
## Retrospective Analysis: bd-x7y8

### Executive Summary
- **Epic**: Athlete Experience Tracking
- **Tasks**: 4/5 completed (1 blocked)
- **Debug Loops**: 2
- **Efficiency Score**: 5/10

### Analysis

#### What Went Well
- Database schema task completed first try
- UI components rendered correctly

#### Areas for Improvement
- SwiftUI state binding caused 2 debug loops
- TypeScript null check missing in edge function

### Recommendations

#### Agent Prompt: swift-agent
**Issue**: State binding errors in child views
**Suggested Addition**:
```diff
+ ## Common Pitfalls
+ - Use @Binding in child views, not @State
+ - Initialize state before view body
```

#### Debug Knowledge: swiftui-state-binding
**Pattern**: swiftui-state-binding
**Symptom**: View not updating on state change
**Cause**: @State used in child view instead of @Binding
**Fix**: Change @State to @Binding, pass from parent

---

**Approval Required**

Which changes should be applied?
1. Apply all recommendations
2. Apply selectively
3. Skip all (archive only)
4. Cancel
```

**User:** 1

**Claude:**
```
Applying changes...

- Updated: .claude/agents/swift-agent.md
- Created: .claude/debug-knowledge/swiftui-state-binding.md
- Archived: .claude/retrospectives/bd-x7y8.md
- Updated: .claude/retrospectives/INSIGHTS.md

Retrospective complete.
```

### Example 2: Clean Execution

**User:** /retro bd-a1b2

**Claude:**
```markdown
## Retrospective Analysis: bd-a1b2

### Executive Summary
- **Epic**: Task List Filter
- **Tasks**: 3/3 completed
- **Debug Loops**: 0
- **Efficiency Score**: 11/10

All tasks completed on first attempt. No issues to address.

Options:
1. Archive this retrospective
2. Skip (no archive)
```

### Example 3: From /run-tasks Completion

**Claude (at Step 10):**
```
All tasks for "User Authentication" are complete.

Completed: 6 tasks
Blocked: 0 tasks
Debug loops: 3

Options:
1. Merge and close epic
2. Merge and close with retrospective (recommended - debug loops detected)
3. Keep open for manual review
```

**User:** 2

**Claude:** [Proceeds with retrospective flow, then merge]

### Example 4: Insufficient Data

**User:** /retro bd-old1

**Claude:**
```markdown
## Retrospective: bd-old1

**Limited Analysis Mode**

Telemetry data not found for this epic. This epic may predate telemetry capture.

### Available Information (from beads)
- Tasks: 4 total, 4 closed
- Created: 2024-01-15
- Type: Epic

### Recommendation
For future epics, ensure telemetry capture is enabled in project.yaml:

```yaml
workflow:
  retrospective:
    capture_metrics: true
```

Options:
1. Generate basic summary from beads only
2. Skip retrospective
```

### Example 5: Dry Run Preview

**User:** /retro bd-x7y8 --dry-run

**Claude:**
```markdown
## Retrospective Analysis: bd-x7y8

### Executive Summary
- **Epic**: Athlete Experience Tracking
- **Tasks**: 4/5 completed (1 blocked)
- **Debug Loops**: 2
- **Efficiency Score**: 5/10

### Analysis

#### What Went Well
- Database schema task completed first try
- UI components rendered correctly

#### Areas for Improvement
- SwiftUI state binding caused 2 debug loops
- TypeScript null check missing in edge function

### Recommendations

#### Agent Prompt: swift-agent
**Issue**: State binding errors in child views
**Suggested Addition**:
```diff
+ ## Common Pitfalls
+ - Use @Binding in child views, not @State
+ - Initialize state before view body
```

#### Debug Knowledge: swiftui-state-binding
**Pattern**: swiftui-state-binding
**Symptom**: View not updating on state change
**Cause**: @State used in child view instead of @Binding
**Fix**: Change @State to @Binding, pass from parent

---

**DRY RUN: No files were modified**

This was a preview of the retrospective analysis. To apply changes, run:
`/retro bd-x7y8` (without --dry-run)
```

---

## Files Modified

This skill may create or modify:

| Path | Action | Approval |
|------|--------|----------|
| `.claude/retrospectives/<epic-id>.md` | Create | Automatic |
| `.claude/retrospectives/INSIGHTS.md` | Append | Automatic |
| `.claude/debug-knowledge/<pattern>.md` | Create | Required |
| `.claude/agents/<agent>.md` | Append | Required |
| `project.yaml` | Modify | Required |

---

## Configuration

```yaml
# project.yaml
workflow:
  retrospective:
    # Trigger conditions
    prompt_frequency: 3          # Offer every N epics
    prompt_on_debug: true        # Always offer if debug loops
    prompt_on_blocked: true      # Always offer if blocked tasks

    # Data capture (during /run-tasks)
    capture_metrics: true
    capture_token_estimates: true

    # Storage locations
    metrics_dir: .claude/metrics
    retrospectives_dir: .claude/retrospectives
    insights_file: .claude/retrospectives/INSIGHTS.md

    # Auto-apply (vs require approval)
    auto_apply:
      debug_knowledge: true      # New pattern files
      agent_prompts: false       # Require approval
      workflow_config: false     # Require approval
```

---

## Integration with /run-tasks

The retrospective skill is invoked from `/run-tasks` Step 10 when user selects Option 2:

```python
# In run-tasks Step 10
if user_choice == 2:  # "Merge and close with retrospective"
    # Run retrospective before merge
    await invoke_skill('retro', epic_id)

    # Then proceed with merge
    await merge_and_close_epic(epic_id)
```

The retrospective runs inline, allowing the user to review and approve changes before the epic is finalized.
