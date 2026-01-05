# MCP Usage Guide for Agents

## Overview

Model Context Protocol (MCP) servers provide specialized capabilities that extend Claude's ability to interact with external systems. Agents should **always prefer MCP operations over manual approaches** when an appropriate MCP is available.

### Why Prefer MCPs?

1. **Accuracy** - MCPs provide direct access to live data (schema, files, issues) rather than relying on potentially stale file reads
2. **Safety** - MCPs handle authentication, permissions, and safe execution
3. **Efficiency** - Single MCP call often replaces multiple manual operations
4. **Consistency** - Standardized interface across different data sources

---

## Available MCPs and When to Use Them

### Filesystem MCP

**Priority:** Recommended
**Use when:**
- Reading or writing project files
- Searching codebase for patterns
- Managing configuration files
- Any file operation in restricted or external directories

**Instead of:** Manual file operations, shell commands for file manipulation

**Example usage:**
```
"Use filesystem MCP to read the package.json configuration"
"Use filesystem MCP to search for all TypeScript files containing 'export class'"
```

**Applicable frameworks:** React, Next.js, Vue, Angular, Svelte, Electron, Swift, Kotlin, Flutter, Express, Fastify

---

### Supabase MCP

**Priority:** Recommended
**Use when:**
- Inspecting database schema and table structures
- Running queries against Supabase database
- Checking RLS (Row Level Security) policies
- Managing Supabase auth configuration
- Verifying database migrations

**Instead of:** Reading SQL migration files, guessing schema structure, manual psql commands

**Example usage:**
```
"Check Supabase MCP for current schema before designing migrations"
"Use Supabase MCP to verify RLS policies on the users table"
"Query Supabase MCP to understand existing table relationships"
```

**Configuration required:**
```json
{
  "SUPABASE_URL": "your-project-url",
  "SUPABASE_KEY": "your-anon-key"
}
```

---

### GitHub MCP

**Priority:** Optional
**Use when:**
- Checking repository structure and files
- Reading open issues and their details
- Reviewing pull request information
- Managing labels and milestones
- Understanding project history

**Instead of:** Manual git commands for information gathering, web browser for GitHub

**Example usage:**
```
"Check GitHub MCP for open issues related to this feature"
"Use GitHub MCP to read the PR comments and requested changes"
"Query GitHub MCP for recent commits on the main branch"
```

**Configuration required:**
```json
{
  "GITHUB_TOKEN": "your-github-token"
}
```

---

### PostgreSQL MCP

**Priority:** Recommended
**Use when:**
- Direct database operations on PostgreSQL
- Schema inspection and table analysis
- Running EXPLAIN on slow queries
- Complex query execution
- Database performance analysis

**Instead of:** Supabase MCP when using raw PostgreSQL, manual psql sessions

**Example usage:**
```
"Use PostgreSQL MCP to run EXPLAIN ANALYZE on the slow query"
"Query PostgreSQL MCP to inspect foreign key constraints"
"Use PostgreSQL MCP to check index usage statistics"
```

**Configuration required:**
```json
{
  "DATABASE_URL": "postgresql://user:pass@localhost:5432/db"
}
```

---

### SQLite MCP

**Priority:** Recommended
**Use when:**
- Local database operations (discovery.db, beads database)
- Querying local development databases
- Inspecting SQLite schema
- Managing local state storage

**Instead of:** Raw sqlite3 shell commands, manual file reads of .db files

**Example usage:**
```
"Use SQLite MCP to query discovery.db for brief history"
"Query SQLite MCP for all open tasks in the beads database"
"Use SQLite MCP to inspect the schema of discovery.db"
```

**Configuration required:**
```json
{
  "DATABASE_PATH": "./database.sqlite"
}
```

---

### Puppeteer MCP

**Priority:** Optional
**Use when:**
- UI testing and visual verification
- Capturing screenshots of current UI state
- Browser automation tasks
- Web scraping for research
- End-to-end testing scenarios

**Instead of:** Describing UI without visual verification, manual browser testing

**Example usage:**
```
"Use Puppeteer MCP to capture a screenshot of the login page"
"Run Puppeteer MCP to verify the button click navigates correctly"
"Use Puppeteer MCP to test the responsive layout at different widths"
```

---

### Memory MCP

**Priority:** Optional
**Use when:**
- Rapid prototyping with in-memory data
- Session state management
- Document-like data operations
- Temporary data storage during complex workflows

**Instead of:** Creating temporary files, using local variables across sessions

**Example usage:**
```
"Use Memory MCP to store intermediate analysis results"
"Cache the parsed configuration in Memory MCP for reuse"
```

---

### Brave Search MCP

**Priority:** Optional
**Use when:**
- Research tasks requiring current information
- Documentation lookup for external libraries
- Finding examples and best practices
- Verifying latest API changes

**Instead of:** Relying on potentially outdated knowledge, manual web searches

**Example usage:**
```
"Use Brave Search MCP to find the latest React 19 migration guide"
"Search for current best practices on Supabase RLS policies"
```

**Configuration required:**
```json
{
  "BRAVE_API_KEY": "your-brave-api-key"
}
```

---

## Agent Decision Flow

Before performing any manual file, database, or external service operation, agents should follow this decision process:

```
┌─────────────────────────────────────────┐
│ Task requires file/db/external access   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Is relevant MCP available?              │
└─────────────────┬───────────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
┌─────────────┐     ┌─────────────────────┐
│ YES         │     │ NO                  │
│ Use MCP     │     │ Suggest /init-project│
│ operation   │     │ to configure MCPs   │
└─────────────┘     │ Then fall back to   │
                    │ manual approach     │
                    └─────────────────────┘
```

### Decision Examples

| Task | Check For | Preferred Approach |
|------|-----------|-------------------|
| Read schema | Supabase/PostgreSQL MCP | Query MCP for live schema |
| Edit source file | Filesystem MCP | Use MCP file operations |
| Check open issues | GitHub MCP | Query MCP for issue list |
| Run database query | SQLite/PostgreSQL MCP | Execute via MCP |
| Capture UI screenshot | Puppeteer MCP | Automate with MCP |

---

## MCP Availability Check

Agents should check for MCP availability in the current environment:

1. **Check configured MCPs** - Look for MCP configuration in project settings
2. **Verify connectivity** - Ensure MCP server is running and accessible
3. **Check required credentials** - Verify API keys and tokens are configured

If MCPs are not configured, agents should:
1. Note the missing MCP in their response
2. Suggest running `/init-project` to configure MCPs
3. Proceed with manual fallback approach
4. Document the manual approach used for future reference

---

## Framework to MCP Mapping

The following table shows which MCPs are recommended for each framework:

| Framework | Primary MCP | Additional MCPs |
|-----------|-------------|-----------------|
| React | filesystem | github (optional) |
| Next.js | filesystem | github (optional) |
| Vue | filesystem | github (optional) |
| Angular | filesystem | github (optional) |
| Svelte | filesystem | github (optional) |
| Electron | filesystem | github (optional) |
| Swift | filesystem | github (optional) |
| Kotlin | filesystem | github (optional) |
| Flutter | filesystem | github (optional) |
| Express | filesystem | github (optional) |
| Fastify | filesystem | github (optional) |
| Supabase | supabase | github (optional) |
| PostgreSQL | postgres | github (optional) |
| SQLite | sqlite | github (optional) |
| MongoDB | memory | github (optional) |
| Prisma | postgres, sqlite | github (optional) |

---

## Best Practices

### 1. Always Prefer MCP Over Manual Operations

```
# Good
"Querying Supabase MCP for current users table schema..."

# Avoid
"Reading the migration files to understand the schema..."
```

### 2. Include MCP Suggestions in Recommendations

When creating tasks or specifications, note which MCPs would be helpful:

```markdown
## Acceptance Criteria
- [ ] Database schema updated (verify with Supabase MCP)
- [ ] UI changes match design (verify with Puppeteer MCP screenshot)
```

### 3. Document MCP Requirements in Task Context

When spawning sub-agents, specify which MCPs should be used:

```
Task: bd-abc.1 - Update user schema

MCP Requirements:
- Supabase MCP: Inspect current schema before changes
- PostgreSQL MCP: Run migration verification queries

Files to modify:
- supabase/migrations/...
```

### 4. Fall Back Gracefully

When MCP is unavailable, document the fallback approach:

```
"Supabase MCP not configured. Falling back to reading migration files.
Note: Live schema verification recommended - consider running /init-project"
```

### 5. Combine MCPs for Complex Tasks

Use multiple MCPs together for comprehensive workflows:

```
1. GitHub MCP - Check related issues
2. Supabase MCP - Inspect current schema
3. Filesystem MCP - Read existing code patterns
4. Puppeteer MCP - Verify UI after changes
```

---

## Priority Levels

MCPs are categorized by priority to help agents decide which to use:

| Priority | Meaning | Agent Action |
|----------|---------|--------------|
| **Required** | Essential for task type | Must use if available |
| **Recommended** | Significantly improves workflow | Should use when available |
| **Optional** | Nice to have enhancement | Use when beneficial |

---

## Configuration Reference

For agents that need to suggest MCP configuration, here are the standard setup patterns:

### Filesystem MCP
```json
{
  "command": "npx",
  "args": ["-y", "@anthropic/mcp-server-filesystem"],
  "env": {
    "ALLOWED_PATHS": "/path/to/project"
  }
}
```

### Supabase MCP
```json
{
  "command": "npx",
  "args": ["-y", "@supabase/mcp-server-supabase"],
  "env": {
    "SUPABASE_URL": "your-project-url",
    "SUPABASE_KEY": "your-anon-key"
  }
}
```

### GitHub MCP
```json
{
  "command": "npx",
  "args": ["-y", "@anthropic/mcp-server-github"],
  "env": {
    "GITHUB_TOKEN": "your-github-token"
  }
}
```

### PostgreSQL MCP
```json
{
  "command": "npx",
  "args": ["-y", "@anthropic/mcp-server-postgres"],
  "env": {
    "DATABASE_URL": "postgresql://user:pass@localhost:5432/db"
  }
}
```

### SQLite MCP
```json
{
  "command": "npx",
  "args": ["-y", "@anthropic/mcp-server-sqlite"],
  "env": {
    "DATABASE_PATH": "./database.sqlite"
  }
}
```

### Puppeteer MCP
```json
{
  "command": "npx",
  "args": ["-y", "@anthropic/mcp-server-puppeteer"]
}
```

---

## Summary

MCPs are the preferred method for agents to interact with external systems. They provide:

- **Live data access** instead of stale file reads
- **Safe, authenticated operations**
- **Standardized interfaces**
- **Better error handling**

When in doubt, check for an available MCP before falling back to manual approaches.
