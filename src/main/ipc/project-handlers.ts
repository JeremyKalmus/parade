/**
 * Project Handlers - IPC handlers for project configuration management
 *
 * Provides handlers for:
 * - project:readConfig - Read and parse project.yaml
 * - project:writeConfig - Write config to project.yaml (with backup)
 * - project:createScaffold - Create directory structure
 */

import { ipcMain, app } from 'electron'
import path from 'path'
import fs from 'fs'
import yaml from 'js-yaml'
import Database from 'better-sqlite3'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Recursively copies a directory and its contents
 */
function copyDirectoryRecursive(source: string, destination: string): void {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true })
  }

  // Read source directory contents
  const entries = fs.readdirSync(source, { withFileTypes: true })

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name)
    const destPath = path.join(destination, entry.name)

    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      copyDirectoryRecursive(sourcePath, destPath)
    } else {
      // Copy file
      fs.copyFileSync(sourcePath, destPath)
    }
  }
}

/**
 * Gets the source path for skills directory
 * In dev: .claude/skills, in prod: resources/skills
 */
function getSkillsSourcePath(): string {
  const isDev = !app.isPackaged
  if (isDev) {
    return path.join(process.cwd(), '.claude', 'skills')
  } else {
    return path.join(process.resourcesPath, 'skills')
  }
}

/**
 * Gets the source path for templates directory
 * In dev: .claude/templates, in prod: resources/templates
 */
function getTemplatesSourcePath(): string {
  const isDev = !app.isPackaged
  if (isDev) {
    return path.join(process.cwd(), '.claude', 'templates')
  } else {
    return path.join(process.resourcesPath, 'templates')
  }
}

// ============================================================================
// Type Definitions
// ============================================================================

/** Project configuration structure matching project.schema.json */
export interface ProjectConfig {
  version: string
  project: {
    name: string
    description?: string
    repository?: string
  }
  vision?: {
    purpose?: string
    target_users?: string[]
    success_metrics?: string[]
  }
  stacks?: Record<string, unknown> | unknown[]
  design_system?: {
    enabled?: boolean
    path?: string
    docs?: string[]
  }
  data_governance?: {
    auth_provider?: string
    rls_patterns?: {
      description?: string
      examples?: string[]
    }
    naming_conventions?: {
      dates?: string
      enums?: string
      fields?: string
      files?: string
      directories?: string
    }
  }
  agents?: {
    custom?: Array<{
      name: string
      label: string
      prompt_file: string
    }>
  }
  workflow?: {
    tdd_enabled?: boolean
  }
}

/** Result of reading project config */
export interface ReadConfigResult {
  config: ProjectConfig | null
  error?: string
}

/** Result of writing project config */
export interface WriteConfigResult {
  success: boolean
  backupPath?: string
  error?: string
}

/** Result of creating scaffold */
export interface CreateScaffoldResult {
  success: boolean
  createdPaths: string[]
  skippedPaths: string[]
  error?: string
}

/** Options for scaffold creation */
export interface ScaffoldOptions {
  projectPath: string
  projectName?: string
  createDesign?: boolean
  templateVars?: Record<string, string>
}

// ============================================================================
// Validation Constants
// ============================================================================

const VALID_VERSIONS = ['1.0']
const PROJECT_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9-_ ]*$/
const PROJECT_NAME_MAX_LENGTH = 100
const VALID_ENUM_CONVENTIONS = ['SCREAMING_SNAKE', 'snake_case', 'PascalCase', 'camelCase']
const VALID_FIELD_CONVENTIONS = ['snake_case', 'camelCase', 'PascalCase']
const VALID_FILE_CONVENTIONS = ['kebab-case', 'snake_case', 'camelCase', 'PascalCase']

// ============================================================================
// Validation
// ============================================================================

interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validates a project configuration object against the schema requirements
 */
export function validateProjectConfig(config: unknown): ValidationResult {
  const errors: string[] = []

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Config must be an object'] }
  }

  const cfg = config as Record<string, unknown>

  // Check required version field
  if (!('version' in cfg) || typeof cfg.version !== 'string') {
    errors.push('Missing or invalid version field')
  } else if (!VALID_VERSIONS.includes(cfg.version)) {
    errors.push(`Invalid version: ${cfg.version}. Must be one of: ${VALID_VERSIONS.join(', ')}`)
  }

  // Check required project field
  if (!('project' in cfg) || typeof cfg.project !== 'object' || cfg.project === null) {
    errors.push('Missing or invalid project field')
  } else {
    const project = cfg.project as Record<string, unknown>

    // Check required project.name
    if (!('name' in project) || typeof project.name !== 'string') {
      errors.push('Missing or invalid project.name field')
    } else {
      const name = project.name

      // Validate name pattern
      if (!PROJECT_NAME_PATTERN.test(name)) {
        errors.push(`Invalid project name: "${name}". Must start with a letter and contain only letters, numbers, hyphens, underscores, and spaces`)
      }

      // Validate name length
      if (name.length > PROJECT_NAME_MAX_LENGTH) {
        errors.push(`Project name exceeds maximum length of ${PROJECT_NAME_MAX_LENGTH} characters`)
      }
    }
  }

  // Validate data_governance.naming_conventions if present
  if ('data_governance' in cfg && cfg.data_governance && typeof cfg.data_governance === 'object') {
    const dataGov = cfg.data_governance as Record<string, unknown>

    if ('naming_conventions' in dataGov && dataGov.naming_conventions && typeof dataGov.naming_conventions === 'object') {
      const namingConv = dataGov.naming_conventions as Record<string, unknown>

      if ('enums' in namingConv && typeof namingConv.enums === 'string') {
        if (!VALID_ENUM_CONVENTIONS.includes(namingConv.enums)) {
          errors.push(`Invalid enum naming convention: "${namingConv.enums}". Must be one of: ${VALID_ENUM_CONVENTIONS.join(', ')}`)
        }
      }

      if ('fields' in namingConv && typeof namingConv.fields === 'string') {
        if (!VALID_FIELD_CONVENTIONS.includes(namingConv.fields)) {
          errors.push(`Invalid fields naming convention: "${namingConv.fields}". Must be one of: ${VALID_FIELD_CONVENTIONS.join(', ')}`)
        }
      }

      if ('files' in namingConv && typeof namingConv.files === 'string') {
        if (!VALID_FILE_CONVENTIONS.includes(namingConv.files)) {
          errors.push(`Invalid files naming convention: "${namingConv.files}". Must be one of: ${VALID_FILE_CONVENTIONS.join(', ')}`)
        }
      }

      if ('directories' in namingConv && typeof namingConv.directories === 'string') {
        if (!VALID_FILE_CONVENTIONS.includes(namingConv.directories)) {
          errors.push(`Invalid directories naming convention: "${namingConv.directories}". Must be one of: ${VALID_FILE_CONVENTIONS.join(', ')}`)
        }
      }
    }
  }

  // Validate agents.custom if present
  if ('agents' in cfg && cfg.agents && typeof cfg.agents === 'object') {
    const agents = cfg.agents as Record<string, unknown>

    if ('custom' in agents && Array.isArray(agents.custom)) {
      for (let i = 0; i < agents.custom.length; i++) {
        const agent = agents.custom[i]
        if (typeof agent !== 'object' || agent === null) {
          errors.push(`agents.custom[${i}] must be an object`)
          continue
        }

        const agentObj = agent as Record<string, unknown>
        const requiredFields = ['name', 'label', 'prompt_file']

        for (const field of requiredFields) {
          if (!(field in agentObj) || typeof agentObj[field] !== 'string' || (agentObj[field] as string).length === 0) {
            errors.push(`agents.custom[${i}] missing required field: ${field}`)
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// ============================================================================
// Handler Implementations
// ============================================================================

/**
 * Reads and parses project.yaml from the given project path
 */
export async function readProjectConfig(projectPath: string): Promise<ReadConfigResult> {
  const yamlPath = path.join(projectPath, 'project.yaml')

  // Check if path exists
  if (!fs.existsSync(projectPath)) {
    return { config: null }
  }

  // Check if project.yaml exists
  if (!fs.existsSync(yamlPath)) {
    return { config: null }
  }

  try {
    const content = fs.readFileSync(yamlPath, 'utf-8')

    // Handle empty file
    if (!content.trim()) {
      return {
        config: null,
        error: 'Empty YAML file',
      }
    }

    // Parse YAML
    const parsed = yaml.load(content)

    // Handle files with only comments (yaml.load returns undefined)
    if (parsed === undefined || parsed === null) {
      return {
        config: null,
        error: 'Empty YAML content (only comments)',
      }
    }

    // Validate the parsed config
    const validation = validateProjectConfig(parsed)
    if (!validation.valid) {
      return {
        config: null,
        error: validation.errors.join('; '),
      }
    }

    return { config: parsed as ProjectConfig }
  } catch (error) {
    if (error instanceof yaml.YAMLException) {
      return {
        config: null,
        error: `YAML parse error: ${error.message}`,
      }
    }

    return {
      config: null,
      error: error instanceof Error ? error.message : 'Unknown error reading config',
    }
  }
}

/**
 * Writes project configuration to project.yaml, creating a backup if file exists
 */
export async function writeProjectConfig(
  projectPath: string,
  config: ProjectConfig
): Promise<WriteConfigResult> {
  // Validate config before writing
  const validation = validateProjectConfig(config)
  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors.join('; '),
    }
  }

  // Check if parent directory exists
  if (!fs.existsSync(projectPath)) {
    return {
      success: false,
      error: `Directory does not exist: ${projectPath}`,
    }
  }

  const yamlPath = path.join(projectPath, 'project.yaml')
  let backupPath: string | undefined

  try {
    // Create backup if file exists
    if (fs.existsSync(yamlPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      backupPath = path.join(projectPath, `project.yaml.backup-${timestamp}`)
      fs.copyFileSync(yamlPath, backupPath)
    }

    // Serialize config to YAML
    const yamlContent = yaml.dump(config, {
      indent: 2,
      lineWidth: -1, // Don't wrap lines
      quotingType: '"',
      forceQuotes: false,
    })

    // Write to file
    fs.writeFileSync(yamlPath, yamlContent, 'utf-8')

    return {
      success: true,
      backupPath,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error writing config',
    }
  }
}

/**
 * Creates project scaffold directories and template files
 */
export async function createProjectScaffold(
  options: ScaffoldOptions
): Promise<CreateScaffoldResult> {
  const { projectPath, projectName, createDesign = true, templateVars = {} } = options
  const createdPaths: string[] = []
  const skippedPaths: string[] = []

  // Check if project path exists
  if (!fs.existsSync(projectPath)) {
    return {
      success: false,
      createdPaths: [],
      skippedPaths: [],
      error: `Project path does not exist: ${projectPath}`,
    }
  }

  // Track which top-level directories were skipped
  const skippedTopLevel = new Set<string>()

  // Define top-level directories first
  const topLevelDirs = ['.claude', '.beads']
  if (createDesign) {
    topLevelDirs.push('.design')
  }

  // Define nested directories under .claude
  const nestedDirs = ['.claude/agents', '.claude/skills']

  try {
    // Create top-level directories first
    for (const dir of topLevelDirs) {
      const fullPath = path.join(projectPath, dir)

      if (fs.existsSync(fullPath)) {
        skippedPaths.push(fullPath)
        skippedTopLevel.add(dir)
      } else {
        fs.mkdirSync(fullPath, { recursive: true })
        createdPaths.push(fullPath)
      }
    }

    // Create nested directories only if parent was created (not skipped)
    for (const dir of nestedDirs) {
      const parentDir = dir.split('/')[0] // Get the top-level parent (e.g., '.claude')
      if (skippedTopLevel.has(parentDir)) {
        // Skip nested dirs if parent was skipped
        continue
      }

      const fullPath = path.join(projectPath, dir)
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true })
        createdPaths.push(fullPath)
      }
    }

    // Copy skills and templates from Parade's bundled resources
    // This gives new projects the /init-project skill and agent templates
    if (!skippedTopLevel.has('.claude')) {
      // Copy skills directory
      const sourceSkillsPath = getSkillsSourcePath()
      const destSkillsPath = path.join(projectPath, '.claude', 'skills')
      if (fs.existsSync(sourceSkillsPath)) {
        copyDirectoryRecursive(sourceSkillsPath, destSkillsPath)
        createdPaths.push(destSkillsPath + ' (skills copied)')
      }

      // Copy templates directory
      const sourceTemplatesPath = getTemplatesSourcePath()
      const destTemplatesPath = path.join(projectPath, '.claude', 'templates')
      if (fs.existsSync(sourceTemplatesPath)) {
        copyDirectoryRecursive(sourceTemplatesPath, destTemplatesPath)
        createdPaths.push(destTemplatesPath + ' (templates copied)')
      }
    }

    // Create CLAUDE.md template if .claude was created (not skipped)
    const claudeDir = path.join(projectPath, '.claude')

    if (!skippedTopLevel.has('.claude')) {
      const claudeMdPath = path.join(claudeDir, 'CLAUDE.md')

      if (!fs.existsSync(claudeMdPath)) {
        const effectiveProjectName = templateVars.PROJECT_NAME || projectName || 'Project'
        const description = templateVars.DESCRIPTION || ''

        const claudeMdContent = `# ${effectiveProjectName}

${description}

## Project Configuration

This project uses the Parade workflow system.

## Stack

- **Framework**: (configure in project.yaml)
- **Language**: (configure in project.yaml)

## Agents

Custom agents can be defined in \`project.yaml\` under the \`agents.custom\` section.

## Workflow

Use the /init-project skill to configure this project.
`

        fs.writeFileSync(claudeMdPath, claudeMdContent, 'utf-8')
        createdPaths.push(claudeMdPath)
      }
    }

    // Initialize discovery.db with required tables
    const discoveryDbPath = path.join(projectPath, 'discovery.db')
    if (!fs.existsSync(discoveryDbPath)) {
      const db = new Database(discoveryDbPath)

      // Create all required tables
      db.exec(`
        -- Briefs: Initial feature ideas
        CREATE TABLE IF NOT EXISTS briefs (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          problem_statement TEXT,
          initial_thoughts TEXT,
          priority INTEGER DEFAULT 2,
          complexity_level TEXT DEFAULT 'standard',
          status TEXT DEFAULT 'draft',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT,
          exported_epic_id TEXT
        );

        -- Interview Questions: Generated by Claude during discovery
        CREATE TABLE IF NOT EXISTS interview_questions (
          id TEXT PRIMARY KEY,
          brief_id TEXT REFERENCES briefs(id),
          question TEXT NOT NULL,
          category TEXT,
          answer TEXT,
          answered_at TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );

        -- SME Reviews: Findings from specialized agents
        CREATE TABLE IF NOT EXISTS sme_reviews (
          id TEXT PRIMARY KEY,
          brief_id TEXT REFERENCES briefs(id),
          agent_type TEXT NOT NULL,
          findings TEXT,
          recommendations TEXT,
          concerns TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );

        -- Specs: Synthesized specifications
        CREATE TABLE IF NOT EXISTS specs (
          id TEXT PRIMARY KEY,
          brief_id TEXT REFERENCES briefs(id),
          title TEXT NOT NULL,
          description TEXT,
          acceptance_criteria TEXT,
          design_notes TEXT,
          task_breakdown TEXT,
          status TEXT DEFAULT 'draft',
          approved_at TEXT,
          exported_epic_id TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );

        -- Workflow Events: Audit trail
        CREATE TABLE IF NOT EXISTS workflow_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          brief_id TEXT,
          event_type TEXT,
          details TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );

        -- Agent Telemetry: Execution metrics for retrospectives
        CREATE TABLE IF NOT EXISTS agent_telemetry (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL,
          epic_id TEXT,
          agent_type TEXT NOT NULL,
          status TEXT NOT NULL,
          error_type TEXT,
          error_message TEXT,
          context_tokens INTEGER,
          execution_time_ms INTEGER,
          debug_loops INTEGER DEFAULT 0,
          files_modified TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );

        -- Telemetry Annotations: Manual notes on telemetry entries
        CREATE TABLE IF NOT EXISTS telemetry_annotations (
          id TEXT PRIMARY KEY,
          telemetry_id TEXT REFERENCES agent_telemetry(id),
          annotation_type TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        );

        -- Indexes for common queries
        CREATE INDEX IF NOT EXISTS idx_briefs_status ON briefs(status);
        CREATE INDEX IF NOT EXISTS idx_questions_brief ON interview_questions(brief_id);
        CREATE INDEX IF NOT EXISTS idx_reviews_brief ON sme_reviews(brief_id);
        CREATE INDEX IF NOT EXISTS idx_specs_brief ON specs(brief_id);
        CREATE INDEX IF NOT EXISTS idx_events_brief ON workflow_events(brief_id);
        CREATE INDEX IF NOT EXISTS idx_events_type ON workflow_events(event_type);
        CREATE INDEX IF NOT EXISTS idx_telemetry_task ON agent_telemetry(task_id);
        CREATE INDEX IF NOT EXISTS idx_telemetry_epic ON agent_telemetry(epic_id);
        CREATE INDEX IF NOT EXISTS idx_annotations_telemetry ON telemetry_annotations(telemetry_id);
      `)

      db.close()
      createdPaths.push(discoveryDbPath)
    }

    return {
      success: true,
      createdPaths,
      skippedPaths,
    }
  } catch (error) {
    return {
      success: false,
      createdPaths,
      skippedPaths,
      error: error instanceof Error ? error.message : 'Unknown error creating scaffold',
    }
  }
}

// ============================================================================
// IPC Handler Registration
// ============================================================================

/**
 * Registers all project-related IPC handlers
 */
export function registerProjectHandlers(): void {
  ipcMain.handle('project:readConfig', async (_event, projectPath: string) => {
    return readProjectConfig(projectPath)
  })

  ipcMain.handle('project:writeConfig', async (_event, projectPath: string, config: ProjectConfig) => {
    return writeProjectConfig(projectPath, config)
  })

  // NOTE: Scaffolding is now handled by npx parade-init package
  // ipcMain.handle('project:createScaffold', async (_event, options: ScaffoldOptions) => {
  //   return createProjectScaffold(options)
  // })
}
