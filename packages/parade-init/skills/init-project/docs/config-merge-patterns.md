# Configuration Merge Patterns

This document covers handling existing `project.yaml` files, including detection, merging, and backup strategies.

---

## Detection Logic

Check for existing configuration before starting wizard:

```bash
# Check for existing project.yaml
PROJECT_CONFIG="project.yaml"

if [ -f "$PROJECT_CONFIG" ]; then
  echo "Existing project.yaml detected"
  CONFIG_EXISTS=true
else
  echo "No existing configuration found"
  CONFIG_EXISTS=false
fi

# Also check for backup files
if [ -f "${PROJECT_CONFIG}.bak" ]; then
  echo "Previous backup exists: ${PROJECT_CONFIG}.bak"
fi
```

---

## Parsing Existing Config

Safely read and extract key information:

```bash
# Read existing configuration (using Read tool)
# Display current contents to user

# Extract key values (basic grep approach)
PROJECT_NAME=$(grep -E "^\s*name:" project.yaml | head -1 | sed 's/.*name:\s*"\?\([^"]*\)"\?.*/\1/')
FRAMEWORK=$(grep -E "^\s*framework:" project.yaml | head -1 | sed 's/.*framework:\s*"\?\([^"]*\)"\?.*/\1/')

# Check which optional sections exist
HAS_DESIGN=$(grep -q "^design_system:" project.yaml && echo "true" || echo "false")
HAS_GOVERNANCE=$(grep -q "^data_governance:" project.yaml && echo "true" || echo "false")
HAS_AGENTS=$(grep -q "^agents:" project.yaml && echo "true" || echo "false")
```

---

## User Options for Existing Config

Present clear choices:

```
## Existing Configuration Detected

Found project.yaml with:
- Project: MyAwesomeApp
- Stack: SwiftUI/Swift
- Design System: Not configured
- SME Agents: 0

What would you like to do?
[1] Add design system configuration
[2] Add data governance configuration
[3] Add custom SME agent
[4] Add another app (convert to monorepo)
[5] View full configuration
[6] Replace entire configuration (backs up to .bak)

> _
```

---

## Merge Strategy Options

When user wants to modify existing config:

```
## How would you like to handle the existing configuration?

[1] MERGE - Preserve existing settings, add new sections only
    - Keeps: project name, description, existing stacks
    - Adds: New optional sections (design_system, agents, etc.)
    - Safe: No data loss

[2] REPLACE - Start fresh with new configuration
    - Backup: Creates project.yaml.bak automatically
    - Overwrites: All existing settings
    - Use when: Major restructuring needed

[3] CANCEL - Exit without changes
    - Preserves: Everything as-is

> _
```

---

## Merge Implementation Examples

### Adding Design System to Existing Config

Use Edit tool to enable and configure:

**Before:**
```yaml
design_system:
  enabled: false
  path: ".design/"
  docs: []
```

**After:**
```yaml
design_system:
  enabled: true
  path: ".design/"
  docs: []
```

### Adding First Custom Agent

**Before:**
```yaml
agents:
  custom: []
```

**After:**
```yaml
agents:
  custom:
    - name: "Fitness Domain Expert"
      label: "fitness-domain"
      prompt_file: ".claude/agents/fitness-domain.md"
```

### Adding to Existing Agents List

**Before:**
```yaml
agents:
  custom:
    - name: "Existing Agent"
      label: "existing-agent"
      prompt_file: ".claude/agents/existing-agent.md"
```

**After:**
```yaml
agents:
  custom:
    - name: "Existing Agent"
      label: "existing-agent"
      prompt_file: ".claude/agents/existing-agent.md"
    - name: "New Agent"
      label: "new-agent"
      prompt_file: ".claude/agents/new-agent.md"
```

---

## Backup Procedures

### Creating Backups

Always backup before destructive operations:

```bash
# Backup function - run before REPLACE operation
backup_config() {
  local config_file="project.yaml"
  local backup_file="${config_file}.bak"

  if [ -f "$config_file" ]; then
    # Check if backup already exists
    if [ -f "$backup_file" ]; then
      # Create timestamped backup to avoid overwriting
      local timestamp=$(date +%Y%m%d_%H%M%S)
      backup_file="${config_file}.bak.${timestamp}"
      echo "Existing backup found, creating timestamped backup"
    fi

    # Create backup
    cp "$config_file" "$backup_file"

    if [ $? -eq 0 ]; then
      echo "Backup created: $backup_file"
      return 0
    else
      echo "Failed to create backup"
      return 1
    fi
  fi
}

# Usage before replace operation
backup_config && echo "Ready to write new config"
```

### Verifying Backups

```bash
# Verify backup was created successfully
verify_backup() {
  local original="project.yaml"
  local backup="project.yaml.bak"

  if [ -f "$backup" ]; then
    # Compare file sizes as basic verification
    orig_size=$(wc -c < "$original" 2>/dev/null || echo "0")
    back_size=$(wc -c < "$backup" 2>/dev/null || echo "0")

    if [ "$orig_size" = "$back_size" ]; then
      echo "Backup verified (sizes match)"
      return 0
    else
      echo "Backup size differs from original"
      return 1
    fi
  else
    echo "No backup file found"
    return 1
  fi
}
```

### Restoring from Backup

If something goes wrong:

```bash
# Restore function
restore_from_backup() {
  local config_file="project.yaml"
  local backup_file="${config_file}.bak"

  if [ -f "$backup_file" ]; then
    cp "$backup_file" "$config_file"
    echo "Restored from backup"
  else
    echo "No backup file to restore from"
    return 1
  fi
}
```

---

## Handling CLAUDE.md and beads/config.yaml

### CLAUDE.md Merge Options

When `.claude/CLAUDE.md` exists:

```
## Existing CLAUDE.md Detected

Found existing .claude/CLAUDE.md with custom content.

What would you like to do?

[1] Keep existing (recommended if customized)
    - Preserves all your custom instructions and formatting
    - Stack info will be in project.yaml only

[2] Replace with template
    - Creates backup at .claude/CLAUDE.md.bak
    - Generates fresh file with Stack section filled in
    - You may lose custom sections

[3] Merge (add Stack section only)
    - Keeps existing content
    - Inserts Stack section after the header
    - Best of both worlds

> _
```

**Merge Implementation (Option 3):**

Read existing file, find insertion point (after first `---`), insert:

```markdown
## Stack

- **Framework**: ${framework}
- **Language**: ${language}
- **Testing**: ${test_command}
- **Build**: ${build_command}

---
```

### beads/config.yaml Merge Options

When `.beads/config.yaml` exists:

```
## Existing .beads/config.yaml Detected

Found existing beads configuration.

What would you like to do?

[1] Keep existing (recommended)
    - Preserves your current beads settings
    - Issue prefix and other settings unchanged

[2] Replace with template
    - Creates backup at .beads/config.yaml.bak
    - Generates fresh config with new project prefix

> _
```

---

## Diff Display Format

Show user what will change:

```
## Configuration Comparison

+------------------------------------------------------------------+
| CURRENT CONFIG                  | PROPOSED CHANGES               |
+---------------------------------+--------------------------------+
| project:                        | project:                       |
|   name: "MyApp"                 |   name: "MyApp"          [=]   |
|   description: "Original"       |   description: "Original"  [=] |
|                                 |                                |
| stacks:                         | stacks:                        |
|   mobile:                       |   mobile:                      |
|     framework: "SwiftUI"        |     framework: "SwiftUI"  [=]  |
|     language: "Swift"           |     language: "Swift"     [=]  |
|                                 |                                |
| design_system:                  | design_system:                 |
|   enabled: false                |   enabled: true           [~]  |
|                                 |   path: ".design/"        [+]  |
|                                 |                                |
| agents:                         | agents:                        |
|   custom: []                    |   custom:                      |
|                                 |     - fitness-domain      [+]  |
+------------------------------------------------------------------+

Legend: [=] unchanged  [~] modified  [+] added  [-] removed
```

---

## Example Interaction: Merge Flow

**User**: /init-project

**Claude**: Let me check for existing configuration...

```
EXISTS
```

**Claude**: I found an existing configuration. Let me read and summarize it:

```
## Current Configuration Summary

Project: FitTracker Pro
Description: A fitness app for personalized workout plans

Stack (mobile):
  - Framework: SwiftUI
  - Language: Swift
  - Testing: XCTest (swift test)

Optional Sections:
  [x] design_system: enabled: false
  [x] data_governance: configured
  [ ] agents.custom: empty
```

What would you like to do?

1. Enable design system (currently disabled)
2. Add custom SME agent
3. View full configuration
4. Replace entire configuration (backs up to .bak)
5. Cancel

**User**: 2

**Claude**: Great! Let's add a new SME agent.

Agent name (e.g., "fitness-domain"):

**User**: nutrition-expert

[...continues with agent configuration...]

---

## Example Interaction: Replace Flow

**User**: /init-project

**Claude**:
```
Existing project.yaml detected
```

I found an existing configuration for "FitTracker Pro". What would you like to do?

**User**: Replace it, I want to start over

**Claude**: You've selected REPLACE mode. This will:

1. Create a backup: `project.yaml.bak`
2. Overwrite the existing configuration with new settings

```bash
# Creating backup...
cp project.yaml project.yaml.bak
```

```
Backup created: project.yaml.bak
```

Your existing configuration is now safely backed up. If anything goes wrong, you can restore it with:
```bash
cp project.yaml.bak project.yaml
```

Now let's create your new configuration...

[...continues with full wizard...]
