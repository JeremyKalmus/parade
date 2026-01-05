# Epic Retrospective & Workflow Improvement

## Overview

At epic completion, optionally run a retrospective to analyze what worked, what didn't, and how to improve future executions. The goal is **continuous efficiency improvement** - more accuracy with fewer tokens over time.

---

## When to Trigger

After Step 10 (Epic Completion Check), offer the user a retrospective:

```
All tasks for "Athlete Experience Tracking" are complete.

Completed: 5 tasks
Blocked: 0 tasks

Options:
1. Close epic and merge to main
2. Close epic with retrospective (analyze for improvements)
3. Keep open for manual review
```

**Recommended frequency**: Every 3-5 epics, or when:
- Debug loops were triggered
- Tasks were blocked
- Execution felt slow or token-heavy
- New patterns emerged

---

## What to Capture During Execution

To enable efficient retrospectives, capture metrics during `/run-tasks`:

### Execution Metrics File

```markdown
<!-- .claude/metrics/<epic-id>.md - written during execution -->

# Execution Metrics: {epic-id}

## Summary
- **Epic**: {title}
- **Tasks**: {total} ({completed} completed, {blocked} blocked)
- **Batches**: {batch_count}
- **Total Duration**: {duration}

## Token Usage (Estimated)
| Phase | Tokens |
|-------|--------|
| Orchestration prompts | ~2,000 |
| Agent spawns | ~15,000 |
| Debug loops | ~8,000 |
| Verification | ~3,000 |
| **Total** | **~28,000** |

## Agent Performance
| Agent | Tasks | Success | Failures | Avg Attempts |
|-------|-------|---------|----------|--------------|
| swift-agent | 2 | 2 | 0 | 1.0 |
| typescript-agent | 2 | 1 | 1 | 1.5 |
| sql-agent | 1 | 1 | 0 | 1.0 |

## Debug Sessions
| Task | Attempts | Resolution |
|------|----------|------------|
| bd-x7y8.4 | 2 | Fixed: missing null check |

## Friction Points
- [ ] Task bd-x7y8.3 required 2 agent spawns (unclear acceptance criteria)
- [ ] Merge conflict on batch 2 (overlapping file edits)

## Patterns Observed
- SwiftUI state binding issues (similar to bd-x7y8.4)
- Edge function timeout pattern
```

### How to Capture (Low Overhead)

```python
def log_metric(epic_id, event_type, data):
    """Append to metrics file during execution"""
    metrics_file = f".claude/metrics/{epic_id}.md"

    # Lightweight append - no context accumulation
    with open(metrics_file, 'a') as f:
        f.write(f"\n## {event_type}\n")
        f.write(f"{data}\n")
```

Called at key points:
- Epic start (initialize file)
- Each batch complete (agent results)
- Each debug attempt (what failed, what fixed)
- Task blocked (reason)
- Epic complete (summary)

---

## Retrospective Process

### Step 1: Gather Context (Token-Efficient)

Don't re-read all code. Read only:
1. **Metrics file**: `.claude/metrics/<epic-id>.md`
2. **Beads summary**: `bd list --parent <epic-id> --json`
3. **Debug knowledge**: Check if new patterns were added
4. **Git log**: `git log epic/<epic-id>..main --oneline`

```python
def gather_retro_context(epic_id):
    return {
        'metrics': read_file(f".claude/metrics/{epic_id}.md"),
        'tasks': run("bd list --parent {epic_id} --json"),
        'debug_patterns': glob(".claude/debug-knowledge/*.md"),
        'git_summary': run("git log --oneline -20")
    }
    # Total: ~2-3K tokens instead of re-reading everything
```

### Step 2: Analysis Prompts

Ask focused questions:

```markdown
## Retrospective Analysis: {epic-id}

Based on the execution metrics:

### Efficiency
1. Which tasks took multiple attempts? Why?
2. Were any agent prompts unclear?
3. Could tasks have been parallelized better?

### Token Usage
1. Were debug loops avoidable with better initial prompts?
2. Did any agents produce verbose output that could be trimmed?
3. Were there redundant file reads?

### Patterns
1. Did similar errors occur across tasks?
2. Should new debug-knowledge entries be created?
3. Are there reusable solutions to document?

### Workflow Friction
1. Were task dependencies optimal?
2. Did worktree/merge strategy work smoothly?
3. Any steps that felt manual but could be automated?
```

### Step 3: Generate Recommendations

Output structured recommendations:

```markdown
# Retrospective: {epic-id}

## Executive Summary
- **Efficiency Score**: 7/10 (2 debug loops, 1 blocked task)
- **Token Efficiency**: Could improve ~20% with clearer agent prompts
- **New Patterns**: 1 documented (swiftui-state-binding.md)

## Recommendations

### Immediate Actions
- [ ] Update swift-agent prompt to include state binding warning
- [ ] Add "null check" to typescript-agent checklist
- [ ] Document edge function timeout pattern

### Workflow Improvements
- [ ] Consider adding `verify_nullable` step before implementation
- [ ] Task bd-x7y8.3 acceptance criteria was vague - template update needed

### For Future Epics
- [ ] Similar features should pre-check for state management patterns
- [ ] Consider TDD for typescript tasks (caught issues late)

## Suggested Changes

### Agent Prompt Update
```diff
# .claude/agents/swift-agent.md
+ ## Common Pitfalls
+ - SwiftUI @State bindings must be initialized before view body
+ - Use @Binding for child views, not @State
```

### Debug Knowledge Addition
```markdown
# .claude/debug-knowledge/swiftui-state-binding.md
## Pattern: SwiftUI State Binding Errors
**Symptom**: View not updating when state changes
**Cause**: @State used in child view instead of @Binding
**Fix**: Change @State to @Binding, pass from parent
```

### Workflow Config Tweak
```yaml
# project.yaml
workflow:
  # Learned: typescript tasks benefit from TDD
  tdd_enabled: true
  skip_tdd_for:
    - sql  # Schema tasks don't need TDD
```
```

---

## Where Learnings Go

### 1. Debug Knowledge (Patterns)
```
.claude/debug-knowledge/
├── swiftui-state-binding.md     ← NEW from this epic
├── edge-function-timeout.md     ← NEW from this epic
└── jwt-token-expiry.md          ← existing
```

### 2. Agent Prompt Updates
```
.claude/agents/
├── swift-agent.md               ← Updated with pitfalls
├── typescript-agent.md          ← Updated with checklist
└── ...
```

### 3. Workflow Config
```yaml
# project.yaml - tuned settings
workflow:
  tdd_enabled: true
  ralph:
    use_for_debug: true
    max_iterations:
      debug: 8  # Reduced from 10, patterns now documented
```

### 4. Retrospective Archive
```
.claude/retrospectives/
├── bd-x7y8.md                   ← This epic's retro
├── bd-a1b2.md                   ← Previous epic
└── INSIGHTS.md                  ← Accumulated cross-epic learnings
```

---

## Accumulated Insights

After multiple retrospectives, patterns emerge. Track in a single file:

```markdown
<!-- .claude/retrospectives/INSIGHTS.md -->

# Workflow Insights

## Token Efficiency Wins
- **Agent prompts under 500 tokens**: 30% faster execution
- **Explicit acceptance criteria**: Reduces debug loops by 40%
- **TDD for typescript**: Catches 80% of issues before debug phase

## Common Failure Patterns
| Pattern | Frequency | Prevention |
|---------|-----------|------------|
| State binding (SwiftUI) | 5 epics | Added to swift-agent prompt |
| Null checks (TypeScript) | 3 epics | Added to typescript checklist |
| RLS policy errors | 2 epics | Added verification step |

## Workflow Optimizations Applied
- [x] Reduced debug max_iterations: 10 → 8 (patterns documented)
- [x] Added pre-flight checks for common issues
- [x] Parallel batch threshold: 2 → 3 tasks (reduced overhead)

## Metrics Over Time
| Epic | Tasks | Debug Loops | Tokens (est) | Efficiency |
|------|-------|-------------|--------------|------------|
| bd-a1b2 | 4 | 3 | 35K | Baseline |
| bd-c3d4 | 5 | 2 | 28K | +20% |
| bd-x7y8 | 5 | 1 | 22K | +37% |
```

---

## Implementation

### Update Step 10 in SKILL.md

```markdown
### Step 10: Epic Completion Check

When no more ready work AND all child tasks are closed:

**Ask the user:**
```
All tasks for "<epic-title>" are complete.

Completed: X tasks
Blocked: Y tasks (if any)
Debug loops: Z

Options:
1. Merge and close epic
2. Merge and close with retrospective
3. Keep open for manual review
```

**If option 2 (with retrospective):**
1. Read `.claude/metrics/<epic-id>.md`
2. Analyze execution patterns
3. Generate recommendations
4. Apply approved changes to:
   - `.claude/debug-knowledge/`
   - `.claude/agents/`
   - `project.yaml`
   - `.claude/retrospectives/`
5. Proceed with merge and close
```

### Metrics Capture Points

Add to execution flow:

```python
def run_tasks(epic_id):
    # Initialize metrics
    init_metrics(epic_id)

    while True:
        ready = bd_ready(epic_id)
        if not ready:
            break

        batch_start = time.now()
        results = execute_batch(ready, epic_id)
        log_batch_metrics(epic_id, results, time.now() - batch_start)

        for task, result in results:
            if result.debug_attempts > 0:
                log_debug_metrics(epic_id, task, result)

    # Final summary
    finalize_metrics(epic_id)

    # Offer retrospective
    if user_wants_retrospective():
        run_retrospective(epic_id)
```

---

## Token Cost of Retrospective

The retrospective itself should be lightweight:

| Component | Tokens |
|-----------|--------|
| Read metrics file | ~500 |
| Beads summary | ~200 |
| Analysis prompt | ~300 |
| Generate recommendations | ~1,000 |
| **Total** | **~2,000** |

Compare to potential savings:
- Preventing 1 debug loop: ~5,000 tokens saved per future epic
- Clearer prompts: ~10% reduction across all agent spawns

**ROI**: 2K token investment → 5-10K savings per epic going forward.

---

## Configuration

```yaml
# project.yaml
workflow:
  retrospective:
    # When to prompt
    prompt_frequency: 3  # Every N epics, or always if 'always'
    prompt_on_debug: true  # Always prompt if debug loops occurred
    prompt_on_blocked: true  # Always prompt if tasks were blocked

    # What to capture
    capture_metrics: true
    capture_token_estimates: true

    # Where to store
    metrics_dir: .claude/metrics
    retrospectives_dir: .claude/retrospectives
    insights_file: .claude/retrospectives/INSIGHTS.md

    # Auto-apply safe changes
    auto_apply:
      debug_knowledge: true  # New patterns
      agent_prompts: false   # Require approval
      workflow_config: false # Require approval
```

---

## Summary

| Aspect | Design Choice | Why |
|--------|---------------|-----|
| **When** | User choice at epic end | Not every epic needs review |
| **Input** | Metrics file, not full context | Token efficient |
| **Output** | Structured recommendations | Actionable |
| **Storage** | Separate from code | Easy to review/revert |
| **Accumulation** | INSIGHTS.md | Cross-epic learning |
| **Cost** | ~2K tokens | Pays for itself quickly |

The workflow gets smarter over time: patterns get documented, prompts get refined, and token usage decreases while accuracy increases.
