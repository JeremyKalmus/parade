# Ralph Wiggum Integration

## Overview

Ralph Wiggum is an iterative development technique where the same prompt is fed repeatedly until a completion promise is detected. Each iteration sees previous work in files/git, enabling self-correction.

This document defines when and how to use Ralph loops in the task execution workflow, with token optimization strategies.

---

## When to Use Ralph

### Good Candidates

| Task Type | Why Ralph Works |
|-----------|-----------------|
| **Debug loops** | Clear success criteria (tests pass), benefits from iteration |
| **TDD GREEN phase** | Run tests → fix → repeat until passing |
| **Linting/formatting** | Fix → check → fix until clean |
| **Migration scripts** | Run → fix errors → run until complete |

### Poor Candidates

| Task Type | Why Not Ralph |
|-----------|---------------|
| **Research/exploration** | No clear completion criteria |
| **Architecture decisions** | Requires human judgment |
| **Multi-file features** | Too broad, use sub-agents |
| **One-shot tasks** | No iteration needed |

---

## Token Optimization Strategies

### 1. Minimal Loop Prompts

Keep the Ralph prompt small - detailed context lives in files:

```markdown
<!-- BAD: Prompt with full context -->
Fix the authentication bug. The bug is in auth.ts line 45 where
the token refresh logic fails when... [500 words of context]

<!-- GOOD: Prompt points to files -->
Fix failing tests in src/auth/.

Read: .claude/tasks/bd-x7y8.3.md for requirements
Run: npm test src/auth/
Output: <promise>TESTS PASS</promise> when all tests pass
```

**Target**: Loop prompt under 500 tokens.

### 2. File-Based State

Store iteration state in files, not prompt:

```markdown
<!-- .claude/.ralph-state.md -->
## Iteration Log

### Iteration 1
- Attempted: Added null check to token refresh
- Result: 3/5 tests passing
- Next: Handle expired token edge case

### Iteration 2
- Attempted: Added expiry check before refresh
- Result: 4/5 tests passing
- Next: Fix race condition in concurrent refresh
```

The loop prompt stays constant; Claude reads state from file.

### 3. Checkpoint Summarization

For long loops, periodically summarize to reduce context:

```python
def ralph_with_checkpoints(prompt, max_iterations=20, checkpoint_every=5):
    for i in range(max_iterations):
        result = run_iteration(prompt)

        if result.has_promise:
            return result

        # Every N iterations, summarize and compress
        if i > 0 and i % checkpoint_every == 0:
            summarize_iteration_log()  # Compresses .ralph-state.md
            run("git add -A && git commit -m 'Ralph checkpoint {i}'")
```

### 4. Scoped Worktrees

Each Ralph loop runs in its own worktree to isolate state:

```bash
# Create isolated worktree for Ralph loop
bd worktree create ralph-bd-x7y8.3 --branch ralph/bd-x7y8.3 --base epic/bd-x7y8

# Run Ralph in worktree
cd ../ralph-bd-x7y8.3
/ralph-loop "Fix tests" --max-iterations 10 --completion-promise "TESTS PASS"

# Merge back on success
cd ../main-repo
git merge ralph/bd-x7y8.3 --squash
```

### 5. Hard Iteration Limits

Always set `--max-iterations` to prevent runaway token usage:

| Task Type | Recommended Max |
|-----------|-----------------|
| Simple bug fix | 5 |
| Test fixing (TDD) | 10 |
| Complex debug | 15 |
| Migration/refactor | 20 |

---

## Integration Points

### Replace Debug Loop with Ralph

Current debug loop spawns debug-agent up to 3 times. Ralph could handle this more fluidly:

**Current (Sub-agent approach):**
```python
for attempt in range(3):
    result = spawn_debug_agent(task, test_output)
    if result.status == 'PASS':
        break
```

**With Ralph:**
```python
def debug_with_ralph(task, test_output):
    # Write task context to file
    write_file(f".claude/debug/{task.id}.md", f"""
# Debug Task: {task.id}

## Failing Tests
{test_output}

## Files to Fix
{task.files}

## Instructions
1. Analyze the failure
2. Apply fix
3. Run: npm test {task.test_file}
4. If passing: <promise>FIXED</promise>
5. If failing: Document attempt and continue
""")

    # Run Ralph loop
    run(f"/ralph-loop 'Read .claude/debug/{task.id}.md and fix' "
        f"--max-iterations 10 --completion-promise FIXED")
```

### TDD GREEN Phase with Ralph

Instead of spawning implementation agent once, use Ralph to iterate:

```python
def green_phase_with_ralph(task, test_file):
    # Write implementation task
    write_file(f".claude/tasks/{task.id}.md", f"""
# Implementation Task: {task.id}

## Tests to Pass
{test_file}

## Requirements
{task.acceptance_criteria}

## Instructions
1. Run tests: npm test {test_file}
2. Implement code to pass failing tests
3. Re-run tests
4. When ALL tests pass: <promise>GREEN</promise>
""")

    result = run(f"/ralph-loop 'Implement to pass tests in {test_file}' "
                 f"--max-iterations 15 --completion-promise GREEN")

    return result.success
```

---

## Prompt Templates for Ralph Loops

### Debug Loop Prompt

```markdown
# Debug Loop: {task_id}

Read: .claude/debug/{task_id}.md
Run: {test_command}

If tests pass: <promise>FIXED</promise>
If tests fail: Update .claude/debug/{task_id}.md with attempt log and continue.

Keep attempts minimal and targeted. Check .claude/debug-knowledge/ for patterns.
```

### TDD Implementation Prompt

```markdown
# TDD GREEN: {task_id}

Read: .claude/tasks/{task_id}.md for requirements
Run: {test_command}

Implement the minimum code to pass failing tests.
When all tests pass: <promise>GREEN</promise>
```

### Lint/Format Loop Prompt

```markdown
# Fix Lint Errors

Run: npm run lint
Fix all reported errors.
When clean: <promise>LINT CLEAN</promise>
Max iterations: 5
```

---

## Configuration

Add Ralph settings to `project.yaml`:

```yaml
workflow:
  tdd_enabled: true

  ralph:
    # Enable Ralph for specific phases
    use_for_debug: true
    use_for_green_phase: false  # Start conservative
    use_for_lint: true

    # Token optimization
    max_iterations:
      debug: 10
      green_phase: 15
      lint: 5

    # Checkpoint frequency (iterations between summaries)
    checkpoint_every: 5

    # Fail-safe: abort if iteration exceeds this token count
    max_tokens_per_iteration: 8000
```

---

## Monitoring & Abort

### Iteration Monitoring

Track token usage per iteration:

```markdown
<!-- .claude/.ralph-metrics.md -->
## Ralph Metrics: {task_id}

| Iteration | Tokens In | Tokens Out | Cumulative |
|-----------|-----------|------------|------------|
| 1 | 1,200 | 2,400 | 3,600 |
| 2 | 1,200 | 1,800 | 6,600 |
| 3 | 1,200 | 2,100 | 9,900 |

Threshold: 50,000 tokens
Status: OK (19.8% of limit)
```

### Auto-Abort Conditions

Ralph loop should auto-abort if:
- Max iterations reached
- Token threshold exceeded
- No progress detected (same error 3+ times)
- File system errors

```python
def should_abort_ralph(metrics, config):
    if metrics.iterations >= config.max_iterations:
        return True, "Max iterations reached"

    if metrics.cumulative_tokens >= config.max_tokens:
        return True, "Token threshold exceeded"

    if metrics.repeated_errors >= 3:
        return True, "No progress - same error repeated"

    return False, None
```

---

## Comparison: Sub-Agent vs Ralph

### Token Usage Example (Debug Task)

**Sub-Agent (3 attempts):**
```
Attempt 1: 4K tokens (fresh context)
Attempt 2: 4K tokens (fresh context)
Attempt 3: 4K tokens (fresh context)
Total: 12K tokens
```

**Ralph (10 iterations):**
```
Iteration 1: 3K tokens
Iteration 2: 5K tokens (accumulating)
Iteration 3: 7K tokens
...
Iteration 10: 25K tokens
Total: ~100K tokens (but finds fix faster)
```

**Recommendation**: Use Ralph for tasks where iteration provides value, use sub-agents for independent attempts.

### Hybrid Approach

Best of both worlds:

```python
def smart_debug(task):
    # Try sub-agent first (cheaper)
    for attempt in range(2):
        result = spawn_debug_agent(task)
        if result.success:
            return result

    # If sub-agent fails twice, switch to Ralph (more thorough)
    return debug_with_ralph(task, max_iterations=10)
```

---

## Summary

| Strategy | Token Impact | When to Use |
|----------|--------------|-------------|
| Minimal prompts | -50% | Always |
| File-based state | -30% | Complex tasks |
| Checkpoints | -40% (after N iterations) | Long loops |
| Scoped worktrees | Isolation | Parallel tasks |
| Hard limits | Prevents runaway | Always |
| Hybrid approach | Optimal | Debug/implementation |

**Default recommendation**: Start with sub-agents, fall back to Ralph for stubborn issues.
