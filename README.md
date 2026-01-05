# Parade

**Workflow orchestration for Claude Code** - Transform feature ideas into implemented code through structured discovery, specialized agents, and visual progress tracking.

Parade is a companion system for [Beads](https://github.com/steveyegge/beads), providing guided workflows and an optional visual dashboard for AI-assisted software development.

> *Like beads at a parade* - Parade helps you catch and organize the work that Claude Code produces.

---

## Quick Start

### 1. Install Beads CLI (required)

```bash
npm install -g beads
```

### 2. Initialize Your Project

```bash
cd /path/to/your-project
npx parade-init
```

This creates the workflow scaffolding:
- `.parade/` - Discovery database and workflow data
- `.claude/skills/` - All Parade workflow skills
- `.beads/` - Task management (via Beads CLI)

### 3. Configure Project (in Claude Code)

```bash
claude  # Open Claude Code in your project
```

Then run:
```
/init-project
```

This interactive wizard creates your `project.yaml` with stack configuration, governance rules, and agent definitions.

### 4. Start Building!

Describe a feature to Claude:
```
I want to add user authentication with OAuth support
```

Claude will guide you through the workflow: `/discover` → `/approve-spec` → `/run-tasks`

---

## Visual Dashboard (Optional)

The Parade app provides a visual Kanban board for tracking epics and tasks.

### Download

Download the latest release for your platform:

**[→ Download Parade App](https://github.com/JeremyKalmus/parade/releases/latest)**

| Platform | File |
|----------|------|
| macOS | `Parade-x.x.x.dmg` |
| Windows | `Parade-Setup-x.x.x.exe` |

### Run the App

1. Install and open Parade
2. Click "Open Project" and select your project folder
3. View briefs, epics, and tasks in the visual interface

---

## The Workflow

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  /init-project  →  /discover  →  /approve-spec  →  /run-tasks  →  /retro        │
│  (setup)           (idea+spec)   (create beads)    (execute)      (learn)        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Skills Reference

| Skill | Purpose |
|-------|---------|
| `/init-project` | Set up project configuration (run after `npx parade-init`) |
| `/discover` | Capture idea + run discovery + generate spec |
| `/approve-spec` | Export approved spec to Beads as epic + tasks |
| `/run-tasks` | Execute tasks via coordinated sub-agents |
| `/retro` | Analyze execution and generate improvements |
| `/evolve` | Capture new patterns, components, fields from completed epics |
| `/workflow-status` | Check current workflow state |
| `/parade-doctor` | Diagnose project setup and health |

---

## Features

### Unified Discovery (`/discover`)

Transform ideas into specifications with adaptive complexity:

```
I want to add a notification system for user activities
```

Parade assesses complexity and adjusts accordingly:
- **Quick** (3 questions) - Small enhancements, config changes
- **Standard** (5-6 questions) - Most features, new functionality
- **Complex** (8+ questions) - Large initiatives, architectural changes

SME agents review the discovery and synthesize a detailed specification.

### Pattern Evolution (`/evolve`)

Parade learns from every epic. When an epic completes, `/evolve` detects:
- **New Components** - UI components created during implementation
- **New Fields** - Data types, enums, and fields added
- **New Patterns** - Reusable code patterns discovered

These are captured in design registries (`.design/`) and referenced in future discoveries, ensuring consistency as your codebase grows.

```
/evolve bd-x7y8
```

Output:
```
## Evolution Report: bd-x7y8

### New Additions Detected

#### Components (2 new)
1. DependencyGraph - Interactive graph for task dependencies
2. StatusBadge - Reusable status indicator

#### Fields (1 new)
1. blocked_by - string[] - Array of blocking task IDs

#### Patterns (1 new)
1. useGraphLayout - Custom hook for auto-layout

Apply these updates? [1] All [2] Selective [3] Skip
```

### Retrospectives (`/retro`)

After completing an epic, analyze execution and improve:

```
/retro bd-x7y8
```

The retrospective:
- **Calculates efficiency score** - Based on debug loops and blocked tasks (10 = perfect)
- **Identifies patterns** - Recurring failures across tasks
- **Generates recommendations** - Agent prompt updates, debug-knowledge entries
- **Archives learnings** - `.claude/retrospectives/<epic-id>.md`

### TDD Support

Enable test-driven development in `project.yaml`:

```yaml
workflow:
  tdd_enabled: true
```

This creates test tasks that block implementation tasks, enforcing RED-GREEN-DEBUG cycles.

### Visual Kanban Board

The optional Parade app provides:
- **Epic List** - Active/closed grouping with progress indicators
- **Kanban Columns** - Open, In Progress, Blocked, Closed
- **Batch Swimlanes** - Tasks organized by execution batch (parallel groups)
- **Dependency Graph** - Visual task dependency visualization

---

## Project Structure

After running `npx parade-init` and `/init-project`:

```
your-project/
├── .parade/
│   └── discovery.db    # SQLite: briefs, specs, telemetry
├── .claude/
│   ├── skills/         # Workflow skills (8 total)
│   ├── agents/         # Custom agent definitions
│   ├── templates/      # Project templates
│   └── retrospectives/ # Accumulated insights
├── .beads/             # Task management data
├── .design/            # Design registries (Components, Fields, Patterns)
└── project.yaml        # Project configuration
```

---

## Prerequisites

- [Claude Code](https://claude.ai/claude-code) - Anthropic's CLI for Claude
- [Beads](https://github.com/steveyegge/beads) - Task management CLI
- Node.js 18+ and npm

---

## npm Package

The skills and scaffolding are distributed via npm:

```bash
npx parade-init
```

**Package**: [parade-init on npm](https://www.npmjs.com/package/parade-init)

This installs all 8 skills and creates the required directory structure. The visual dashboard is a separate download (see above).

---

## Development

If you want to contribute to Parade or run from source:

```bash
git clone https://github.com/JeremyKalmus/parade.git
cd parade
npm install
npm run dev
```

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run typecheck` | Run TypeScript checks |
| `npm test` | Run tests |

### Tech Stack

- **Framework**: Electron
- **Frontend**: React + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand
- **Database**: SQLite + Beads

---

## Related Projects

- [Beads](https://github.com/steveyegge/beads) - Task management CLI for AI-assisted development
- [Claude Code](https://claude.ai/claude-code) - Anthropic's CLI for Claude

---

## License

MIT

---

## Contributing

Contributions welcome! Please read the codebase patterns in `.design/Patterns.md` before submitting PRs.
