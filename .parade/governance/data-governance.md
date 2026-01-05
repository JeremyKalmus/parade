# Data Governance: Issue Types and Labels

This document defines the governance policies for issue classification in the Parade workflow system.

---

## Issue Type Enum (Structural Only)

The `issue_type` field is a **structural classifier** that defines the hierarchy and relationships between work items. It is NOT for categorizing the nature of work.

### Valid Values

| Value | Description |
|-------|-------------|
| `epic` | A collection of related tasks representing a feature or initiative |
| `task` | An individual unit of work that can be assigned and tracked |

### Rule

**All child work under an epic MUST use `issue_type='task'`.**

Never use 'bug', 'feature', 'enhancement', etc. as `issue_type` values. The issue type enum is reserved strictly for structural classification.

---

## Type Labels (Categorization)

Use **labels** to categorize the nature of work. Labels are prefixed with `type:` to distinguish them from other label categories (e.g., `agent:`, `priority:`).

### Standard Type Labels

| Label | Description |
|-------|-------------|
| `type:bug` | Defect fix - correcting incorrect behavior |
| `type:feature` | New functionality - adding capabilities that didn't exist |
| `type:enhancement` | Improvement to existing functionality |
| `type:chore` | Maintenance, refactoring, cleanup, dependencies |
| `type:docs` | Documentation only changes |

---

## Examples

### Correct Usage

```
issue_type: task
labels: [type:bug, agent:typescript]
```

A task that fixes a bug, assigned to the typescript agent.

```
issue_type: task
labels: [type:feature, type:docs]
```

A task that adds new functionality and includes documentation updates.

```
issue_type: epic
labels: [type:feature]
```

An epic representing a new feature initiative.

### Incorrect Usage

```
issue_type: bug        # WRONG - 'bug' is not a valid issue_type
labels: []
```

```
issue_type: feature    # WRONG - 'feature' is not a valid issue_type
labels: [agent:swift]
```

---

## Rationale

### Why Separate Structure from Categorization?

1. **Labels allow multiple categorizations** - A single task can be both a `type:bug` fix that also includes `type:docs` updates. Using labels enables this flexibility.

2. **Issue type is structural** - The `issue_type` field defines parent-child relationships and workflow behavior. Epics contain tasks; this hierarchy should not be polluted with categorization concerns.

3. **Query simplicity** - Searching for "all bugs" is straightforward: filter by `type:bug` label. Searching for "all tasks under an epic" is also straightforward: filter by `issue_type='task'` and parent relationship.

4. **Extensibility** - New categorization types can be added as labels without schema changes. The structural types (`epic`, `task`) rarely need to change.

5. **Consistency** - All implementation work uses the same issue_type (`task`), making workflow automation predictable. The nature of that work (bug, feature, etc.) is orthogonal.

---

## Migration Notes

If existing data contains invalid `issue_type` values (e.g., 'bug', 'feature'):

1. Update `issue_type` to `'task'`
2. Add appropriate `type:*` label to preserve categorization
3. Run validation to ensure no invalid issue_type values remain
