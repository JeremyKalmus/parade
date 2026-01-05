---
name: parade-doctor
description: Diagnose and verify Parade project setup. Checks all required components and reports issues.
---

# Parade Doctor Skill

## Purpose

Diagnose and verify Parade project setup. Checks all required components (directories, database, beads integration, skills, configuration) and reports health status with actionable recommendations.

## When to Use

- After running `npx parade-init` and `/init-project`
- When something isn't working correctly
- To verify project health before starting work
- When debugging workflow issues
- User explicitly invokes `/parade-doctor`

---

## Diagnostic Checks

### 1. Directory Structure
- `.parade/` exists
- `.claude/` exists
- `.beads/` exists
- `project.yaml` exists

### 2. Database Health
- `discovery.db` exists (check both `.parade/` and root)
- Database is readable
- Required tables exist: `briefs`, `specs`, `interview_questions`, `sme_reviews`, `workflow_events`, `agent_telemetry`

### 3. Beads Integration
- `bd` CLI is installed and in PATH
- `bd list` works
- `.beads/config.yaml` exists and is valid

### 4. Skill Files
- `discover/SKILL.md` exists
- `approve-spec/SKILL.md` exists
- `run-tasks/SKILL.md` exists
- `retro/SKILL.md` exists
- `workflow-status/SKILL.md` exists
- `init-project/SKILL.md` exists

### 5. Configuration
- `project.yaml` is valid YAML
- Has required fields: `project.name`, `stacks`
- Optional fields: `design_system`, `agents.custom`

---

## Execution Flow

### Step 1: Check Directory Structure

```bash
# Check required directories
if [ -d ".parade" ]; then
  echo "✅ .parade/ directory"
else
  echo "❌ .parade/ directory missing"
fi

if [ -d ".claude" ]; then
  echo "✅ .claude/ directory"
else
  echo "❌ .claude/ directory missing"
fi

if [ -d ".beads" ]; then
  echo "✅ .beads/ directory"
else
  echo "❌ .beads/ directory missing"
fi

if [ -f "project.yaml" ]; then
  echo "✅ project.yaml"
else
  echo "❌ project.yaml missing"
fi
```

### Step 2: Check Database Health

```bash
# Find discovery.db location
if [ -f ".parade/discovery.db" ]; then
  DISCOVERY_DB=".parade/discovery.db"
  echo "✅ discovery.db found at .parade/discovery.db"
elif [ -f "./discovery.db" ]; then
  DISCOVERY_DB="./discovery.db"
  echo "⚠️ discovery.db found at project root (legacy location)"
else
  echo "❌ discovery.db not found"
  DISCOVERY_DB=""
fi

# Test database readability
if [ -n "$DISCOVERY_DB" ]; then
  if sqlite3 "$DISCOVERY_DB" "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ Database readable"
  else
    echo "❌ Database corrupted or unreadable"
  fi

  # Check required tables
  TABLES=$(sqlite3 "$DISCOVERY_DB" "SELECT name FROM sqlite_master WHERE type='table';")
  REQUIRED_TABLES=("briefs" "specs" "interview_questions" "sme_reviews" "workflow_events" "agent_telemetry")

  for table in "${REQUIRED_TABLES[@]}"; do
    if echo "$TABLES" | grep -q "^$table$"; then
      echo "✅ Table: $table"
    else
      echo "❌ Missing table: $table"
    fi
  done
fi
```

### Step 3: Check Beads Integration

```bash
# Check bd CLI
if command -v bd >/dev/null 2>&1; then
  BD_VERSION=$(bd --version 2>&1 || echo "unknown")
  echo "✅ bd CLI installed (version $BD_VERSION)"

  # Test bd list
  if bd list --json >/dev/null 2>&1; then
    echo "✅ bd list works"
  else
    echo "❌ bd list failed"
  fi
else
  echo "❌ bd CLI not installed"
fi

# Check beads config
if [ -f ".beads/config.yaml" ]; then
  echo "✅ .beads/config.yaml exists"
  # Validate YAML
  if python3 -c "import yaml; yaml.safe_load(open('.beads/config.yaml'))" 2>/dev/null; then
    echo "✅ config.yaml valid"
  else
    echo "⚠️ config.yaml may have syntax issues"
  fi
else
  echo "❌ .beads/config.yaml missing"
fi
```

### Step 4: Check Skill Files

```bash
SKILLS=("discover" "approve-spec" "run-tasks" "retro" "workflow-status" "init-project")

for skill in "${SKILLS[@]}"; do
  if [ -f ".claude/skills/$skill/SKILL.md" ]; then
    echo "✅ $skill"
  else
    echo "❌ Missing: $skill"
  fi
done
```

### Step 5: Check Configuration

```bash
if [ -f "project.yaml" ]; then
  # Validate YAML syntax
  if python3 -c "import yaml; yaml.safe_load(open('project.yaml'))" 2>/dev/null; then
    echo "✅ project.yaml valid YAML"

    # Check required fields
    if grep -q "name:" project.yaml; then
      PROJECT_NAME=$(grep "name:" project.yaml | head -1 | sed 's/.*name: *//' | tr -d '"')
      echo "✅ Project name: $PROJECT_NAME"
    else
      echo "❌ Missing: project.name"
    fi

    if grep -q "stacks:" project.yaml; then
      echo "✅ stacks section defined"
    else
      echo "❌ Missing: stacks section"
    fi

    # Check optional fields
    if grep -q "design_system:" project.yaml; then
      echo "✅ design_system section defined"
    else
      echo "⚠️ Optional: design_system section (consider adding)"
    fi

    if grep -q "agents:" project.yaml && grep -q "custom:" project.yaml; then
      echo "✅ Custom agents defined"
    else
      echo "⚠️ Optional: custom agents (not required)"
    fi
  else
    echo "❌ project.yaml has syntax errors"
  fi
fi
```

---

## Output Format

```
🏥 Parade Doctor - Project Health Check

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Directory Structure:
  ✅ .parade/ directory
  ✅ .claude/ directory
  ✅ .beads/ directory
  ✅ project.yaml

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Database:
  ✅ discovery.db found at .parade/discovery.db
  ✅ Database readable
  ✅ Table: briefs
  ✅ Table: specs
  ✅ Table: interview_questions
  ✅ Table: sme_reviews
  ✅ Table: workflow_events
  ✅ Table: agent_telemetry

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Beads CLI:
  ✅ bd CLI installed (version 0.5.2)
  ✅ bd list works
  ✅ .beads/config.yaml exists
  ✅ config.yaml valid

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Skills:
  ✅ discover
  ✅ approve-spec
  ✅ run-tasks
  ✅ retro
  ✅ workflow-status
  ✅ init-project

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Configuration:
  ✅ project.yaml valid YAML
  ✅ Project name: "MyProject"
  ✅ stacks section defined
  ⚠️ Optional: design_system section (consider adding)
  ⚠️ Optional: custom agents (not required)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Health Score: 95% (23/24 checks passed)

Recommendations:
  - Consider adding a design_system section to project.yaml
  - All critical components are healthy!
```

---

## Error Output Examples

### Missing .parade/ Directory

```
❌ .parade/ directory missing

How to fix:
1. Run: npx parade-init
2. Follow the setup wizard
3. Run: /parade-doctor again
```

### Missing discovery.db

```
❌ discovery.db not found

How to fix:
1. Ensure you've run /init-project
2. Or manually create: sqlite3 .parade/discovery.db ".databases"
3. Run any workflow skill (/discover) to initialize schema
```

### bd CLI Not Installed

```
❌ bd CLI not installed

How to fix:
1. Install beads: npm install -g @beadlabs/beads-cli
2. Or via brew: brew install beads-cli
3. Verify: bd --version
```

### Missing Skill Files

```
❌ Missing: discover
❌ Missing: approve-spec

How to fix:
1. Re-run: npx parade-init --repair
2. Or manually copy from parade-init package:
   cp -r node_modules/@parade/init/.claude/skills/* .claude/skills/
```

### Invalid project.yaml

```
❌ project.yaml has syntax errors

How to fix:
1. Validate YAML: cat project.yaml | python3 -c "import yaml, sys; yaml.safe_load(sys.stdin)"
2. Common issues: incorrect indentation, missing quotes
3. Re-run: /init-project to regenerate
```

---

## Health Score Calculation

```
Total Checks:
- Directory Structure: 4 checks
- Database: 7 checks (1 location + 1 readable + 5 tables)
- Beads Integration: 4 checks
- Skills: 6 checks
- Configuration: 4 checks (2 required + 2 optional)

Score = (passed_checks / total_checks) * 100

Thresholds:
- 100%: Perfect health
- 90-99%: Good health (minor optional items missing)
- 70-89%: Degraded (some components missing)
- <70%: Critical (major components missing)
```

---

## Implementation Notes

### Shell Script vs. Direct Execution

Execute checks directly in bash for speed and reliability. Use Python only for YAML validation if available (graceful fallback if not).

### Error Handling

- Use `2>/dev/null || true` to silence expected errors
- Distinguish between "missing" vs "broken" components
- Provide specific, actionable error messages

### Platform Compatibility

- Use POSIX-compliant bash commands
- Test on macOS, Linux, Windows (Git Bash)
- Gracefully handle missing utilities (python3, sqlite3)

### Performance

All checks should complete in < 2 seconds. No network calls required.

---

## Example Invocations

### Healthy Project

```
User: /parade-doctor

Claude: Running health check...

🏥 Parade Doctor - Project Health Check

[All green checkmarks]

Health Score: 100% (28/28 checks passed)

Your Parade setup is perfect! Ready to start building.
```

### Fresh Project (Missing beads)

```
User: /parade-doctor

Claude: Running health check...

🏥 Parade Doctor - Project Health Check

Directory Structure: ✅ (4/4)
Database: ✅ (7/7)
Beads CLI: ❌ (0/4)
  ❌ bd CLI not installed
Skills: ✅ (6/6)
Configuration: ✅ (4/4)

Health Score: 74% (21/28 checks passed)

Critical Issue:
  Beads CLI is not installed. Install with:
  npm install -g @beadlabs/beads-cli

After fixing, run /parade-doctor again.
```

---

## Integration with Other Skills

### /init-project
Should run `/parade-doctor` at the end to verify setup.

### /discover, /approve-spec, /run-tasks
Can reference doctor output in error messages:
"Database error detected. Run /parade-doctor to diagnose."

### /workflow-status
Can show doctor summary in status output.

---

## Future Enhancements

- **Auto-repair mode**: `/parade-doctor --fix` attempts to fix common issues
- **Deep checks**: Verify database schema versions, check for orphaned records
- **Performance analysis**: Check database size, index health
- **Network checks**: Verify beads sync connectivity (if remote backend)
- **Skill validation**: Parse SKILL.md files for required sections
- **Git health**: Check for unstaged changes, unpushed commits

---

## Output

After successful execution:
- Console output with health check results
- Health score percentage
- Categorized check results (✅ pass, ❌ fail, ⚠️ warning)
- Actionable recommendations for any failures
- Exit code: 0 (healthy), 1 (warnings), 2 (critical issues)
