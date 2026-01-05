# Init-Project Integration Tests

These integration tests verify the complete workflow from project initialization through task execution.

---

## Test 1: Minimal Single-App Setup

**Objective:** Verify minimal setup completes in under 5 minutes

### Steps

1. Create a clean test directory:
   ```bash
   mkdir /tmp/test-project && cd /tmp/test-project
   ```

2. Run `/init-project --minimal`

3. Answer only required questions:
   - Project name: "TestApp"
   - Description: "A test application"
   - Stack type: Frontend
   - Framework: Next.js
   - Language: TypeScript
   - Test command: npm test

4. Verify outputs:
   ```bash
   # Check project.yaml exists and is valid
   ls -la project.yaml
   cat project.yaml

   # Verify required sections
   grep "version:" project.yaml
   grep "name:" project.yaml
   grep "stacks:" project.yaml
   ```

### Expected Results
- [ ] project.yaml created at root
- [ ] version field is "1.0"
- [ ] project.name matches input
- [ ] stacks.frontend section populated
- [ ] Total time < 5 minutes

---

## Test 2: Full Setup with Design System

**Objective:** Verify design system scaffold creation

### Steps

1. Run `/init-project` (not minimal)

2. Complete required questions, then select:
   - Optional: Design System (option 1)
   - Create starter templates: Yes
   - Color scheme: Both (light + dark)

3. Verify outputs:
   ```bash
   # Check design directory created
   ls -la .design/

   # Verify template files
   cat .design/Colors.md
   cat .design/Typography.md
   cat .design/Components.md
   ```

### Expected Results
- [ ] .design/ directory created
- [ ] Colors.md contains color palette
- [ ] Typography.md contains font scale
- [ ] Components.md contains component specs
- [ ] project.yaml has design_system.enabled: true

---

## Test 3: Custom SME Agent Creation

**Objective:** Verify custom agent creation and integration

### Steps

1. Run `/init-project`

2. Select optional: Custom SME Agents (option 3)

3. Create agent:
   - Name: "fitness-domain"
   - Description: "Expert in fitness and exercise science"
   - Key patterns: "src/models/workout.*, src/services/training/*"

4. Verify outputs:
   ```bash
   # Check agent file created
   ls -la .claude/agents/
   cat .claude/agents/fitness-domain.md

   # Check project.yaml references it
   grep "fitness-domain" project.yaml
   ```

### Expected Results
- [ ] Agent file created at .claude/agents/fitness-domain.md
- [ ] Agent file contains role description
- [ ] Agent file contains key patterns
- [ ] project.yaml has agents.custom entry

---

## Test 4: Monorepo Configuration

**Objective:** Verify multi-app monorepo setup

### Steps

1. Run `/init-project`

2. Select: Monorepo (option 2) in Step 2

3. Configure 2 apps:
   - App 1: "web-frontend", path "apps/web", Next.js, TypeScript
   - App 2: "mobile-ios", path "apps/ios", SwiftUI, Swift

4. Verify outputs:
   ```bash
   # Check project.yaml structure
   cat project.yaml

   # Verify stacks is an array
   grep -A 20 "stacks:" project.yaml
   ```

### Expected Results
- [ ] project.yaml uses array format for stacks
- [ ] Both apps defined with name, type, path
- [ ] Each app has own testing config
- [ ] Framework and language correct per app

---

## Test 5: Existing Config Detection and Merge

**Objective:** Verify existing config is preserved on re-run

### Steps

1. Create initial config with `/init-project`

2. Run `/init-project` again

3. Select: Merge (add new sections)

4. Add: Design System

5. Verify outputs:
   ```bash
   # Check backup created
   ls -la project.yaml.bak

   # Verify original settings preserved
   diff project.yaml project.yaml.bak

   # Verify new section added
   grep "design_system" project.yaml
   ```

### Expected Results
- [ ] Existing config detected
- [ ] Merge/Replace options offered
- [ ] Original project.name preserved
- [ ] Original stacks preserved
- [ ] New design_system section added

---

## Test 6: End-to-End Workflow Integration

**Objective:** Verify init-project config is used by downstream skills

### Steps

1. Initialize project:
   ```bash
   /init-project
   # Configure with SwiftUI stack and custom SME agent
   ```

2. Create a brief:
   ```bash
   /create-brief
   # Describe a new feature
   ```

3. Start discovery:
   ```bash
   /start-discovery <brief-id>
   ```

4. Verify SME agents used:
   ```bash
   sqlite3 -json discovery.db "SELECT agent_type FROM sme_reviews WHERE brief_id = '<brief-id>';"
   ```

5. Approve spec:
   ```bash
   /approve-spec <spec-id>
   ```

6. Verify task verification commands:
   ```bash
   bd show <task-id>
   # Check acceptance criteria contains stack test command
   ```

### Expected Results
- [ ] /start-discovery spawns custom SME from project.yaml
- [ ] /start-discovery spawns default technical-sme and business-sme
- [ ] sme_reviews table contains custom agent review
- [ ] /approve-spec creates tasks with verification from stack config
- [ ] Task acceptance criteria includes "swift test" (from mobile stack)

---

## Test 7: Validation of Referenced Docs

**Objective:** Verify validation warns about missing files

### Steps

1. Run `/init-project`

2. Add custom agent referencing non-existent file:
   - prompt_file: ".claude/agents/missing-agent.md"

3. Observe validation output

### Expected Results
- [ ] Warning displayed about missing file
- [ ] Options offered: create, continue, remove
- [ ] If "create" selected, template generated
- [ ] If "continue" selected, proceeds with warning

---

## Test 8: Directory Scaffold Verification

**Objective:** Verify all directories and templates created

### Steps

1. Run `/init-project` on clean directory

2. Verify structure:
   ```bash
   tree .claude .beads .design 2>/dev/null || find .claude .beads .design -type f 2>/dev/null
   ```

### Expected Results
- [ ] .claude/skills/ exists
- [ ] .claude/agents/ exists
- [ ] .claude/schemas/ exists
- [ ] .claude/templates/ exists
- [ ] .beads/ exists
- [ ] .claude/CLAUDE.md generated from template
- [ ] .beads/config.yaml generated from template
- [ ] Placeholders in templates replaced with actual values

---

## Running Tests

These tests can be run manually by:

1. Creating a temporary test directory
2. Following the steps for each test
3. Checking off expected results

For automated testing, these scenarios can be scripted using expect or similar tools.

---

## Test Environment Cleanup

After testing:
```bash
rm -rf /tmp/test-project
```
