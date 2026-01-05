---
name: evolve
description: Capture positive evolutions from epic execution. Detects new components, fields, patterns, and capabilities added during implementation. Updates design registries and agent knowledge. Only proposes changes when truly new additions are found.
---

# Evolve Skill

## Purpose

Capture **positive evolutions** from completed epics - the new components, fields, patterns, and capabilities that were added during implementation. This complements `/retro` (which captures failures) by documenting what was successfully created.

**Key Principle**: Only propose updates for **truly new** additions. If an epic used existing patterns and components, no updates are needed.

## When to Use

- Automatically invoked at `/run-tasks` Step 10 (epic completion)
- User invokes `/evolve <epic-id>` directly
- After any epic that added new UI components, data fields, or patterns

---

## Entry Points

| Invocation | Description |
|------------|-------------|
| `/evolve <epic-id>` | Analyze a specific completed epic |
| `/evolve <epic-id> --dry-run` | Preview without modifying files |
| `/run-tasks` Step 10 | Automatically called before epic close |

---

## Process

### Step 1: Gather Epic Context

Get the epic's git history to understand what changed:

```bash
# Get epic branch or commit range
EPIC_ID="$1"

# Find commits associated with this epic (from commit messages)
COMMITS=$(git log --oneline --grep="$EPIC_ID" --format="%H")

# Or if on epic branch
git log main..HEAD --oneline
```

Get the combined diff of all changes:

```bash
# Files changed in epic
git diff main...HEAD --name-only

# Full diff for analysis
git diff main...HEAD --unified=3
```

### Step 2: Load Existing Registries

Read current documented patterns to compare against:

```bash
# Design system registries
COMPONENTS_REGISTRY=".design/Components.md"
FIELDS_REGISTRY=".design/Fields.md"
PATTERNS_REGISTRY=".design/Patterns.md"

# Extract known components (look for ## headers or component names)
KNOWN_COMPONENTS=$(grep -E "^### " "$COMPONENTS_REGISTRY" | sed 's/### //')

# Extract known fields
KNOWN_FIELDS=$(grep -E "^\| \`" "$FIELDS_REGISTRY" | sed 's/| `//' | cut -d'`' -f1)

# Extract known patterns
KNOWN_PATTERNS=$(grep -E "^### " "$PATTERNS_REGISTRY" | sed 's/### //')
```

### Step 3: Detect New Additions

Analyze the diff for new exports and definitions:

#### 3a. New React Components

```bash
# Find new component exports in renderer
git diff main...HEAD -- "src/renderer/**/*.tsx" | \
  grep -E "^\\+export (const|function) [A-Z]" | \
  sed 's/+export //' | \
  awk '{print $2}' | \
  cut -d'(' -f1
```

Look for:
- New files in `src/renderer/components/`
- New `export const ComponentName` or `export function ComponentName`
- New entries in component index files

#### 3b. New Type Definitions / Fields

```bash
# Find new interface/type definitions
git diff main...HEAD -- "src/shared/types/**/*.ts" | \
  grep -E "^\\+export (interface|type) " | \
  sed 's/+export //'

# Find new enum values
git diff main...HEAD -- "src/shared/types/**/*.ts" | \
  grep -E "^\\+  [A-Z_]+ = "
```

Look for:
- New fields in existing interfaces
- New interfaces/types
- New enum values
- New Zod schemas

#### 3c. New Patterns

Analyze code structure for repeated patterns:
- New hook patterns (`useXxx`)
- New utility functions
- New service patterns
- New IPC handlers

```bash
# Find new hooks
git diff main...HEAD -- "src/renderer/**/*.ts" | \
  grep -E "^\\+export function use[A-Z]"

# Find new utilities
git diff main...HEAD -- "src/*/lib/**/*.ts" | \
  grep -E "^\\+export (const|function)"
```

### Step 4: Filter Against Known

Remove items already in registries:

```typescript
function filterNew(detected: string[], known: string[]): string[] {
  return detected.filter(item =>
    !known.some(k => k.toLowerCase() === item.toLowerCase())
  );
}

const newComponents = filterNew(detectedComponents, knownComponents);
const newFields = filterNew(detectedFields, knownFields);
const newPatterns = filterNew(detectedPatterns, knownPatterns);
```

### Step 5: Generate Evolution Report

If new items found, present for approval:

```markdown
## Evolution Report: <epic-id>

### Summary
- **Epic**: <title>
- **New Components**: <count>
- **New Fields/Types**: <count>
- **New Patterns**: <count>

---

### New Components

#### TaskStatusBadge
- **File**: `src/renderer/components/common/TaskStatusBadge.tsx`
- **Props**: `{ status: TaskStatus, size?: 'sm' | 'md' }`
- **Usage**: Display task status with color coding

**Suggested addition to `.design/Components.md`:**
```markdown
### TaskStatusBadge

Status indicator for beads tasks.

**Usage:**
\`\`\`tsx
<TaskStatusBadge status="in_progress" size="sm" />
\`\`\`

**Variants:** Uses status colors from Colors.md
```

---

### New Fields/Types

#### TaskPriority (enum)
- **File**: `src/shared/types/beads.ts`
- **Values**: `P0 | P1 | P2 | P3 | P4`

**Suggested addition to `.design/Fields.md`:**
| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `priority` | `TaskPriority` | P0-P4 | Task urgency (P0=critical) |

---

### New Patterns

#### useBeadsQuery Hook
- **File**: `src/renderer/lib/hooks/useBeadsQuery.ts`
- **Purpose**: Cached data fetching for beads with auto-refresh

**Suggested addition to `.design/Patterns.md`:**
```markdown
### useBeadsQuery

Custom hook for fetching beads data with caching.

\`\`\`tsx
const { data, loading, error, refetch } = useBeadsQuery('bd list --json');
\`\`\`
```

---

**Approval Required**

Apply these evolution updates?
1. Apply all updates
2. Apply selectively (I'll specify)
3. Skip all (no changes)
```

### Step 6: Apply Approved Updates

For each approved item, append to the appropriate registry:

#### Components Registry
```bash
cat >> .design/Components.md << 'EOF'

---

### <ComponentName>

<description>

**Usage:**
```tsx
<example code>
```

**Added**: Epic <epic-id>, <date>
EOF
```

#### Fields Registry
```bash
# Append to table in .design/Fields.md
# Insert before the closing of the table
```

#### Patterns Registry
```bash
cat >> .design/Patterns.md << 'EOF'

---

### <PatternName>

<description>

**Example:**
```tsx
<example code>
```

**Added**: Epic <epic-id>
EOF
```

### Step 7: Update Agent Knowledge (Optional)

If new capabilities were discovered, offer to update agent prompts:

```markdown
### Agent Knowledge Updates

The following agents may benefit from knowing about new patterns:

#### typescript-agent.md
**Suggested Addition:**
```diff
+ ### TaskStatusBadge
+ Use TaskStatusBadge from components/common for status display.
+ Don't create custom status badges.
```

Apply agent updates?
1. Yes, update agent prompts
2. No, skip agent updates
```

### Step 8: Archive Evolution

Create evolution record:

```bash
mkdir -p .claude/evolutions

cat > .claude/evolutions/<epic-id>.md << 'EOF'
# Evolution: <epic-id>

**Date**: <date>
**Epic**: <title>

## Additions

### Components
- TaskStatusBadge

### Fields
- priority (TaskPriority enum)

### Patterns
- useBeadsQuery hook

## Registry Updates
- .design/Components.md: +1 component
- .design/Fields.md: +1 field
- .design/Patterns.md: +1 pattern
EOF
```

---

## Handling Edge Cases

### No New Additions

When epic used only existing patterns:

```markdown
## Evolution Report: <epic-id>

**No new additions detected.**

This epic successfully reused existing:
- Components: Button, Card, Badge
- Fields: status, created_at, user_id
- Patterns: useBeadsQuery, IPC handler

No registry updates needed.
```

### Dry Run Mode

When `--dry-run` specified:

```markdown
---

**DRY RUN: No files modified**

To apply these updates, run:
`/evolve <epic-id>` (without --dry-run)
```

### Conflicting Names

If detected item name conflicts with existing (but different implementation):

```markdown
**Warning: Name Conflict**

Detected `StatusBadge` but `.design/Components.md` already has a StatusBadge.

Options:
1. This is the same component (skip)
2. This is different - rename to `TaskStatusBadge`
3. This replaces the old one (update existing entry)
```

---

## Registry File Formats

### .design/Components.md

```markdown
# Component Patterns

> UI component registry for the project

---

## Core Components

### Button
<existing documentation>

### Card
<existing documentation>

---

## Feature Components

### TaskStatusBadge
**Added**: Epic bd-x1y2, 2024-01-15

Status indicator for beads tasks.
...
```

### .design/Fields.md

```markdown
# Field Registry

> Data field definitions, types, and allowed values

---

## Core Fields

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `id` | `string` | UUID | Unique identifier |
| `created_at` | `datetime` | ISO 8601 | Creation timestamp |
| `status` | `enum` | open, closed, blocked | Current state |

---

## Feature Fields

| Field | Type | Values | Description | Added |
|-------|------|--------|-------------|-------|
| `priority` | `TaskPriority` | P0-P4 | Task urgency | bd-x1y2 |
```

### .design/Patterns.md

```markdown
# Pattern Library

> Reusable code patterns and conventions

---

## Data Fetching

### useBeadsQuery
**Added**: Epic bd-x1y2

Custom hook for beads data with caching.

```tsx
const { data, loading, refetch } = useBeadsQuery('bd list --json');
```

---

## State Management

### Zustand Store Pattern
...
```

---

## Integration with /run-tasks

At Step 10 (epic completion), before closing:

```markdown
All tasks complete for "<epic-title>".

**Checking for evolutions...**

Found 2 new additions:
- Component: TaskStatusBadge
- Pattern: useBeadsQuery

Options:
1. Close epic (skip evolution capture)
2. Review and capture evolutions (recommended)
3. Run retrospective + evolution capture
```

If user selects 2 or 3, invoke `/evolve <epic-id>`.

---

## Integration with /discover

The discovery skill should reference registries:

```markdown
## Step 3: Establish Patterns

Before designing new components, check existing registries:

**Available Components** (from .design/Components.md):
- Button, Card, Badge, Input, Select, Dialog...

**Available Fields** (from .design/Fields.md):
- id, created_at, updated_at, status, priority...

**Available Patterns** (from .design/Patterns.md):
- useBeadsQuery, IPC handler, Zustand store...

Spec should reference existing patterns where applicable.
```

---

## Token Budget

Target: ~1500 tokens for evolution check

| Component | Budget |
|-----------|--------|
| Git diff analysis | ~300 |
| Registry comparison | ~200 |
| Generate report | ~500 |
| Apply updates | ~300 |
| Archive | ~200 |

**Skip entirely** if no new additions detected (~100 tokens).

---

## Configuration

```yaml
# project.yaml
workflow:
  evolution:
    enabled: true
    auto_prompt: true           # Prompt at epic close
    registries:
      components: ".design/Components.md"
      fields: ".design/Fields.md"
      patterns: ".design/Patterns.md"
    detect:
      components: true
      fields: true
      patterns: true
      agent_capabilities: false  # Optional
```

---

## Files Modified

This skill may create or modify:

| Path | Action | Approval |
|------|--------|----------|
| `.design/Components.md` | Append | Required |
| `.design/Fields.md` | Append | Required |
| `.design/Patterns.md` | Append | Required |
| `.claude/agents/*.md` | Append | Required |
| `.claude/evolutions/<epic-id>.md` | Create | Automatic |

---

## Example: No Changes Needed

**User:** `/evolve bd-abc1`

**Claude:**
```
## Evolution Report: bd-abc1

Analyzing epic "Add user profile page"...

**Detected patterns used:**
- Components: Card, Button, Input, Avatar
- Fields: user_id, email, created_at
- Patterns: useBeadsQuery, Zustand store

**Comparison with registries:**
- All components already documented
- All fields already in registry
- All patterns already captured

**No new additions detected.**

This epic successfully followed existing patterns. No registry updates needed.
```

---

## Example: New Additions Found

**User:** `/evolve bd-xyz9`

**Claude:**
```
## Evolution Report: bd-xyz9

Analyzing epic "Task dependency visualization"...

### New Additions Detected

#### Components (2 new)
1. **DependencyGraph** - `src/renderer/components/board/DependencyGraph.tsx`
   - Interactive graph showing task dependencies
   - Uses react-flow for rendering

2. **DependencyEdge** - `src/renderer/components/board/DependencyEdge.tsx`
   - Custom edge component for dependency arrows

#### Fields (1 new)
1. **blocked_by** - `string[]` - Array of task IDs that block this task

#### Patterns (1 new)
1. **useGraphLayout** - Custom hook for auto-layout of dependency graphs

---

**Apply these updates?**
1. Apply all (4 additions)
2. Apply selectively
3. Skip all
```

**User:** 1

**Claude:**
```
Applying evolution updates...

- Updated: .design/Components.md (+2 components)
- Updated: .design/Fields.md (+1 field)
- Updated: .design/Patterns.md (+1 pattern)
- Created: .claude/evolutions/bd-xyz9.md

Evolution capture complete.
```
