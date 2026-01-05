---
name: init-project
description: Initialize a new project with guided configuration wizard. Checks for .parade/ scaffolding, creates comprehensive constitution, governance policies, design system, and custom agents. Supports single app and monorepo configurations. Use when setting up a new project or adding configuration to an existing one.
---

# Init Project Skill

## Purpose

Guide users through comprehensive project configuration with progressive disclosure: check environment, capture project basics, create project constitution, configure stack and governance, optionally add design system and custom SME agents, then generate `project.yaml` and create directory scaffold.

## When to Use

- Starting a new project from scratch
- Adding Claude Code configuration to an existing codebase
- User says "init project", "set up project", "configure this project"
- No `project.yaml` exists at repository root
- **Enhancing an existing project.yaml** with scaffolding, agents, and design docs

## Arguments

```
/init-project [--minimal]
```

- `--minimal`: Skip optional sections, only ask required questions (6 questions, ~3-4 minutes)

---

## Auto-Detection Mode

When the skill starts, it checks for an existing `project.yaml` with pre-filled values. This allows projects that already have basic configuration to skip redundant questions and proceed directly to scaffolding enhancements.

### Step 0: Check for Existing Configuration

Before starting the wizard, check if project.yaml exists and parse its contents:

```bash
if [ -f "project.yaml" ]; then
  # Parse existing config
  # Skip questions for pre-filled sections
  # Inform user: "Detected existing project.yaml with pre-filled values"
fi
```

### Detection Logic

Read `project.yaml` and check for the following pre-filled sections:

| YAML Path | If Present | Action |
|-----------|------------|--------|
| `project.name` | Has non-empty value | Skip project name question (Phase 1.1) |
| `project.description` | Has non-empty value | Skip project description question (Phase 1.2) |
| `stacks` | Section exists with framework/language | Skip stack selection (Phase 2) |
| `vision.purpose` | Has non-empty value | Skip vision/purpose question (Phase 8.2) |
| `vision.target_users` | Has non-empty value | Skip target users question (Phase 8.2) |
| `vision.core_principles` | Has non-empty array/value | Skip core principles question (Phase 8.2) |
| `vision.boundaries` | Has non-empty array/value | Skip technical boundaries question (Phase 8.2) |
| `vision.success_metrics` | Has non-empty array/value | Skip success metrics question (Phase 8.2) |

### Display Detected Configuration

When existing config is found with values, display:

```
Detected existing project.yaml with:
- Project name: <name>
- Description: <description>
- Stack: <stack type> / <framework> / <language>
- Vision: <defined | not defined>
- [other pre-filled values]

Proceeding with scaffolding enhancements...
```

### Auto-Detection Workflow

1. **Read project.yaml** using Read tool
2. **Parse YAML** to identify pre-filled sections
3. **Store detected values** in wizard state
4. **Display summary** of what was detected
5. **Skip corresponding questions** in subsequent phases
6. **Proceed to enhancements** - create directories, agents, design docs, etc.

### Example: Partially Pre-filled Config

Given this existing `project.yaml`:
```yaml
version: "1.0"
project:
  name: "MyApp"
  description: "A fitness tracking application"
stacks:
  mobile:
    framework: "SwiftUI"
    language: "Swift"
```

The skill will:
1. Display: "Detected existing project.yaml with: Project name: MyApp, Stack: mobile / SwiftUI / Swift"
2. **Skip** Phase 1 (Project Basics) and Phase 2 (Primary Stack) questions
3. **Ask** Phase 3 (Optional Sections) questions
4. **Ask** Phase 8 (Constitution) questions if vision section is missing
5. **Proceed** to Phase 5 (Directory Scaffold) and Phase 6 (Generate Coding Agents)

### Example: Fully Pre-filled Config

If project.yaml has all required sections including vision:
```yaml
version: "1.0"
project:
  name: "MyApp"
  description: "A fitness tracking application"
stacks:
  mobile:
    framework: "SwiftUI"
    language: "Swift"
vision:
  purpose: "Help users track fitness goals"
  target_users: "Health-conscious individuals"
  core_principles:
    - "Privacy first"
    - "Offline capable"
  boundaries:
    - "No cloud sync required"
  success_metrics:
    - "Daily active users"
```

The skill will:
1. Display full summary of detected configuration
2. **Skip** all configuration questions
3. **Proceed directly** to scaffolding:
   - Create `.claude/`, `.beads/`, `.design/` directories
   - Generate coding agents based on detected stack
   - Create design system templates if enabled
   - Initialize beads if not already done

---

## Process Overview

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
| PHASE 0          | --> | PHASE 1          | --> | PHASE 2          | --> | PHASE 3          |
| Environment      |     | Project Basics   |     | Constitution     |     | Tech Stack       |
| Check .parade/   |     | - Name           |     | - Vision         |     | - Framework      |
| Check .beads/    |     | - Description    |     | - Target users   |     | - Language       |
| Suggest npx      |     | - Repo type      |     | - Success metrics|     | - Testing        |
└──────────────────┘     └──────────────────┘     | - Core principles|     └──────────────────┘
                                                  | - Boundaries     |
                                                  └──────────────────┘
         ↓                        ↓                        ↓                        ↓
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
| PHASE 3.5        | --> | PHASE 4          | --> | PHASE 5          | --> | PHASE 6          |
| MCP Setup        |     | Governance       |     | Design System    |     | Custom Agents    |
| - Detect config  |     | - Data gov       |     | - Enable/disable |     | - Domain experts |
| - Recommendations|     | - Code gov       |     | - Color scheme   |     | - Agent prompts  |
| - Configure MCPs |     | - Naming rules   |     | - Typography     |     | - Label mapping  |
└──────────────────┘     └──────────────────┘     └──────────────────┘     └──────────────────┘
         ↓
┌──────────────────┐
| PHASE 7          |
| First Feature    |
| Prompt /discover |
| - Guide next     |
| - Summarize      |
└──────────────────┘
```

**Target: Complete comprehensive setup in under 10 minutes**

---

## Execution Protocol

When this skill is invoked:

1. **Phase 0: Environment Check** - Verify .parade/ and .beads/ directories exist
2. **Run Auto-Detection**: Check if `project.yaml` exists with pre-filled values
   - If detected, display summary and skip questions for pre-filled sections
   - Store detected values in wizard state for use in later phases
3. **Phase 1: Project Basics** - Capture name, description, repo type
4. **Phase 2: Constitution Creation** - Build comprehensive project constitution
5. **Phase 3: Tech Stack** - Configure framework, language, testing
6. **Phase 3.5: MCP Setup** - Configure MCP servers for Claude Desktop (optional)
7. **Phase 4: Governance Policies** - Set data and code governance rules
8. **Phase 5: Design System** - Optional design system setup
9. **Phase 6: Custom Agents** - Define domain-specific expert agents
10. **Phase 7: First Feature Prompt** - Guide user to /discover
11. **Write final project.yaml** using Write tool
12. **Create directory scaffold** with templates
13. **Generate agents and constitution files**
14. **Show summary** with next steps

**Important**: Ask questions ONE AT A TIME, validate each response before proceeding.

---

## Phase 0: Environment Check

Before starting the configuration wizard, verify that the required directory structure has been created.

### 0.1 Check for .parade/ Directory

**Check:** Does `.parade/` directory exist at project root?

```bash
ls -d .parade/ 2>/dev/null && echo "EXISTS" || echo "NOT_FOUND"
```

**If NOT_FOUND:**
```
⚠️  .parade/ directory not found

The .parade/ directory contains essential templates and scaffolding.
It should be created by running:

  npx parade-init

This will create:
- .parade/templates/ (agent templates, constitution template)
- .parade/schemas/ (validation schemas)
- Basic directory structure

Would you like to:
[1] Exit and run npx parade-init first (recommended)
[2] Continue without .parade/ (limited functionality)
```

**If user selects [1]:** Exit skill with instructions
**If user selects [2]:** Log warning and continue

### 0.2 Check for .beads/ Directory

**Check:** Does `.beads/` directory exist at project root?

```bash
ls -d .beads/ 2>/dev/null && echo "EXISTS" || echo "NOT_FOUND"
```

**If NOT_FOUND:**
```
Note: Beads is not yet initialized. This will be handled later in the setup process.
```

**Continue to Phase 1**

### 0.3 Display Environment Summary

Once checks are complete, display:
```
Environment Check Complete:
- .parade/ directory: ✓ Found | ✗ Not found (limited functionality)
- .beads/ directory: ✓ Found | ○ Will initialize later

Proceeding with project configuration...
```

---

## Phase 1: Project Basics (Required)

### 1.1 Project Name
**Ask:** "What is the name of this project?"
**Validate:** Pattern `^[a-zA-Z][a-zA-Z0-9-_ ]*$`, max 100 chars
**Error:** "Project name must start with a letter and can only contain letters, numbers, spaces, dashes, and underscores."

### 1.2 Purpose/Description
**Ask:** "Describe the project in 1-2 sentences. What problem does it solve?"
**Validate:** Non-empty string

### 1.3 Repository Type
**Ask:** "Is this a single-app or monorepo project? [1] Single app [2] Monorepo"
**Store:** `repo_type = "single"` or `"monorepo"`

---

## Phase 2: Constitution Creation (Enhanced)

Create a comprehensive project constitution defining vision, principles, and boundaries.

### 2.1 Prompt for Constitution

**Ask:** "Would you like to create a project constitution? This defines your app's vision, principles, and boundaries. [Y/n]"

**Default:** Yes (press Enter to accept)

**If user declines:** Skip to Phase 3 (Tech Stack)

### 2.2 Vision Statement

**Ask:** "What is the vision statement for this project? Describe in 1-2 sentences what this project aims to achieve and why it matters."

**Validate:** Non-empty string, at least 20 characters
**Example:** "Empower individuals to take control of their health through simple, privacy-first fitness tracking."
**Store:** `constitution_vision`

### 2.3 Target Users

**Ask:** "Who are the target users? List the primary audience(s) for this project (comma-separated or one per line)."

**Validate:** Non-empty string
**Transform:** Format as bullet list
**Example Input:** "Health-conscious individuals, fitness beginners, personal trainers"
**Example Output:**
```
- Health-conscious individuals
- Fitness beginners
- Personal trainers
```
**Store:** `constitution_target_users`

### 2.4 Success Metrics

**Ask:** "How will you measure success? Define 2-4 measurable outcomes that indicate this project is successful."

**Validate:** Non-empty string
**Transform:** Format as bullet list
**Example Input:** "Daily active users > 1000, 4.5+ app store rating, <2s load time"
**Example Output:**
```
- Daily active users > 1000
- 4.5+ app store rating
- Page load time < 2 seconds
```
**Store:** `constitution_success_metrics`

### 2.5 Core Principles

**Ask:** "What are the core principles that guide this project? List 3-5 guiding values (comma-separated or one per line)."

**Validate:** Non-empty string, at least 3 items recommended
**Transform:** Format as bullet list
**Example Input:** "Privacy first, Offline capable, Simple and intuitive, Data ownership"
**Example Output:**
```
- Privacy first
- Offline capable
- Simple and intuitive
- Data ownership
```
**Store:** `constitution_core_principles`

### 2.6 Boundaries

**Ask:** "What are the boundaries of this project? What will this project NOT do or support?"

**Validate:** Non-empty string
**Transform:** Format as bullet list
**Example Input:** "No social features, No cloud sync required, No third-party tracking"
**Example Output:**
```
- No social features
- No cloud sync required
- No third-party tracking
```
**Store:** `constitution_boundaries`

### 2.7 Write Constitution File

1. **Check if `.parade/templates/CONSTITUTION.md.template` exists**
   - If exists: Read template
   - If not exists: Use fallback inline template

2. **Substitute placeholders:**
   - `{{PROJECT_NAME}}` → project_name (from Phase 1)
   - `{{VISION}}` → constitution_vision
   - `{{TARGET_USERS}}` → constitution_target_users (formatted list)
   - `{{SUCCESS_METRICS}}` → constitution_success_metrics (formatted list)
   - `{{CORE_PRINCIPLES}}` → constitution_core_principles (formatted list)
   - `{{BOUNDARIES}}` → constitution_boundaries (formatted list)

3. **Create `docs/` directory if needed:**
   ```bash
   mkdir -p docs
   ```

4. **Write to `docs/CONSTITUTION.md`** using Write tool

**If `docs/CONSTITUTION.md` already exists:**
- Offer: [1] View [2] Replace (backup to `.md.bak`) [3] Skip
- Backup logic: `cp docs/CONSTITUTION.md docs/CONSTITUTION.md.bak.TIMESTAMP`

---

## Phase 3: Tech Stack (Required)

### 3.1 Stack Type
**Ask:** "What type of stack? [1] Frontend [2] Backend [3] Mobile [4] Database"
**Store:** `stack_type = "frontend"/"backend"/"mobile"/"database"`

### 3.2 Framework
**Ask:** Framework options based on stack_type (Next.js, React, SwiftUI, Express, etc.)
**Offer:** Numbered menu with "Other (specify)" option

### 3.3 Language
**Ask:** "Primary language? [1] TypeScript [2] JavaScript [3] Swift [4] Python [5] Go [6] Other"

### 3.4 Testing Framework
**Ask:** "Unit testing framework? [1] Jest [2] Vitest [3] XCTest [4] pytest [5] None [6] Other"

### 3.5 Commands
**Ask:** Test, lint, and build commands
**Offer smart defaults** based on stack type (e.g., `npm test`, `swift test`, `pytest`)

---

## Phase 3.5: MCP Setup (Optional)

Configure Model Context Protocol (MCP) servers for enhanced Claude Desktop integration.

### 3.5.1 Prompt for MCP Setup

**Ask:** "Would you like to configure MCP servers for Claude Desktop? This enables Claude to interact with databases, file systems, and other services. [Y/n]"

**Default:** Yes (press Enter to accept)

**If user declines:** Skip to Phase 4 (Governance Policies)

### 3.5.2 Detect Claude Desktop Config

Check if Claude Desktop configuration exists:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%/Claude/claude_desktop_config.json`
**Linux:** `~/.config/claude/claude_desktop_config.json`

**If config not found:**
```
Note: Claude Desktop configuration not found at expected location.

This could mean:
1. Claude Desktop is not installed
2. Claude Desktop hasn't been run yet (config created on first launch)
3. Config is at a non-standard location

Options:
[1] Create new config file (will be used when Claude Desktop is installed)
[2] Skip MCP setup for now
```

**If user selects [1]:** Continue with MCP setup, create config directory if needed
**If user selects [2]:** Skip to Phase 4

### 3.5.3 Generate MCP Recommendations

Based on stack selection from Phase 3, generate MCP recommendations using the McpRecommendationEngine patterns:

**MCP Mapping (Framework → MCP Servers):**

| Framework Category | Frameworks | Recommended MCPs |
|-------------------|------------|------------------|
| Frontend | React, Next.js, Vue, Angular, Svelte, Electron | `filesystem` |
| Backend | Express, Fastify, NestJS, Koa | `filesystem` |
| Database (Supabase) | Supabase | `supabase` |
| Database (SQL) | PostgreSQL, MySQL | `postgres` |
| Database (Local) | SQLite, Prisma | `sqlite` |
| Mobile | Swift, Kotlin, Flutter | `filesystem` |
| All Projects | (default) | `github` (optional) |

**Priority Levels:**
- **required**: Essential for the selected stack to function properly
- **recommended**: Significantly enhances development experience
- **optional**: Nice-to-have, can be added later

### 3.5.4 Display Recommendations

**Display:**
```
Based on your stack (${framework} / ${language}), I recommend these MCP servers:

| Priority    | MCP Server  | Rationale                                           |
|-------------|-------------|-----------------------------------------------------|
| recommended | filesystem  | Enables file system operations for ${framework}    |
|             |             | development, allowing Claude to read, write, and   |
|             |             | manage project files.                              |
| recommended | supabase    | Provides direct integration with Supabase database |
|             |             | and auth services for seamless backend development.|
| optional    | github      | Allows Claude to interact with GitHub repositories,|
|             |             | issues, and pull requests for enhanced project     |
|             |             | management.                                        |

Select MCPs to configure:
[1] All recommended (default)
[2] All (including optional)
[3] Choose individually
[4] Skip MCP setup
```

**If user selects [3]:** Display checklist for each MCP server

### 3.5.5 Configure Selected MCPs

For each selected MCP server, collect required configuration:

#### filesystem MCP
```
Configuring filesystem MCP...

This MCP allows Claude to read and write files in specified directories.

**Ask:** "Which directories should Claude have access to? (comma-separated paths, or '.' for current project)"

**Default:** Current project directory
**Validate:** Paths exist or will be created
**Store:** `mcp_filesystem_paths`

**Config Example:**
{
  "command": "npx",
  "args": ["-y", "@anthropic/mcp-server-filesystem"],
  "env": {
    "ALLOWED_PATHS": "${mcp_filesystem_paths}"
  }
}
```

#### supabase MCP
```
Configuring Supabase MCP...

This MCP enables direct interaction with your Supabase project.

**Ask:** "Enter your Supabase project URL (e.g., https://xxx.supabase.co):"
**Validate:** URL format, starts with https://
**Store:** `mcp_supabase_url`

**Ask:** "Enter your Supabase anon/public key:"
**Validate:** Non-empty string
**Sensitive:** Do not log or display after entry
**Store:** `mcp_supabase_key`

**Config Example:**
{
  "command": "npx",
  "args": ["-y", "@supabase/mcp-server-supabase"],
  "env": {
    "SUPABASE_URL": "${mcp_supabase_url}",
    "SUPABASE_KEY": "${mcp_supabase_key}"
  }
}
```

#### postgres MCP
```
Configuring PostgreSQL MCP...

This MCP enables direct PostgreSQL database operations.

**Ask:** "Enter your PostgreSQL connection URL (e.g., postgresql://user:pass@localhost:5432/db):"
**Validate:** PostgreSQL URL format
**Sensitive:** Do not log or display after entry
**Store:** `mcp_postgres_url`

**Config Example:**
{
  "command": "npx",
  "args": ["-y", "@anthropic/mcp-server-postgres"],
  "env": {
    "DATABASE_URL": "${mcp_postgres_url}"
  }
}
```

#### sqlite MCP
```
Configuring SQLite MCP...

This MCP provides SQLite database access.

**Ask:** "Enter the path to your SQLite database file (e.g., ./database.sqlite):"
**Validate:** Path format (file doesn't need to exist yet)
**Store:** `mcp_sqlite_path`

**Config Example:**
{
  "command": "npx",
  "args": ["-y", "@anthropic/mcp-server-sqlite"],
  "env": {
    "DATABASE_PATH": "${mcp_sqlite_path}"
  }
}
```

#### github MCP
```
Configuring GitHub MCP...

This MCP enables GitHub repository interactions.

**Ask:** "Enter your GitHub personal access token (with repo scope):"
**Validate:** Non-empty string
**Sensitive:** Do not log or display after entry
**Store:** `mcp_github_token`

**Config Example:**
{
  "command": "npx",
  "args": ["-y", "@anthropic/mcp-server-github"],
  "env": {
    "GITHUB_TOKEN": "${mcp_github_token}"
  }
}
```

### 3.5.6 Write to Claude Desktop Config

**Step 1: Backup existing config (if exists)**

```bash
# Create timestamped backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp ~/Library/Application\ Support/Claude/claude_desktop_config.json \
   ~/Library/Application\ Support/Claude/claude_desktop_config.backup-${TIMESTAMP}.json
```

**Display:** "Backed up existing config to claude_desktop_config.backup-${TIMESTAMP}.json"

**Step 2: Read existing config or create new**

If config exists:
- Parse existing JSON
- Preserve all existing settings
- Merge new mcpServers entries

If config doesn't exist:
- Create parent directory if needed
- Initialize with empty mcpServers object

**Step 3: Add MCP server entries**

For each configured MCP, add entry to `mcpServers` object:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-filesystem"],
      "env": {
        "ALLOWED_PATHS": "/path/to/project"
      }
    },
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase"],
      "env": {
        "SUPABASE_URL": "https://xxx.supabase.co",
        "SUPABASE_KEY": "your-anon-key"
      }
    }
  }
}
```

**Step 4: Write atomically**

Write to temp file first, then rename to prevent corruption:

```bash
# Write to temp file
echo "${config_json}" > ~/Library/Application\ Support/Claude/claude_desktop_config.json.tmp

# Atomic rename
mv ~/Library/Application\ Support/Claude/claude_desktop_config.json.tmp \
   ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Step 5: Handle existing server entries**

If a server name already exists in config:

**Ask:** "MCP server '${server_name}' already exists in config. [1] Keep existing [2] Replace with new [3] Skip this server"

**Default:** Keep existing (to preserve user customizations)

### 3.5.7 Display MCP Setup Summary

```
MCP Setup Complete!

Configured servers:
- filesystem: /path/to/project
- supabase: https://xxx.supabase.co
- github: configured

Config file: ~/Library/Application Support/Claude/claude_desktop_config.json
Backup: ~/Library/Application Support/Claude/claude_desktop_config.backup-20260105_143000.json

Note: Restart Claude Desktop for changes to take effect.
```

### 3.5.8 Error Handling

**Permission denied:**
```
Error: Cannot write to Claude Desktop config directory.

Please ensure you have write permissions to:
  ~/Library/Application Support/Claude/

You can manually add MCP servers by editing claude_desktop_config.json
or running this setup again with appropriate permissions.
```

**Invalid JSON in existing config:**
```
Error: Existing Claude Desktop config contains invalid JSON.

Options:
[1] View backup and continue (creates new config)
[2] Exit and fix manually

Backup location: ~/Library/Application Support/Claude/claude_desktop_config.backup-${TIMESTAMP}.json
```

**MCP server validation failed:**
```
Warning: Could not validate ${server_name} MCP configuration.

The server entry was added but may not work correctly.
Common issues:
- Missing environment variables
- Incorrect command or args
- Network connectivity (for remote services)

You can test by restarting Claude Desktop and checking for errors.
```

---

## Phase 4: Governance Policies (New/Enhanced)

Configure data and code governance policies for the project.

### 4.1 Data Governance

#### 4.1.1 Auth Provider

**Ask:** "What authentication provider will you use? [1] Supabase [2] Firebase [3] Custom [4] None [5] Other"

**Store:** `auth_provider = "supabase" | "firebase" | "custom" | "none" | "<other>"`

#### 4.1.2 Naming Conventions

**Ask:** "Preferred naming conventions:"

**Field naming:**
- **Ask:** "Database field naming? [1] snake_case (recommended) [2] camelCase [3] PascalCase"
- **Store:** `naming_fields = "snake_case" | "camelCase" | "PascalCase"`

**File naming:**
- **Ask:** "File naming? [1] kebab-case (recommended) [2] camelCase [3] PascalCase"
- **Store:** `naming_files = "kebab-case" | "camelCase" | "PascalCase"`

**Date fields:**
- **Offer smart default:** `created_at`, `updated_at` based on field naming convention
- **Store:** `naming_dates = "created_at" | "createdAt" | etc.`

### 4.2 Code Governance

#### 4.2.1 Linting Rules

**Ask:** "Linting configuration? [1] Strict (recommended) [2] Standard [3] Relaxed [4] Custom"

**Store:** `linting_mode = "strict" | "standard" | "relaxed" | "custom"`

**If custom:** Ask for specific linting command

#### 4.2.2 Testing Requirements

**Ask:** "Minimum test coverage? [1] 80% (strict) [2] 60% (standard) [3] 40% (relaxed) [4] None"

**Store:** `test_coverage_min = 80 | 60 | 40 | 0`

#### 4.2.3 Review Requirements

**Ask:** "Code review requirements? [1] Required for all changes [2] Required for critical files [3] Optional [4] None"

**Store:** `review_requirement = "all" | "critical" | "optional" | "none"`

### 4.3 Write Governance to project.yaml

All governance settings are written to the `data_governance` and `code_governance` sections of `project.yaml`:

```yaml
data_governance:
  auth_provider: "${auth_provider}"
  naming_conventions:
    fields: "${naming_fields}"
    files: "${naming_files}"
    directories: "kebab-case"
    dates: "${naming_dates}"
    enums: "SCREAMING_SNAKE"

code_governance:
  linting:
    mode: "${linting_mode}"
    command: "${lint_command}"
  testing:
    min_coverage: ${test_coverage_min}
    command: "${test_command}"
  review:
    requirement: "${review_requirement}"
```

---

## Phase 5: Design System (Enhanced)

### 5.1 Prompt for Design System

**Ask:** "Would you like to set up a design system for this project? [Y/n]"

**Default:** Yes (press Enter to accept)

**If user declines:** Skip to Phase 6 (Custom Agents)

### 5.2 Enable Design System

**Set:** `design_system_enabled = true`
**Set:** `design_system_path = ".design/"`

### 5.3 Color Scheme

**Ask:** "What color scheme will your design support? [1] Light only [2] Dark only [3] Both light and dark [4] Custom"

**Store:** `design_color_scheme = "light" | "dark" | "both" | "custom"`

### 5.4 Primary Colors

**Ask:** "What are your primary brand colors? (Enter hex codes, comma-separated, e.g., #3B82F6, #10B981)"

**Validate:** Hex color format `#[0-9A-Fa-f]{6}`
**Store:** `design_primary_colors` as array

**Example Input:** "#3B82F6, #10B981, #F59E0B"
**Example Output:**
```yaml
design_system:
  colors:
    primary:
      - "#3B82F6"
      - "#10B981"
      - "#F59E0B"
```

### 5.5 Typography Preferences

**Ask:** "Font family preference? [1] System fonts (recommended) [2] Google Fonts [3] Custom [4] Skip"

**Store:** `design_typography = "system" | "google" | "custom" | "none"`

**If Google Fonts or Custom:**
- **Ask:** "Font family name(s)? (comma-separated)"
- **Store:** `design_font_families` as array

### 5.6 Create Design System Files

If design system is enabled, create starter files in `.design/`:

1. **Create `.design/` directory:**
   ```bash
   mkdir -p .design
   ```

2. **Generate `Colors.md`** with actual content:
   - Use colors from 5.4
   - Include semantic colors (success, warning, error, info)
   - Include neutral palette (gray scale)

3. **Generate `Typography.md`** with actual content:
   - Use font families from 5.5
   - Include type scale (headings, body, captions)
   - Include font weights and line heights

4. **Generate `Components.md`** with starter patterns:
   - Button variants
   - Form inputs
   - Cards
   - Navigation

**Template location:** Check for `.parade/templates/design/` templates, or use inline fallbacks

**Write files using Write tool** to:
- `.design/Colors.md`
- `.design/Typography.md`
- `.design/Components.md`

### 5.7 Update project.yaml

Add design system configuration:

```yaml
design_system:
  enabled: true
  path: ".design/"
  color_scheme: "${design_color_scheme}"
  colors:
    primary: ${design_primary_colors}
  typography:
    mode: "${design_typography}"
    families: ${design_font_families}
  docs:
    - ".design/Colors.md"
    - ".design/Typography.md"
    - ".design/Components.md"
```

---

## Phase 6: Custom Agents (Enhanced)

### 6.1 Prompt for Custom Agents

**Ask:** "Does your project have domain-specific expertise that requires custom agents? (e.g., fitness domain, compliance, security) [Y/n]"

**Default:** No (press Enter to skip)

**If user declines:** Skip to Phase 7 (First Feature Prompt)

### 6.2 Custom Agent Definition Loop

For each custom agent the user wants to create:

#### 6.2.1 Agent Name

**Ask:** "What should this agent be called? Use kebab-case (e.g., 'fitness-domain', 'security-expert', 'compliance-sme')"

**Validate:** kebab-case format, no spaces
**Store:** `agent_label`

**Transform to display name:** Convert kebab-case to Title Case
- Example: "fitness-domain" → "Fitness Domain Expert"
- **Store:** `agent_name`

#### 6.2.2 Domain Expertise Description

**Ask:** "Describe the domain expertise this agent should have. What area does it specialize in?"

**Validate:** Non-empty string, 1-2 sentences
**Example:** "Expert in fitness tracking algorithms, workout plan validation, and health metrics analysis."
**Store:** `domain_expertise`

#### 6.2.3 Key Patterns and Focus Areas

**Ask:** "What key files, patterns, or areas of the codebase should this agent focus on when reviewing?"

**Validate:** Non-empty string
**Example:** "Workout calculation logic, health data models, fitness goal validation"
**Store:** `key_patterns`

#### 6.2.4 Generate Agent File

1. **Check for template:**
   - Try to read `.parade/templates/agents/custom-sme-agent.md.template`
   - If not found, use inline fallback template

2. **Substitute placeholders:**
   - `{{AGENT_NAME}}` → agent_name (Title Case: "Fitness Domain Expert")
   - `{{AGENT_LABEL}}` → agent_label (kebab-case: "fitness-domain")
   - `{{DOMAIN_DESCRIPTION}}` → domain_expertise
   - `{{DOMAIN_EXPERTISE}}` → domain_expertise (detailed description)
   - `{{KEY_PATTERNS}}` → key_patterns

3. **Create `.claude/agents/` directory if needed:**
   ```bash
   mkdir -p .claude/agents
   ```

4. **Write agent file** to `.claude/agents/<agent-label>.md` using Write tool

**Note:** The template includes standardized output format (findings as JSON, recommendations/concerns as plain text)

#### 6.2.5 Add to project.yaml

Add entry to `agents.custom[]` array:

```yaml
agents:
  custom:
    - name: "${agent_name}"
      label: "${agent_label}"
      prompt_file: ".claude/agents/${agent_label}.md"
```

### 6.3 Repeat or Continue

**Ask:** "Would you like to add another custom agent? [Y/n]"

- If yes: Return to 6.2.1
- If no: Continue to Phase 7

---

## Phase 7: First Feature Prompt (New)

### 7.1 Prompt for First Feature

**Display:**
```
Setup complete! Your project configuration is ready.

Would you like to walk through your first feature now? This will guide you
through the discovery process to capture a feature idea and generate a spec.

[Y] Yes, let's create a feature (recommended)
[N] No, I'll do this later
```

**Default:** Yes

### 7.2 If Yes - Guide to /discover

**Display:**
```
Great! Let's capture your first feature idea.

To start the discovery process, describe your feature idea in 1-2 sentences.
I'll use the /discover skill to:
1. Capture your feature brief
2. Run discovery with SME agents
3. Generate a detailed specification

What feature would you like to build?
```

**Wait for user input**, then:
- Invoke `/discover` skill with the user's feature description
- This transitions the user directly into the workflow

### 7.3 If No - Summarize Next Steps

**Display:**
```
No problem! Here's what you can do next:

1. **Start building a feature:**
   Run `/discover` and describe your feature idea

2. **Verify setup:**
   Run `/parade-doctor` to check everything is configured correctly

3. **Review your constitution:**
   Open `docs/CONSTITUTION.md` to review your project's guiding principles

4. **Review project config:**
   Open `project.yaml` to review or manually adjust settings

5. **Add more custom agents:**
   Run `/init-project` again to add more domain experts

6. **Review generated agents:**
   Check `.claude/agents/` for coding agents tailored to your stack

---

**Visual Dashboard (Optional)**

The Parade app provides a visual Kanban board for tracking briefs, epics, and tasks.

To install (one-time setup):
   git clone https://github.com/JeremyKalmus/parade.git ~/parade
   cd ~/parade && npm install

To run:
   cd ~/parade && npm run dev

Then open your project folder in the app.

---

Need help? Run `/help` for available commands.
```

---

## Generate Configuration and Scaffold

### YAML Generation

Use Write tool to create `project.yaml` at repository root with all collected values.

**Single-app structure:**
```yaml
version: "1.0"
project:
  name: "${project_name}"
  description: "${project_description}"
vision:
  purpose: "${constitution_vision}"
  target_users: "${constitution_target_users}"
  success_metrics: "${constitution_success_metrics}"
  core_principles: "${constitution_core_principles}"
  boundaries: "${constitution_boundaries}"
stacks:
  ${stack_type}:
    framework: "${framework}"
    language: "${language}"
    testing:
      unit: "${test_framework}"
      commands:
        test: "${test_command}"
        lint: "${lint_command}"
        build: "${build_command}"
design_system:
  enabled: ${design_system_enabled}
  path: "${design_system_path}"
  color_scheme: "${design_color_scheme}"
  colors:
    primary: ${design_primary_colors}
  typography:
    mode: "${design_typography}"
    families: ${design_font_families}
  docs:
    - ".design/Colors.md"
    - ".design/Typography.md"
    - ".design/Components.md"
data_governance:
  auth_provider: "${auth_provider}"
  naming_conventions:
    fields: "${naming_fields}"
    files: "${naming_files}"
    directories: "kebab-case"
    dates: "${naming_dates}"
    enums: "SCREAMING_SNAKE"
code_governance:
  linting:
    mode: "${linting_mode}"
    command: "${lint_command}"
  testing:
    min_coverage: ${test_coverage_min}
    command: "${test_command}"
  review:
    requirement: "${review_requirement}"
agents:
  custom: ${custom_agents_array}
```

**See:** `docs/project-yaml-spec.md` for validation checklist and complete examples

---

## Create Directory Scaffold

### Core Directories (always created)
```bash
mkdir -p .claude/skills .claude/agents .claude/schemas .claude/templates .beads
mkdir -p .design  # if design_system.enabled
```

### Template Files

**CLAUDE.md**: Project instructions with stack info
- Check if exists, offer: [1] Keep [2] Replace (backup) [3] Merge (add Stack section)
- Use templates from `.claude/templates/CLAUDE.md.template`
- Substitute: `{{PROJECT_NAME}}`, `{{FRAMEWORK}}`, `{{LANGUAGE}}`, etc.

**beads/config.yaml**: Beads CLI configuration
- Check if exists, offer: [1] Keep [2] Replace (backup)
- Use templates from `.claude/templates/beads-config.yaml.template`
- Substitute: `{{PROJECT_PREFIX}}` (lowercase, no spaces)

### Design System Templates (if enabled)

Create starter files in `.design/`:
- `Colors.md` - Color palette (primary, semantic, neutral)
- `Typography.md` - Font families and scale
- `Components.md` - Component patterns

### Check and Initialize Beads

Beads is a **required dependency** for Parade. Check if it's installed:

```bash
which bd
```

**If Beads is NOT installed:**

Display installation instructions:
```
⚠️  Beads CLI not found

Beads is required for task management. Install it with:

  npm install -g beads

Or visit: https://github.com/steveyegge/beads

Options:
1. Install now (I'll wait)
2. Continue without beads (limited functionality)
3. Exit and install manually
```

**If Beads IS installed:**

Initialize the project:
```bash
bd init --prefix "$PROJECT_PREFIX"
```

Verify initialization:
```bash
bd doctor
```

**See:** `docs/init-troubleshooting.md` for error handling scenarios

---

## Generate Coding Agents

After stack selection (Phase 3), generate stack-specific coding agents to assist with implementation tasks.

### Framework-to-Template Mapping

Based on the selected stack, copy and customize the appropriate agent template:

| Stack Type | Framework/Language | Template File | Output File |
|------------|-------------------|---------------|-------------|
| frontend | TypeScript, JavaScript, React, Next.js, Vue, Svelte | `typescript-agent.md.template` | `typescript-agent.md` |
| backend | TypeScript, JavaScript, Node.js, Express | `typescript-agent.md.template` | `typescript-agent.md` |
| mobile | Swift, SwiftUI, UIKit | `swift-agent.md.template` | `swift-agent.md` |
| database | PostgreSQL, Supabase, SQLite | `sql-agent.md.template` | `sql-agent.md` |

### Agent Generation Logic

For each applicable stack type:

1. **Detect framework type** from user responses in Phase 2
2. **Select template** based on mapping table above
3. **Read template** from `.claude/templates/agents/<template-name>`
4. **Substitute placeholders** with collected values:
   - `{{PROJECT_NAME}}` → project_name
   - `{{FRAMEWORK}}` → framework (e.g., "Vitest", "SwiftUI", "PostgreSQL")
   - `{{LANGUAGE}}` → language (e.g., "TypeScript", "Swift")
   - `{{TEST_COMMAND}}` → test_command
   - `{{BUILD_COMMAND}}` → build_command
5. **Write agent file** to `.claude/agents/<agent-name>.md`

### Placeholder Substitution Examples

**TypeScript Agent:**
- `{{PROJECT_NAME}}` → "MyAwesomeApp"
- `{{FRAMEWORK}}` → "Vitest"
- `{{LANGUAGE}}` → "TypeScript"
- `{{TEST_COMMAND}}` → "npm test"
- `{{BUILD_COMMAND}}` → "npm run build"

**Swift Agent:**
- `{{PROJECT_NAME}}` → "MyiOSApp"
- `{{FRAMEWORK}}` → "SwiftUI"
- `{{LANGUAGE}}` → "Swift"
- `{{TEST_COMMAND}}` → "swift test"
- `{{BUILD_COMMAND}}` → "swift build"

**SQL Agent:**
- `{{PROJECT_NAME}}` → "MyDatabaseProject"
- `{{FRAMEWORK}}` → "PostgreSQL"
- `{{LANGUAGE}}` → "SQL"
- `{{TEST_COMMAND}}` → "psql -f tests/schema_test.sql"
- `{{BUILD_COMMAND}}` → "supabase db reset"

### Multi-Stack Projects

For projects with multiple stack types (e.g., full-stack apps):
- Generate agents for each relevant stack
- Example: A Next.js + Supabase project generates:
  - `typescript-agent.md` (frontend/backend)
  - `sql-agent.md` (database)

### Agent File Handling

**If agent file exists:**
- Offer: [1] Keep [2] Replace (backup to `.md.bak`) [3] Skip
- Default: Keep existing agents to preserve customizations

**Backup naming:**
- `typescript-agent.md.bak`
- If backup exists, use timestamp: `typescript-agent.md.bak.20260102_143000`

---

## Existing Configuration Handling

### Detection
```bash
ls -la project.yaml 2>/dev/null && echo "EXISTS" || echo "NOT_FOUND"
```

### If EXISTS
**Offer options:**
1. **View** - Display current configuration
2. **Merge** - Add new sections while preserving existing
3. **Replace** - Backup to `project.yaml.bak` and start fresh

### Merge Strategy
- Use Edit tool to surgically add/update sections
- Preserve existing project name, description, stacks
- Add new optional sections (design_system, agents, etc.)
- Show diff before applying changes

### Backup Logic
```bash
# Always backup before replace
cp project.yaml project.yaml.bak
# If backup exists, create timestamped: project.yaml.bak.20260102_143000
```

**See:** `docs/config-merge-patterns.md` for detailed merge procedures and examples

---

## Output

### Success Summary

Display at the end of the wizard (only if NOT transitioning to /discover):

```
## Project Initialized Successfully!

### Files Created
- project.yaml (comprehensive project configuration)
- .claude/CLAUDE.md (project-specific instructions)
- .claude/agents/typescript-agent.md (TypeScript coding agent) [example]
- .claude/agents/fitness-domain.md (custom SME) [if created]
- docs/CONSTITUTION.md (project constitution) [if created]
- .design/Colors.md (color palette) [if design system enabled]
- .design/Typography.md (typography system) [if design system enabled]
- .design/Components.md (component patterns) [if design system enabled]

**Note:** All custom SME agents use the standardized output format (findings as JSON, recommendations/concerns as plain text).

### Directories Created
- .claude/skills/, .claude/agents/, .claude/schemas/, .claude/templates/
- .beads/ (task management)
- .design/ [if design system enabled]
- docs/ [if constitution created]

### Configuration Summary
Project: ${project_name}
Vision: ${constitution_vision} [if created]
Stack: ${framework} / ${language} / ${test_framework}
Auth Provider: ${auth_provider}
Design System: ${design_system_enabled ? "Enabled" : "Disabled"}
Governance: Data (${naming_fields} fields) + Code (${linting_mode} linting)
Coding Agents: ${generated_agents}
Custom SMEs: ${custom_agents} [if created]
Constitution: ${constitution_created ? "Created" : "Skipped"}

---

## What's Next?

[Content from Phase 7.3 - Next Steps]
```

---

## Quick Reference: Minimal Flow

For `--minimal` flag:

**Phase 0:** Environment check (always runs)

**Phase 1:** Project basics (3 questions)
1. Project name
2. Project description (1-2 sentences)
3. Repository type [1-2]

**Phase 2:** Skip constitution (auto-skip with --minimal)

**Phase 3:** Tech stack (4 questions)
1. Stack type [1-4]
2. Framework (based on stack)
3. Primary language [1-6]
4. Test command (with smart default)

**Phase 3.5:** Skip MCP setup (auto-skip with --minimal)

**Phase 4:** Skip governance (use smart defaults)

**Phase 5:** Skip design system (auto-skip with --minimal)

**Phase 6:** Skip custom agents (auto-skip with --minimal)

**Phase 7:** Skip first feature prompt (auto-skip with --minimal)

**Generate minimal YAML** with smart defaults, create directories, show success message.
**Total time: ~3-4 minutes** (7 questions + environment check)

---

## Reference Documentation

For detailed specifications, merge procedures, and troubleshooting:

- **docs/project-yaml-spec.md** - Complete YAML schema, validation rules, examples
- **docs/config-merge-patterns.md** - Merge/replace logic, backup procedures, existing config handling
- **docs/init-troubleshooting.md** - Error scenarios, validation failures, recovery procedures
