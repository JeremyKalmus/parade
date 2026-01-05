---
name: discover
description: Unified discovery flow that captures a feature idea, assesses complexity, runs appropriate discovery depth, and produces a spec. Replaces separate /create-brief and /start-discovery skills with a streamlined single-command workflow.
---

# Discover Skill

## Purpose

Transform a user's feature idea into a detailed specification through a unified discovery flow. This skill combines brief creation and discovery into a single streamlined process with adaptive depth based on complexity assessment.

## When to Use

- User says "I want to build...", "Add a feature for...", "We need..."
- User describes a new capability or enhancement
- Starting a new project or significant feature
- User explicitly invokes `/discover`

---

## Complexity Levels

| Level | Questions | SME Agents | Typical Use Case |
|-------|-----------|------------|------------------|
| `quick` | 3 essential | None (skip to spec) | Small enhancements, bug fixes, config changes |
| `standard` | 5-6 questions | Technical + Business | Most features, new functionality |
| `complex` | 8+ questions | Full SME review + custom agents | Large initiatives, architectural changes, cross-cutting concerns |

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

### Step 1: Capture Initial Idea

Ask the user to describe their feature idea. Listen for:
- **What** they want to build
- **Why** they need it (problem being solved)
- **Who** it's for (user persona)

### Step 2: Complexity Assessment

After hearing the initial idea, ask:

```
Before we dive in, let me understand the scope:

Is this a:
1. **Quick enhancement** - Small change, clear scope, minimal risk
2. **Standard feature** - New functionality requiring design and implementation
3. **Complex initiative** - Large scope, architectural impact, cross-team concerns

(Enter 1, 2, or 3, or describe and I'll assess)
```

Map response to complexity level:
- 1 or "quick/small/simple/minor" -> `quick`
- 2 or "standard/normal/feature/medium" -> `standard`
- 3 or "complex/large/initiative/major/architecture" -> `complex`

### Step 3: Generate Brief ID

Create a kebab-case ID from the title:
```
"Add athlete experience tracking" -> "athlete-experience-tracking"
```

### Step 4: Initialize Database and Create Brief

Run schema migration and insert brief:

```bash
# Ensure tables exist with complexity_level column
sqlite3 "$DISCOVERY_DB" "
CREATE TABLE IF NOT EXISTS briefs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  problem_statement TEXT,
  initial_thoughts TEXT,
  priority INTEGER DEFAULT 2,
  complexity_level TEXT DEFAULT 'standard',
  status TEXT DEFAULT 'draft',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  exported_epic_id TEXT
);

-- Migration: Add complexity_level if missing (idempotent)
ALTER TABLE briefs ADD COLUMN complexity_level TEXT DEFAULT 'standard';
"

# Insert the brief
sqlite3 "$DISCOVERY_DB" "INSERT INTO briefs (id, title, problem_statement, initial_thoughts, priority, complexity_level, status)
VALUES ('<brief-id>', '<title>', '<problem>', '<initial_thoughts>', <priority>, '<complexity_level>', 'in_discovery');"
```

### Step 5: Generate and Present Batched Questions

Generate questions based on complexity level, then present ALL at once:

#### Quick (3 questions)
```
## Discovery: <brief-title>
Complexity: Quick Enhancement

Please answer these 3 questions:

1. [scope] What exactly needs to change? (files, components, behavior)
2. [success] How will we verify this works correctly?
3. [risk] Any edge cases or risks to consider?
```

#### Standard (5-6 questions)
```
## Discovery: <brief-title>
Complexity: Standard Feature

Please answer these questions (all at once is fine):

**Technical**
1. How should this integrate with existing data models and components?
2. Are there performance or scalability considerations?

**Business**
3. Who are the primary users and what's their workflow?
4. What metrics will indicate success?

**UX/Scope**
5. Walk me through the ideal user flow.
6. What's in MVP vs future phases?
```

#### Complex (8+ questions)
```
## Discovery: <brief-title>
Complexity: Complex Initiative

Please answer these questions (take your time, all at once is fine):

**Technical**
1. How does this fit into the current architecture?
2. What data models, APIs, or services need changes?
3. Are there performance, security, or compliance considerations?

**Business**
4. Who are all the stakeholders affected?
5. What business metrics define success?
6. What's the rollout strategy?

**UX/Scope**
7. Describe the complete user journey.
8. What are the failure modes and error handling needs?
9. What's MVP vs Phase 2 vs future?

**Dependencies**
10. What existing features or systems does this touch?
```

### Step 6: Record Answers

Store questions and answers in the database:

```sql
-- Ensure table exists
CREATE TABLE IF NOT EXISTS interview_questions (
  id TEXT PRIMARY KEY,
  brief_id TEXT REFERENCES briefs(id),
  question TEXT NOT NULL,
  category TEXT,
  answer TEXT,
  answered_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Insert all questions with answers
INSERT INTO interview_questions (id, brief_id, question, category, answer, answered_at, created_at)
VALUES
  ('<brief-id>-q1', '<brief-id>', 'Question 1...', 'technical', '<answer1>', datetime('now'), datetime('now')),
  ('<brief-id>-q2', '<brief-id>', 'Question 2...', 'business', '<answer2>', datetime('now'), datetime('now')),
  ...;
```

### Step 7: SME Review (Based on Complexity)

#### Quick -> Skip SME, proceed directly to Step 8

For quick enhancements, skip SME agents entirely and proceed to spec synthesis.

#### Standard -> Spawn Technical + Business SME

**Technical SME Agent:**
```
Task: Technical review for brief '<brief-id>'

Context:
- Read brief: sqlite3 -json "$DISCOVERY_DB" "SELECT * FROM briefs WHERE id = '<brief-id>';"
- Read answers: sqlite3 -json "$DISCOVERY_DB" "SELECT * FROM interview_questions WHERE brief_id = '<brief-id>';"

Analyze:
1. Review existing codebase for relevant patterns
2. Identify technical risks and constraints
3. Suggest architecture approach
4. Flag any concerns

Output: Write findings to sme_reviews table with agent_type = 'technical-sme'
```

**Business SME Agent:**
```
Task: Business review for brief '<brief-id>'

Context:
- Read brief and interview answers from $DISCOVERY_DB

Analyze:
1. Validate requirements completeness
2. Check for missing stakeholder considerations
3. Identify business risks
4. Confirm success metrics are measurable

Output: Write findings to sme_reviews table with agent_type = 'business-sme'
```

#### Complex -> Full SME Review + Custom Agents

Spawn Technical SME and Business SME as above, plus:

**Check for custom agents in project.yaml:**
```bash
if [ -f "project.yaml" ]; then
  # Parse agents.custom[] array
  # For each custom agent, spawn with their prompt_file
fi
```

For each custom agent in `project.yaml`:
```
Task: Domain review for brief '<brief-id>'

Context:
- Read brief and interview answers from $DISCOVERY_DB
- Your domain prompt is loaded from <prompt_file>

Output: Write findings to sme_reviews table with agent_type = '<agent-label>'
```

Insert SME reviews:
```sql
CREATE TABLE IF NOT EXISTS sme_reviews (
  id TEXT PRIMARY KEY,
  brief_id TEXT REFERENCES briefs(id),
  agent_type TEXT NOT NULL,
  findings TEXT,
  recommendations TEXT,
  concerns TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO sme_reviews (id, brief_id, agent_type, findings, recommendations, concerns, created_at)
VALUES ('<brief-id>-tech-review', '<brief-id>', 'technical-sme', '<findings>', '<recommendations>', '<concerns>', datetime('now'));
```

### Step 7a: Load Design Registries (Pattern Reuse)

Before synthesizing the spec, load existing patterns to ensure consistency:

```bash
# Load existing components, fields, and patterns
COMPONENTS_FILE=".design/Components.md"
FIELDS_FILE=".design/Fields.md"
PATTERNS_FILE=".design/Patterns.md"

# Extract key sections for context
if [ -f "$COMPONENTS_FILE" ]; then
  # Get list of documented components
  AVAILABLE_COMPONENTS=$(grep -E "^### " "$COMPONENTS_FILE" | sed 's/### //' | head -20)
fi

if [ -f "$FIELDS_FILE" ]; then
  # Get list of documented fields/enums
  AVAILABLE_FIELDS=$(grep -E "^\| \`" "$FIELDS_FILE" | sed 's/| `//' | cut -d'`' -f1 | head -30)
fi

if [ -f "$PATTERNS_FILE" ]; then
  # Get list of documented patterns
  AVAILABLE_PATTERNS=$(grep -E "^### " "$PATTERNS_FILE" | sed 's/### //' | head -20)
fi
```

**Present available patterns during spec synthesis:**

When generating the spec's design notes and task breakdown, reference existing patterns:

```
Available Components (from .design/Components.md):
- Button, Card, Badge, Input, Select, Dialog, Tabs, Toast, ...

Available Fields (from .design/Fields.md):
- id, created_at, updated_at, status, priority, title, description, ...
- Enums: IssueStatus, IssueType, BriefStatus, Priority, ...

Available Patterns (from .design/Patterns.md):
- Zustand Store Pattern, IPC Handler Pattern, useEffect Data Loading, ...
```

**Spec should reference existing patterns where applicable:**
- Use existing components rather than creating new ones
- Reuse field naming conventions and existing enums
- Follow documented patterns for state management, data fetching, etc.

Only propose NEW components/fields/patterns when existing ones don't fit the requirement.

### Step 8: Synthesize Spec

Create specification from discovery findings:

```sql
CREATE TABLE IF NOT EXISTS specs (
  id TEXT PRIMARY KEY,
  brief_id TEXT REFERENCES briefs(id),
  title TEXT NOT NULL,
  description TEXT,
  acceptance_criteria TEXT,
  design_notes TEXT,
  task_breakdown TEXT,
  status TEXT DEFAULT 'draft',
  approved_at TEXT,
  exported_epic_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO specs (id, brief_id, title, description, acceptance_criteria, design_notes, task_breakdown, status, created_at)
VALUES (
  '<brief-id>-spec',
  '<brief-id>',
  '<spec title>',
  '<detailed description>',
  '<JSON array of acceptance criteria>',
  '<technical design notes from SME or user answers>',
  '<JSON array of proposed tasks>',
  'review',
  datetime('now')
);
```

Update brief status:
```sql
UPDATE briefs SET status = 'spec_ready', updated_at = datetime('now') WHERE id = '<brief-id>';
```

### Step 9: Present Spec for Review

```
## Specification Ready for Review

### <Spec Title>
**Complexity:** <quick|standard|complex>

**Description:**
<description>

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

**Design Notes:**
<technical approach from SME review or derived from answers>

**Patterns & Components:**
*Existing (from registries):*
- Components: Card, Badge, Button (from .design/Components.md)
- Fields: status, priority, created_at (from .design/Fields.md)
- Patterns: Zustand Store, IPC Handler (from .design/Patterns.md)

*New (will be added by /evolve):*
- Component: <NewComponentName> - <brief description>
- Field: <new_field_name> - <type and purpose>
- Pattern: <NewPattern> - <what it does>

**Proposed Tasks:**
1. Task 1: <description> [agent:sql]
2. Task 2: <description> [agent:typescript]
3. Task 3: <description> [agent:swift]

**Dependencies:**
- Task 3 depends on Task 1, Task 2

---

To approve and create beads tasks: /approve-spec <brief-id>-spec
To request changes: Tell me what to revise
```

**Note:** New components, fields, and patterns will be captured by `/evolve` at epic completion and added to the registries for future reuse.

---

## Schema Migration

When running `/discover`, ensure the database schema includes the `complexity_level` column:

```sql
-- Create briefs table if not exists (includes complexity_level)
CREATE TABLE IF NOT EXISTS briefs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  problem_statement TEXT,
  initial_thoughts TEXT,
  priority INTEGER DEFAULT 2,
  complexity_level TEXT DEFAULT 'standard',
  status TEXT DEFAULT 'draft',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  exported_epic_id TEXT
);

-- Migration for existing databases (idempotent - SQLite will error if column exists, which is safe)
-- Wrap in try/catch or ignore error:
ALTER TABLE briefs ADD COLUMN complexity_level TEXT DEFAULT 'standard';
```

For idempotent migration in bash:
```bash
sqlite3 "$DISCOVERY_DB" "ALTER TABLE briefs ADD COLUMN complexity_level TEXT DEFAULT 'standard';" 2>/dev/null || true
```

---

## Workflow Events

Log key events throughout the process:

```sql
CREATE TABLE IF NOT EXISTS workflow_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brief_id TEXT,
  event_type TEXT,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO workflow_events (brief_id, event_type, details) VALUES
  ('<brief-id>', 'discover_started', '{"complexity": "<level>"}'),
  ('<brief-id>', 'questions_presented', '{"count": <n>, "complexity": "<level>"}'),
  ('<brief-id>', 'answers_recorded', '{}'),
  ('<brief-id>', 'sme_review_started', '{"agents": ["technical-sme", "business-sme"]}'),  -- if applicable
  ('<brief-id>', 'sme_review_complete', '{}'),  -- if applicable
  ('<brief-id>', 'spec_generated', '{"spec_id": "<brief-id>-spec"}');
```

---

## Example Interactions

### Quick Enhancement Example

**User:** I want to change the default sort order in the task list from ascending to descending

**Claude:** Got it - changing default sort order. This sounds like a quick enhancement.

Is this a:
1. Quick enhancement
2. Standard feature
3. Complex initiative

**User:** 1

**Claude:**
```
## Discovery: default-sort-order-change
Complexity: Quick Enhancement

Please answer these 3 questions:

1. [scope] What exactly needs to change? (files, components, behavior)
2. [success] How will we verify this works correctly?
3. [risk] Any edge cases or risks to consider?
```

**User:**
1. Just the TaskList.tsx component, change the default sortDirection from 'asc' to 'desc'
2. Open the task list and confirm newest tasks appear first
3. None really, it's a simple default change

**Claude:** [Generates spec directly, no SME agents]

### Standard Feature Example

**User:** We need to add a way for users to filter tasks by label

**Claude:** A label filter - useful feature! Let me assess complexity.

Is this a:
1. Quick enhancement
2. Standard feature
3. Complex initiative

**User:** Standard feature

**Claude:**
```
## Discovery: task-label-filter
Complexity: Standard Feature

Please answer these questions (all at once is fine):

**Technical**
1. How should this integrate with existing data models and components?
2. Are there performance or scalability considerations?

**Business**
3. Who are the primary users and what's their workflow?
4. What metrics will indicate success?

**UX/Scope**
5. Walk me through the ideal user flow.
6. What's in MVP vs future phases?
```

**User:** [Provides all answers]

**Claude:** [Spawns Technical + Business SME, then generates spec]

---

## Output

After successful execution:
- Brief record in `$DISCOVERY_DB` (`.parade/discovery.db` or `./discovery.db`) with complexity_level set
- Interview questions and answers recorded
- SME reviews in `sme_reviews` table (for standard/complex)
- Spec in `specs` table with status 'review'
- Brief status updated to 'spec_ready'
- User presented with spec for approval

---

## Comparison with Legacy Skills

| Aspect | Legacy (/create-brief + /start-discovery) | New (/discover) |
|--------|-------------------------------------------|-----------------|
| Commands | 2 separate invocations | 1 unified command |
| Questions | Sequential, one at a time | Batched, all at once |
| Complexity | Not assessed | Quick/Standard/Complex |
| SME agents | Always spawned | Adaptive (skip for quick) |
| User effort | More back-and-forth | Streamlined |
