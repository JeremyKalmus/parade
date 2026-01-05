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

## Visual Dashboard (Parade App)

The Parade app provides a visual Kanban board for tracking your workflow.

### Option 1: Download Pre-built App (Recommended)

1. Download the latest DMG from [GitHub Releases](https://github.com/JeremyKalmus/parade/releases)
2. Open the DMG and drag Parade to Applications
3. **Important for macOS users**: The app is not yet notarized with Apple. You'll need to run:
   ```bash
   xattr -cr /Applications/Parade.app
   ```
4. Open Parade - on first launch, you'll be prompted to add your project folder
5. Click "Add Project Folder" and select your project directory (where you ran `parade-init`)

### Option 2: Build from Source

```bash
git clone https://github.com/JeremyKalmus/parade.git ~/parade
cd ~/parade && npm install
npm run build
```

The built app will be in `release/Parade-*.dmg`

### Option 3: Development Mode

```bash
git clone https://github.com/JeremyKalmus/parade.git ~/parade
cd ~/parade && npm install
npm run dev
```

### First Launch

When you first open the Parade app:
1. You'll be taken to the Settings page automatically
2. Click "Add Project Folder" to add your project
3. Select a folder that contains a `.beads` directory (where you ran `bd init`)
4. Your project will appear in the sidebar

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

## Troubleshooting

### macOS: "Parade.app is damaged and can't be opened"

This happens because the app is not yet notarized with Apple. Run:

```bash
xattr -cr /Applications/Parade.app
```

### App shows "Error loading issues" or "spawn bd ENOENT"

The app can't find the `bd` CLI. Make sure beads is installed:

```bash
go install github.com/beads-ai/beads-cli/cmd/bd@latest
```

And that `bd` is in your PATH. The app checks common locations like `/opt/homebrew/bin/bd` and `/usr/local/bin/bd`.

### No projects showing in the app

1. Make sure you've run `bd init` in your project
2. Add the project folder in Settings (click "Add Project Folder")
3. Select the folder that contains the `.beads` directory

## License

MIT
