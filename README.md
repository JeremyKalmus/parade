# Parade

**Workflow orchestration for Claude Code** - Transform feature ideas into implemented code through structured discovery, specialized agents, and visual progress tracking.

Parade is a companion app for [Beads](https://github.com/steveyegge/beads), providing a visual interface and guided workflow for AI-assisted software development.

> *Like beads at a parade* - Parade helps you catch and organize the work that Claude Code produces.

---

## What is Parade?

Parade is an Electron app that helps Claude Code users:

- **Discover features systematically** - Structured interview questions and SME agent reviews
- **Track implementation progress** - Visual Kanban board with batch swimlanes
- **Orchestrate sub-agents** - Coordinate parallel task execution with TDD support
- **Improve over time** - Retrospective analysis after each epic

### The Workflow

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  /init-project  →  /discover  →  /approve-spec  →  /run-tasks  →  /retro        │
│  (setup)           (idea+spec)   (create beads)    (execute)      (optional)     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

1. **`/init-project`** - Set up project configuration and scaffolding
2. **`/discover`** - Capture idea, assess complexity, run discovery, generate spec
3. **`/approve-spec`** - Export approved spec to Beads as epic + tasks
4. **`/run-tasks`** - Execute tasks via coordinated sub-agents
5. **`/retro`** *(optional)* - Analyze execution and generate workflow improvements

---

## Prerequisites

- [Claude Code](https://claude.ai/claude-code) - Anthropic's CLI for Claude
- [Beads](https://github.com/steveyegge/beads) - Task management CLI (`npm install -g beads`)
- Node.js 18+ and npm

---

## Quick Start

Parade has two components:
1. **Skills & Scaffolding** - Installed per-project via `npx parade-init`
2. **Visual Dashboard** - The Electron app (this repository)

### Option A: Use Skills Only (No Visual Dashboard)

If you just want the workflow skills without the visual app:

```bash
cd /path/to/your-project
npx parade-init
```

Then in Claude Code:
```
/init-project
```

You're ready to use `/discover`, `/approve-spec`, `/run-tasks`, etc.

### Option B: Full Setup with Visual Dashboard

#### Step 1: Install the Parade App

```bash
# Clone the Parade repository (one-time setup)
git clone https://github.com/JeremyKalmus/parade.git ~/parade
cd ~/parade
npm install
```

#### Step 2: Initialize Your Project

```bash
cd /path/to/your-project
npx parade-init
```

This creates the base structure:
- `.parade/` - Discovery database and workflow data
- `.claude/` - Skills, agents, and schemas
- `.beads/` - Task management data (via Beads CLI)

#### Step 3: Configure Project (in Claude Code)

```
/init-project
```

This interactive wizard creates:
- `project.yaml` - Project configuration with stack, governance, and vision
- `.design/` - Design system docs (optional)
- Custom agent definitions based on your stack

#### Step 4: Run the Dashboard

```bash
cd ~/parade
npm run dev
```

The app opens to the **Guide** page. Open your project folder to see briefs, epics, and tasks.

### Start Building Features

Describe a feature to Claude:

```
I want to add user authentication with OAuth support
```

Claude will guide you through `/discover` → `/approve-spec` → `/run-tasks`.

---

## Features

### Visual Kanban Board

Track epics and tasks with a 3-panel layout:
- **Left**: Epic list with active/closed grouping
- **Center**: Kanban columns or batch swimlanes
- **Right**: Task details with dependencies

### Batch Swimlanes

When viewing an epic, tasks are organized into execution batches based on their dependency graph. This shows which tasks can run in parallel.

### Unified Discovery (`/discover`)

Replaces the legacy two-step flow with a single command that:
- Captures your feature idea
- Assesses complexity (quick/standard/complex)
- Presents batched interview questions
- Spawns SME agents for review
- Synthesizes specification

### TDD Support

Enable test-driven development in `project.yaml`:

```yaml
workflow:
  tdd_enabled: true
```

This creates test tasks that block implementation tasks, enforcing RED-GREEN-DEBUG cycles.

### Retrospectives (`/retro`)

After completing an epic, run `/retro <epic-id>` to analyze execution and improve future runs:

```
/retro bd-x7y8
```

The retrospective:
- **Calculates efficiency score** - Based on debug loops and blocked tasks (10 = perfect)
- **Identifies patterns** - Recurring failures across tasks
- **Generates recommendations** - Agent prompt updates, debug-knowledge entries
- **Archives learnings** - `.claude/retrospectives/<epic-id>.md`
- **Accumulates insights** - Updates `.claude/retrospectives/INSIGHTS.md`

**Entry points:**
| Command | Description |
|---------|-------------|
| `/retro <epic-id>` | Analyze a specific epic |
| `/retro --recent` | Analyze most recent epic |
| `/retro <epic-id> --dry-run` | Preview without making changes |
| `/run-tasks` Step 10 | Option 2 triggers retro before closing |

Changes require user approval before being applied to agent prompts or config files.

---

## Project Structure

```
parade/
├── src/
│   ├── main/           # Electron main process
│   ├── renderer/       # React frontend
│   │   ├── components/ # UI components
│   │   ├── store/      # Zustand state management
│   │   └── lib/        # Utilities
│   ├── preload/        # Electron preload scripts
│   └── shared/         # Shared types
├── packages/
│   └── parade-init/    # npm package for project scaffolding
├── .parade/
│   └── discovery.db    # SQLite database for briefs, specs, telemetry
├── .claude/
│   ├── skills/         # Workflow skills
│   ├── agents/         # Agent definitions
│   └── schemas/        # JSON schemas
├── .beads/             # Beads task data
├── .design/            # Design system docs
└── project.yaml        # Project configuration
```

---

## Skills Reference

| Skill | Purpose |
|-------|---------|
| `/init-project` | Set up project configuration (after `npx parade-init`) |
| `/discover` | Capture idea + run discovery + generate spec |
| `/approve-spec` | Export approved spec to Beads |
| `/run-tasks` | Execute tasks via sub-agents |
| `/retro` | Analyze execution and generate improvements |
| `/workflow-status` | Check current workflow state |
| `/parade-doctor` | Diagnose project setup and health |

---

## Development

### Commands

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run typecheck  # Run TypeScript checks
npm test           # Run tests
```

### Tech Stack

- **Framework**: Electron
- **Frontend**: React + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand
- **Database**: SQLite (.parade/discovery.db) + Beads (.beads/)

---

## Related Projects

- [Beads](https://github.com/steveyegge/beads) - Task management CLI for AI-assisted development
- [Claude Code](https://claude.ai/claude-code) - Anthropic's CLI for Claude

---

## License

MIT

---

## Contributing

Contributions welcome! Please read the [onboarding guide](.docs/ONBOARDING.md) to understand the workflow.
