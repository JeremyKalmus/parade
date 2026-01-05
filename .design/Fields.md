# Field Registry

> Data field definitions, types, and allowed values for Parade

This registry documents all data fields, enums, and types used across the application. Discovery and implementation agents should reference this to ensure consistency.

---

## Naming Conventions

From `project.yaml`:
- **Fields**: `snake_case` (e.g., `created_at`, `brief_id`)
- **Enums**: `SCREAMING_SNAKE` or lowercase literals (e.g., `'in_progress'`)
- **Files**: `kebab-case` (e.g., `task-status-badge.tsx`)
- **Directories**: `kebab-case` (e.g., `debug-knowledge/`)

---

## Core Enums

### IssueStatus (Beads)

Task/issue lifecycle states.

| Value | Description | UI Color |
|-------|-------------|----------|
| `open` | Not started | slate-400 |
| `in_progress` | Currently being worked on | sky-400 |
| `blocked` | Waiting on dependency or blocker | amber-400 |
| `deferred` | Postponed to later | slate-500 |
| `closed` | Completed | emerald-400 |

**Source**: `src/shared/types/beads.ts`

---

### IssueType (Beads)

Classification of work items.

| Value | Description |
|-------|-------------|
| `epic` | Large feature containing multiple tasks |
| `feature` | New functionality |
| `task` | Implementation work unit |
| `bug` | Defect to fix |
| `chore` | Maintenance, refactoring |
| `merge-request` | PR/MR tracking |

**Source**: `src/shared/types/beads.ts`

---

### Priority

Urgency level (lower number = higher priority).

| Value | Label | Description | UI Color |
|-------|-------|-------------|----------|
| `0` | P0/Critical | Drop everything | red-500 |
| `1` | P1/High | This sprint | red-400 |
| `2` | P2/Medium | Next sprint | amber-400 |
| `3` | P3/Low | Backlog | yellow-400 |
| `4` | P4/Lowest | Nice to have | slate-400 |

**Source**: `src/shared/types/beads.ts`

---

### BriefStatus (Discovery)

Brief lifecycle in discovery pipeline.

| Value | Description | Pipeline Column |
|-------|-------------|-----------------|
| `draft` | Initial idea captured | Draft |
| `in_discovery` | Interview/SME review in progress | In Discovery |
| `spec_ready` | Spec synthesized, awaiting approval | Spec Ready |
| `approved` | Spec approved by user | Approved |
| `exported` | Exported to beads as epic | Exported |
| `in_progress` | Epic execution started | In Progress |
| `completed` | Epic closed | Completed |
| `canceled` | Brief abandoned | - |

**Source**: `src/shared/types/discovery.ts`

---

### SpecStatus

Specification lifecycle.

| Value | Description |
|-------|-------------|
| `draft` | Being written |
| `review` | Under review |
| `approved` | User approved |
| `exported` | Converted to beads |

**Source**: `src/shared/types/discovery.ts`

---

### QuestionCategory

Interview question classification.

| Value | Description |
|-------|-------------|
| `technical` | Architecture, implementation |
| `business` | Domain, requirements |
| `ux` | User experience |
| `scope` | Boundaries, constraints |

**Source**: `src/shared/types/discovery.ts`

---

### AgentType

SME agent classifications.

| Value | Description |
|-------|-------------|
| `technical-sme` | Technical/architecture review |
| `business-sme` | Business/domain review |

**Source**: `src/shared/types/discovery.ts`

---

### DependencyType (Beads)

Relationship types between issues.

| Value | Description |
|-------|-------------|
| `blocks` | Source blocks target |
| `parent-child` | Hierarchical relationship |
| `tracks` | Tracking relationship |
| `relates_to` | General relation |
| `discovered-from` | Origin tracking |
| `conditional-blocks` | Conditional blocking |

**Source**: `src/shared/types/beads.ts`

---

## Core Fields

### Timestamps

| Field | Type | Format | Description |
|-------|------|--------|-------------|
| `created_at` | `string` | ISO 8601 | When record was created |
| `updated_at` | `string \| null` | ISO 8601 | When record was last modified |
| `closed_at` | `string \| null` | ISO 8601 | When issue was closed |
| `approved_at` | `string \| null` | ISO 8601 | When spec was approved |
| `answered_at` | `string \| null` | ISO 8601 | When question was answered |
| `due_at` | `string \| null` | ISO 8601 | Due date for issue |
| `defer_until` | `string \| null` | ISO 8601 | Deferred until date |

---

### Identifiers

| Field | Type | Format | Description |
|-------|------|--------|-------------|
| `id` | `string` | UUID or BeadId | Primary identifier |
| `brief_id` | `string` | UUID | Foreign key to briefs |
| `parent` | `BeadId \| null` | `bd-xxxx` | Parent issue ID |
| `exported_epic_id` | `string \| null` | `bd-xxxx` | Exported beads epic ID |

---

### Text Fields

| Field | Type | Max Length | Description |
|-------|------|------------|-------------|
| `title` | `string` | 200 | Display title |
| `description` | `string \| null` | 5000 | Detailed description |
| `problem_statement` | `string \| null` | 2000 | Problem being solved |
| `initial_thoughts` | `string \| null` | 2000 | Initial context |
| `acceptance_criteria` | `string` | JSON | Acceptance criteria array |
| `design_notes` | `string` | JSON | Design documentation |
| `notes` | `string \| null` | 5000 | Additional notes |
| `close_reason` | `string \| null` | 500 | Why issue was closed |

---

### Structured Fields (JSON)

| Field | Type | Schema | Description |
|-------|------|--------|-------------|
| `acceptance_criteria` | `AcceptanceCriterion[]` | `{id, description, completed?}` | List of acceptance criteria |
| `design_notes` | `DesignNotes` | `{approach?, architecture?, components?, ...}` | Design documentation |
| `task_breakdown` | `TaskBreakdownItem[]` | `{id, title, description?, ...}` | Task list |
| `findings` | `SMEFindings` | `{summary, strengths?, gaps?, ...}` | SME review results |

---

### Assignment Fields

| Field | Type | Description |
|-------|------|-------------|
| `assignee` | `string \| null` | Username or agent assigned |
| `labels` | `string[]` | Tags/labels (e.g., `agent:typescript`) |
| `agent_type` | `AgentType` | SME agent classification |

---

## Complex Types

### AcceptanceCriterion

```typescript
interface AcceptanceCriterion {
  id: string;           // Unique identifier
  description: string;  // What must be true
  completed?: boolean;  // Verification status
}
```

### TaskBreakdownItem

```typescript
interface TaskBreakdownItem {
  id: string;
  title: string;
  description?: string;
  estimatedHours?: number;
  complexity?: 'low' | 'medium' | 'high';
  dependencies?: string[];  // IDs of blocking tasks
}
```

### DesignNotes

```typescript
interface DesignNotes {
  approach?: string;        // Implementation approach
  architecture?: string;    // Architectural decisions
  components?: string[];    // UI components to use
  dataFlow?: string;        // Data flow description
  integrations?: string[];  // External integrations
  risks?: string[];         // Identified risks
  alternatives?: string[];  // Considered alternatives
}
```

### SMEFindings

```typescript
interface SMEFindings {
  summary: string;
  strengths?: string[];
  weaknesses?: string[];
  gaps?: string[];
  feasibility?: 'low' | 'medium' | 'high';
  estimatedEffort?: string;
}
```

---

## Feature-Specific Fields

*This section is updated by `/evolve` as new features add fields.*

| Field | Type | Values | Description | Added |
|-------|------|--------|-------------|-------|
| - | - | - | No feature fields yet | - |

---

## Validation Rules

### Required Fields by Entity

| Entity | Required Fields |
|--------|-----------------|
| Issue | `id`, `title`, `status`, `priority`, `issue_type`, `created_at` |
| Brief | `id`, `title`, `status`, `priority`, `created_at` |
| Spec | `id`, `brief_id`, `title`, `status`, `created_at` |
| InterviewQuestion | `id`, `brief_id`, `question`, `category`, `created_at` |

### Field Constraints

- `priority`: Must be 0-4 (integer)
- `title`: Non-empty, max 200 characters
- `status`: Must be valid enum value
- Timestamps: ISO 8601 format

---

*Last updated: January 2025*
*Updated by /evolve when new fields are added*
