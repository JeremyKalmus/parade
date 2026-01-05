# init-project Troubleshooting Guide

This document covers error handling, validation failures, and recovery scenarios.

---

## Validation Errors

### Invalid Project Name

**Error:**
```
Project name must start with a letter and can only contain letters, numbers, spaces, dashes, and underscores. Please try again.
```

**Fix:**
- Ensure name starts with a letter (A-Z or a-z)
- Only use alphanumeric characters, spaces, dashes, and underscores
- Keep length under 100 characters

**Examples:**
- Valid: `MyApp`, `My App`, `my-app`, `App_2024`
- Invalid: `123App`, `@MyApp`, `app!`, `_myapp`

---

### Backup Creation Fails

**Error:**
```
Error: Could not create backup

Possible causes:
- Disk full
- Permission denied
- Read-only filesystem
```

**Options:**
```
[1] Retry backup
[2] Continue without backup (risky)
[3] Cancel operation

> _
```

**Fix:**
- Check disk space: `df -h .`
- Check permissions: `ls -la project.yaml`
- Ensure directory is writable
- If on read-only filesystem, move to writable location

---

### Parse Error in Existing Config

**Error:**
```
Warning: Could not parse existing project.yaml

The file may contain invalid YAML syntax.
```

**Options:**
```
[1] View raw file contents
[2] Replace with new configuration (backs up invalid file)
[3] Cancel and fix manually

> _
```

**Fix:**
- View file to identify syntax errors
- Common issues:
  - Mixed tabs and spaces
  - Unquoted special characters
  - Mismatched indentation
  - Missing colons
- Validate manually with: `python -c "import yaml; yaml.safe_load(open('project.yaml'))"`

---

### Merge Conflict Detection

**Error:**
```
Merge Conflict Detected

The section 'design_system.path' already exists but differs from proposed:

EXISTING:
  design_system:
    enabled: true
    path: ".design/"

PROPOSED:
  design_system:
    enabled: true
    path: "./design-docs/"
```

**Options:**
```
[1] Keep existing value (".design/")
[2] Use proposed value ("./design-docs/")
[3] Cancel merge

> _
```

**Fix:**
- Review both values
- Choose the correct path for your project
- If unsure, keep existing value

---

## File Reference Validation Issues

### Missing Agent Prompt File

**Warning:**
```
WARNING: Agent prompt file not found: .claude/agents/nutrition-expert.md

Would you like to:
[1] Create the file now (will generate template)
[2] Continue anyway (file will need to be created manually)
[3] Remove this agent from configuration

> _
```

**Fix:**
- Option 1: Auto-generate template file
- Option 2: Create file manually later
- Option 3: Remove agent from config

**Manual creation:**
```bash
mkdir -p .claude/agents
cat > .claude/agents/nutrition-expert.md <<EOF
# Nutrition Expert SME Agent

## Role
Expert in nutritional science, meal planning, and macronutrient optimization.

## Expertise Areas
- Nutritional analysis
- Meal planning
- Dietary recommendations

## Review Patterns
- src/models/nutrition.*
- src/services/meal/*
- docs/nutrition/*
EOF
```

---

### Missing Design System Path

**Warning:**
```
Note: Design system path '.design/' will be created
```

**Action:**
- Skill will auto-create directory during scaffold
- No action needed unless custom path specified

---

### Referenced Design Docs Not Found

**Warning:**
```
WARNING: Design doc not found: .design/Colors.md
```

**Fix:**
- Files will be auto-generated if design_system enabled
- Check that design_system.path is correct
- Manually create missing docs if needed

---

## Directory Scaffold Errors

### Permission Denied Creating Directories

**Error:**
```bash
mkdir: .claude/: Permission denied
```

**Fix:**
```bash
# Check current directory permissions
ls -la .

# Ensure you're in project root and have write permissions
pwd

# If needed, adjust permissions
chmod u+w .

# Or run from correct location
cd /path/to/your/project
```

---

### Partial Scaffold Creation

**Issue:** Some directories created, others failed

**Verification:**
```bash
# Check what was created
ls -la .claude/ .beads/ .design/

# Verify expected structure
ls -la .claude/skills/ .claude/agents/ .claude/schemas/
```

**Recovery:**
```bash
# Create missing directories manually
mkdir -p .claude/skills
mkdir -p .claude/agents
mkdir -p .claude/schemas
mkdir -p .claude/templates
mkdir -p .beads
mkdir -p .design  # if design_system enabled
```

---

## YAML Generation Errors

### Schema Validation Failure

**Error:**
```
Validation failed: project.name must match pattern ^[a-zA-Z][a-zA-Z0-9-_ ]*$
```

**Fix:**
- Review collected wizard responses
- Re-validate project name
- Ensure all required fields present
- Check field types (string vs number)

**Validation checklist:**
```yaml
# Required fields
version: "1.0"              # Must be string "1.0"
project:
  name: "ValidName"         # Must start with letter

# Stack (at least one)
stacks:
  frontend:                 # or backend, mobile, database
    framework: "Next.js"    # Non-empty string
    language: "TypeScript"  # Non-empty string
```

---

### Template File Not Found

**Error:**
```
Error: Template not found: .claude/templates/CLAUDE.md.template
```

**Fix:**
- Ensure `.claude/templates/` directory exists
- Check if templates were included in skill installation
- Create basic template manually if missing:

```bash
mkdir -p .claude/templates

cat > .claude/templates/CLAUDE.md.template <<EOF
# {{PROJECT_NAME}}

{{PURPOSE}}

## Stack

- **Framework**: {{FRAMEWORK}}
- **Language**: {{LANGUAGE}}
- **Testing**: {{TEST_COMMAND}}
- **Build**: {{BUILD_COMMAND}}
EOF
```

---

## Beads Integration Issues

### bd CLI Not Found

**Warning:**
```bash
which bd && bd init --prefix "$PROJECT_PREFIX" || echo "bd CLI not found, skipping beads init"
```

**Result:**
```
bd CLI not found, skipping beads init
```

**Impact:**
- `.beads/` directory created but not initialized
- Can run `bd init` manually later

**Fix:**
```bash
# Install beads CLI
npm install -g @beadslabs/cli

# Initialize manually
cd /path/to/project
bd init --prefix myproject
```

---

### beads init Fails

**Error:**
```
Error: .beads/ already initialized
```

**Fix:**
- If reinitializing, remove `.beads/` first
- Or skip beads init and keep existing setup

```bash
# Option 1: Remove and reinit
rm -rf .beads
bd init --prefix newprefix

# Option 2: Keep existing
# No action needed, existing beads config preserved
```

---

## Recovery Scenarios

### Incomplete Wizard Run

**Scenario:** User cancels mid-wizard or error occurs

**Check what was created:**
```bash
ls -la project.yaml .claude/ .beads/
```

**Options:**
1. **Resume**: Run `/init-project` again, will detect partial state
2. **Clean up**: Remove partial files and start fresh
3. **Manual fix**: Complete missing pieces manually

**Clean up commands:**
```bash
# Remove partial files
rm -f project.yaml
rm -rf .claude/
rm -rf .beads/
rm -rf .design/

# Then re-run /init-project
```

---

### Corrupted Generated Files

**Scenario:** YAML or template files generated incorrectly

**Validation:**
```bash
# Validate YAML syntax
python -c "import yaml; yaml.safe_load(open('project.yaml'))"

# Check file contents
cat project.yaml
cat .claude/CLAUDE.md
```

**Recovery:**
```bash
# If backup exists
cp project.yaml.bak project.yaml

# Or regenerate
# Delete corrupted files
rm project.yaml .claude/CLAUDE.md

# Re-run init-project
```

---

### Wrong Configuration Generated

**Scenario:** Realized configuration has wrong values after completion

**Options:**

1. **Manual edit**: Use Edit tool to fix specific values
2. **Re-run wizard**: Delete and regenerate
3. **Restore backup**: If replacement was used

**Manual edit example:**
```yaml
# Change framework from React to Next.js
# Use Edit tool:
# old_string: framework: "React"
# new_string: framework: "Next.js"
```

**Re-run wizard:**
```bash
# Backup current (in case needed)
cp project.yaml project.yaml.backup

# Re-run
# /init-project will detect existing and offer options
```

---

## Validation Summary Output

After generation, verify all pieces:

```bash
# Verification commands
ls -la .claude/               # Should show: skills/, agents/, schemas/, templates/, CLAUDE.md
ls -la .claude/skills/        # Should exist (may be empty)
ls -la .claude/agents/        # Should exist (may contain custom SME agents)
ls -la .claude/templates/     # Should show templates
ls -la .beads/                # Should show: config.yaml
ls -la .design/               # Only if design_system.enabled
ls -la project.yaml           # Should exist at root

# Validate YAML syntax
python -c "import yaml; yaml.safe_load(open('project.yaml'))" && echo "YAML is valid"

# Count lines in generated files
wc -l project.yaml .claude/CLAUDE.md
```

**Expected output:**
```
.claude/
  skills/
  agents/
  schemas/
  templates/
  CLAUDE.md

.beads/
  config.yaml

project.yaml

Design system files (if enabled):
.design/
  Colors.md
  Typography.md
  Components.md
```
