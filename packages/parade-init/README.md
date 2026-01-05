# parade-init

CLI tool to initialize new Parade workflow orchestrator projects.

## Installation

```bash
npx parade-init
```

## What it does

The `parade-init` package handles infrastructure setup for new Parade projects:

1. **Checks for beads CLI** - Verifies if the beads task management CLI is installed
2. **Installs beads** - Downloads and installs beads from GitHub releases if needed
3. **Scaffolds directories** - Creates `.beads/`, `.claude/`, and `.design/` structure

After running `parade-init`, use the Claude Code `/init-project` skill to configure your project settings.

## Project Structure

```
packages/parade-init/
├── package.json           # npm package configuration
├── bin/
│   └── parade-init.js     # CLI entry point
├── lib/
│   ├── index.js           # Main orchestration
│   ├── installer.js       # Beads CLI installation
│   └── scaffolder.js      # Directory scaffolding
├── templates/             # Template files for new projects
└── README.md
```

## Development

```bash
# Link for local testing
npm link

# Run locally
parade-init

# Unlink
npm unlink -g parade-init
```

## Implementation Status

- [x] Package scaffold (task customTaskTracker-ym7.1)
- [ ] Beads installer (task customTaskTracker-ym7.2)
- [ ] Directory scaffolder (task customTaskTracker-ym7.3)
- [ ] Template files (task customTaskTracker-ym7.4)
- [ ] Integration testing (task customTaskTracker-ym7.5)

## License

MIT
