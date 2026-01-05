# Stop Hook Task Enforcement

## Overview

The stop hook ensures Claude completes ALL tasks before exiting. When Claude attempts to exit (due to context limits, confusion, or premature completion), the hook intercepts and re-feeds the original prompt, forcing Claude to check for remaining work.

This is about **persistence and completeness**, not debugging or iteration.

---

## The Problem

Without enforcement, Claude may exit early:

```
Epic: bd-x7y8 (5 tasks)

Claude works on tasks...
├── ✅ bd-x7y8.1: Complete
├── ✅ bd-x7y8.2: Complete
├── ⏳ bd-x7y8.3: In progress...
│
└── Claude: "I've made good progress on the feature.
            Let me know if you need anything else!"

            [EXITS - 2 tasks never started]
```

**Why this happens:**
- Context window filling up
- Long task causes Claude to lose track
- Ambiguous completion criteria
- Claude being "polite" and not wanting to run too long

---

## The Solution: Stop Hook

```bash
# .claude/hooks/stop.sh (or configured via Claude Code settings)

# When Claude tries to exit, re-feed the orchestration prompt
if has_incomplete_tasks; then
    echo "Incomplete tasks detected. Continuing..."
    feed_prompt "$ORIGINAL_PROMPT"
fi
```

**Flow:**
```
1. Claude tries to exit
2. Stop hook checks: `bd ready --json`
3. If tasks remain → re-feed prompt
4. Claude sees same prompt + updated beads state
5. Claude continues working
6. Repeat until `bd ready` returns empty
```

---

## Token-Optimized Design

### Key Insight: State Lives in Beads, Not Context

The prompt stays **constant and small**. Claude discovers work by querying beads:

```markdown
# Orchestration Prompt (stays the same each cycle)

You are running /run-tasks for epic: {epic_id}

## Your Loop
1. Run: `bd ready --json`
2. If empty → <promise>EPIC COMPLETE</promise>
3. If tasks exist → execute next batch
4. After batch → repeat from step 1

## Completion Signal
Only output <promise>EPIC COMPLETE</promise> when:
- `bd ready --json` returns no tasks
- All tasks are closed or blocked

Do not exit until the promise is output.
```

**Why this is token-efficient:**
- Prompt: ~200 tokens (constant)
- Task state: external (beads DB)
- Git state: external (file system)
- No context accumulation between cycles

### Compare to Naive Approach

```
❌ BAD: Context accumulation
Cycle 1: "Do tasks 1-5" + Claude's work narrative (5K tokens)
Cycle 2: Previous + more narrative (10K tokens)
Cycle 3: Previous + more narrative (15K tokens)
...runs out of context

✅ GOOD: External state
Cycle 1: "Check bd ready, do work" (200 tokens) → Claude queries beads
Cycle 2: "Check bd ready, do work" (200 tokens) → Claude queries beads
Cycle 3: "Check bd ready, do work" (200 tokens) → Claude queries beads
...constant token usage per cycle
```

---

## Implementation

### 1. The Orchestration Prompt

Create a minimal, repeatable prompt:

```markdown
<!-- .claude/prompts/run-tasks.md -->

# Task Orchestrator: {epic_id}

Execute all tasks for this epic using the /run-tasks workflow.

## Check for Work
```bash
bd ready --json
```

## If Tasks Exist
1. Create worktrees for batch
2. Spawn agents
3. Verify and merge
4. Update beads status
5. **Return to "Check for Work"**

## Completion Criteria
Output `<promise>ALL TASKS COMPLETE</promise>` ONLY when:
- `bd ready --json` returns `[]`
- Epic has no open tasks

## Important
- Do NOT exit until the promise is output
- Do NOT summarize progress mid-epic
- Do NOT ask "anything else?" until complete
```

### 2. Stop Hook Configuration

Configure the stop hook to check beads state:

```bash
#!/bin/bash
# .claude/hooks/stop.sh

EPIC_ID="$1"

# Check if there's remaining work
READY_COUNT=$(bd ready --json | jq 'length')

if [ "$READY_COUNT" -gt 0 ]; then
    echo "⚠️ $READY_COUNT tasks still ready. Continuing..."

    # Re-feed the orchestration prompt
    cat .claude/prompts/run-tasks.md | sed "s/{epic_id}/$EPIC_ID/"
    exit 1  # Signal to continue
fi

# Check for in-progress tasks that might be stuck
IN_PROGRESS=$(bd list --status in_progress --json | jq 'length')

if [ "$IN_PROGRESS" -gt 0 ]; then
    echo "⚠️ $IN_PROGRESS tasks still in progress. Continuing..."
    cat .claude/prompts/run-tasks.md | sed "s/{epic_id}/$EPIC_ID/"
    exit 1
fi

echo "✅ All tasks complete. Epic $EPIC_ID finished."
exit 0  # Allow exit
```

### 3. Integration with /run-tasks Skill

Update the skill to use the enforcement pattern:

```python
def run_tasks(epic_id):
    # Setup: Create epic branch, etc.
    setup_epic(epic_id)

    # Main loop with stop hook enforcement
    while True:
        ready = bd_ready(epic_id)

        if not ready:
            # Check for stuck in-progress tasks
            in_progress = bd_list(status='in_progress', parent=epic_id)
            if in_progress:
                handle_stuck_tasks(in_progress)
                continue

            # Truly complete
            print("<promise>ALL TASKS COMPLETE</promise>")
            break

        # Execute batch
        execute_batch(ready, epic_id)

        # Loop continues - stop hook will catch premature exits
```

---

## Completion Promise Pattern

The stop hook looks for a specific promise tag to allow exit:

```markdown
## Valid Completion Signals

<promise>ALL TASKS COMPLETE</promise>    ✅ Allows exit
<promise>EPIC COMPLETE</promise>          ✅ Allows exit
<promise>BLOCKED - NEEDS USER</promise>   ✅ Allows exit (escalation)

## Invalid (Will Re-trigger)

"I've completed the available tasks"     ❌ Re-feeds prompt
"Let me know if you need anything"       ❌ Re-feeds prompt
"The feature is ready for review"        ❌ Re-feeds prompt
```

### Allowed Exit Conditions

```bash
# stop.sh - conditions that allow exit

allow_exit() {
    # All tasks done
    [ $(bd ready --json | jq 'length') -eq 0 ] &&
    [ $(bd list --status in_progress --parent $EPIC_ID --json | jq 'length') -eq 0 ]
}

allow_escalation() {
    # All remaining tasks are blocked (needs human)
    OPEN=$(bd list --status open --parent $EPIC_ID --json | jq 'length')
    BLOCKED=$(bd list --status blocked --parent $EPIC_ID --json | jq 'length')
    [ "$OPEN" -eq "$BLOCKED" ]
}

if allow_exit || allow_escalation; then
    exit 0  # Allow Claude to exit
else
    # Re-feed prompt
    exit 1
fi
```

---

## Handling Edge Cases

### Context Window Limits

If Claude hits context limits mid-epic:

```markdown
## In orchestration prompt:

If you're approaching context limits:
1. Commit current work: `git add -A && git commit -m "WIP: checkpoint"`
2. Update task status: `bd update <task-id> --status in_progress`
3. Output: <promise>CONTEXT LIMIT - CHECKPOINT</promise>

The stop hook will start a fresh session with the same prompt.
You'll see your previous work in git and beads state.
```

### Stuck Tasks

If a task is in_progress but agent hasn't reported:

```python
def handle_stuck_tasks(tasks):
    for task in tasks:
        # Check if worktree still exists
        worktree = f"agent-{task.id}"
        if worktree_exists(worktree):
            # Agent might still be working - wait
            continue
        else:
            # Worktree gone but task not closed - something went wrong
            bd_update(task.id, status='blocked',
                     notes='Agent exited without completing')
```

### Infinite Loop Prevention

```bash
# stop.sh - prevent infinite loops

MAX_CYCLES=50
CYCLE_FILE=".claude/.stop-hook-cycles"

# Increment cycle counter
CYCLES=$(cat $CYCLE_FILE 2>/dev/null || echo 0)
CYCLES=$((CYCLES + 1))
echo $CYCLES > $CYCLE_FILE

if [ $CYCLES -gt $MAX_CYCLES ]; then
    echo "⚠️ Max cycles ($MAX_CYCLES) reached. Forcing exit."
    echo "Review: bd list --parent $EPIC_ID"
    rm $CYCLE_FILE
    exit 0  # Force allow exit
fi

# Reset counter on successful completion
if allow_exit; then
    rm $CYCLE_FILE
    exit 0
fi
```

---

## Configuration

Add to `project.yaml`:

```yaml
workflow:
  stop_hook:
    enabled: true

    # What triggers re-feed
    check_ready_tasks: true
    check_in_progress: true

    # Safety limits
    max_cycles: 50

    # Allowed exit conditions
    allow_exit_on:
      - all_complete
      - all_blocked  # Escalate to user
      - context_checkpoint

    # Promise patterns that allow exit
    completion_promises:
      - "ALL TASKS COMPLETE"
      - "EPIC COMPLETE"
      - "BLOCKED - NEEDS USER"
      - "CONTEXT LIMIT - CHECKPOINT"
```

---

## Summary

| Aspect | Traditional | With Stop Hook |
|--------|-------------|----------------|
| Exit control | Claude decides | Beads state decides |
| Completion | "I think I'm done" | `bd ready` returns `[]` |
| Token usage | Accumulates | Constant per cycle |
| Persistence | May give up | Continues until done |
| State | In context | External (beads + git) |

**Key principle**: Claude doesn't track task state in context. It queries beads each cycle. The stop hook ensures it keeps querying until truly complete.
