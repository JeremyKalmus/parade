# project.yaml Specification Reference

## Schema Compliance

All generated `project.yaml` files MUST conform to `.claude/schemas/project.schema.json`.

---

## Required Fields

| Field | Type | Validation | Example |
|-------|------|------------|---------|
| `version` | string | Must be "1.0" | `"1.0"` |
| `project.name` | string | Pattern: `^[a-zA-Z][a-zA-Z0-9-_ ]*$`, max 100 chars | `"MyApp"` |

---

## Optional Fields (with defaults)

| Section | Field | Default | Description |
|---------|-------|---------|-------------|
| `project.description` | string | `""` | Brief project description |
| `project.repository` | string (URI) | `""` | Git repository URL |
| `vision.purpose` | string | `""` | Mission statement |
| `vision.target_users` | array | `[]` | User personas |
| `vision.success_metrics` | array | `[]` | KPIs |
| `stacks` | object or array | `{}` | Stack configs (object for single, array for monorepo) |
| `design_system.enabled` | boolean | `false` | Whether design system is active |
| `design_system.path` | string | `".design/"` | Path to design files |
| `data_governance.auth_provider` | string | `""` | Auth provider name |
| `agents.custom` | array | `[]` | Custom agent definitions |

---

## Stack Configuration Structure

### Single-App Format (stacks is object)

```yaml
stacks:
  frontend:    # or backend, mobile, database
    framework: "Next.js"
    language: "TypeScript"
    testing:
      unit: "Jest"
      e2e: "Playwright"  # optional
      commands:
        test: "npm test"
        lint: "npm run lint"
        build: "npm run build"
```

### Monorepo Format (stacks is array)

```yaml
stacks:
  - name: "web-app"        # Required
    type: "frontend"       # Required: frontend|backend|mobile|database|shared
    path: "apps/web"       # Optional, path in monorepo
    framework: "Next.js"
    language: "TypeScript"
    testing:
      unit: "Jest"
      commands:
        test: "cd apps/web && npm test"
```

---

## Custom Agent Structure

```yaml
agents:
  custom:
    - name: "Fitness Domain Expert"    # Required: display name
      label: "fitness-domain"          # Required: pattern ^[a-z][a-z0-9-]*$
      prompt_file: ".claude/agents/fitness-domain.md"  # Required
```

---

## Naming Conventions (Data Governance)

```yaml
data_governance:
  auth_provider: ""
  naming_conventions:
    dates: "created_at"        # or "createdAt"
    enums: "SCREAMING_SNAKE"   # or snake_case, PascalCase, camelCase
    fields: "snake_case"       # or camelCase, PascalCase
    files: "kebab-case"        # or snake_case, camelCase, PascalCase
    directories: "kebab-case"  # or snake_case, camelCase, PascalCase
```

---

## Complete Example: SwiftUI Mobile App

```yaml
version: "1.0"

project:
  name: "FitTracker Pro"
  description: "A fitness app for personalized workout plans"

vision:
  purpose: "A fitness app for personalized workout plans"

stacks:
  mobile:
    framework: "SwiftUI"
    language: "Swift"
    testing:
      unit: "XCTest"
      commands:
        test: "swift test"
        lint: "swiftlint"
        build: "swift build"

design_system:
  enabled: false
  path: ".design/"
  docs: []

data_governance:
  auth_provider: ""
  naming_conventions:
    dates: "created_at"
    enums: "SCREAMING_SNAKE"
    fields: "snake_case"
    files: "kebab-case"
    directories: "kebab-case"

agents:
  custom: []
```

---

## Complete Example: Next.js Frontend with Design System

```yaml
version: "1.0"

project:
  name: "MyWebApp"
  description: "E-commerce platform for artisan goods"

vision:
  purpose: "E-commerce platform for artisan goods"

stacks:
  frontend:
    framework: "Next.js"
    language: "TypeScript"
    testing:
      unit: "Jest"
      commands:
        test: "npm test"
        lint: "npm run lint"
        build: "npm run build"

design_system:
  enabled: true
  path: ".design/"
  docs: []

data_governance:
  auth_provider: ""
  naming_conventions:
    dates: "created_at"
    enums: "SCREAMING_SNAKE"
    fields: "snake_case"
    files: "kebab-case"
    directories: "kebab-case"

agents:
  custom: []
```

---

## Smart Defaults by Stack Type

| Stack Type | Default Test Cmd | Default Build Cmd | Default Lint Cmd |
|------------|------------------|-------------------|------------------|
| frontend (Next.js/React) | `npm test` | `npm run build` | `npm run lint` |
| backend (Express) | `npm test` | `npm run build` | `npm run lint` |
| backend (FastAPI) | `pytest` | `pip install -e .` | `ruff check .` |
| mobile (SwiftUI) | `swift test` | `swift build` | `swiftlint` |
| mobile (React Native) | `npm test` | `npm run build` | `npm run lint` |

---

## Validation Checklist

Before writing `project.yaml`, verify:

### Structure Validation

- [ ] `version` is exactly `"1.0"` (string, not number)
- [ ] `project.name` exists and is non-empty
- [ ] `project.name` matches pattern `^[a-zA-Z][a-zA-Z0-9-_ ]*$`
- [ ] `project.name` is <= 100 characters
- [ ] No unknown top-level keys (only: version, project, vision, stacks, design_system, data_governance, agents)

### Stack Validation

For single-app (stacks is object):
- [ ] Keys are only: frontend, backend, mobile, database
- [ ] Each stack has at least `framework` or `language`

For monorepo (stacks is array):
- [ ] Each item has required `name` (non-empty string)
- [ ] Each item has required `type` (one of: frontend, backend, mobile, database, shared)

### Naming Conventions Validation

If `data_governance.naming_conventions` is present:
- [ ] `enums` is one of: SCREAMING_SNAKE, snake_case, PascalCase, camelCase
- [ ] `fields` is one of: snake_case, camelCase, PascalCase
- [ ] `files` is one of: kebab-case, snake_case, camelCase, PascalCase
- [ ] `directories` is one of: kebab-case, snake_case, camelCase, PascalCase

### Custom Agents Validation

For each agent in `agents.custom`:
- [ ] `name` is non-empty string
- [ ] `label` matches pattern `^[a-z][a-z0-9-]*$`
- [ ] `prompt_file` is non-empty string
