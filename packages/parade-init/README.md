# parade-init

CLI tool to initialize new [Parade](https://github.com/JeremyKalmus/parade) workflow orchestrator projects for Claude Code.

## What is Parade?

Parade is a workflow orchestration system for Claude Code that helps you:
- Transform feature ideas into detailed specifications
- Break down work into trackable tasks
- Execute implementation via specialized sub-agents
- Track progress visually with a Kanban board

## Installation

```bash
npx parade-init
```

Or install globally:

```bash
npm install -g parade-init
parade-init
```

## What it creates

Running `parade-init` in your project directory creates:

```
your-project/
├── .parade/           # Workflow data (discovery.db)
├── .claude/
│   ├── skills/        # Workflow skills (/discover, /run-tasks, etc.)
│   ├── agents/        # Agent prompt templates
│   └── templates/     # Configuration templates
└── .beads/            # Task management (via beads CLI)
```

## Prerequisites

- [Claude Code](https://claude.ai/claude-code) - Anthropic's CLI for Claude
- [Beads](https://github.com/steveyegge/beads) - Task management CLI (auto-installed if missing)
- Node.js 16+

## Next Steps

After running `parade-init`:

1. Open Claude Code in your project directory
2. Run `/init-project` to configure your project
3. Run `/parade-doctor` to verify setup
4. Start building with `/discover`

## Visual Dashboard (Optional)

The Parade app provides a visual Kanban board:

```bash
git clone https://github.com/JeremyKalmus/parade.git ~/parade
cd ~/parade && npm install
npm run dev
```

## Skills Included

| Skill | Purpose |
|-------|---------|
| `/init-project` | Configure project settings |
| `/discover` | Capture feature ideas and generate specs |
| `/approve-spec` | Export specs to beads as tasks |
| `/run-tasks` | Execute tasks via sub-agents |
| `/retro` | Analyze execution and improve workflow |
| `/evolve` | Capture new patterns for reuse |
| `/parade-doctor` | Diagnose setup issues |
| `/workflow-status` | Check current workflow state |

## License

MIT
