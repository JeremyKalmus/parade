// IPC channel definitions and message types

import type { Issue, BeadId, CreateIssueParams, UpdateIssueParams, ListFilters, Dependency, Worktree } from './beads';
import type {
  Brief,
  BriefFilters,
  BriefWithRelations,
  InterviewQuestion,
  SMEReview,
  Spec,
  SpecStatus,
  WorkflowEvent,
  PipelineSummary,
} from './discovery';
import type {
  AgentTelemetryParsed,
  TelemetryAnnotation,
  CreateTelemetryParams,
  CreateAnnotationParams,
  TelemetryFilters,
  EpicTelemetrySummary,
  AgentPerformanceMetrics,
  TelemetryWithAnnotations,
  AgentLabel,
} from './telemetry';
import type { DocFile as DocFileType, DocsListResult, DocsReadResult } from '../../main/services/docs';
import type { SetupStatusResult, SetupStatus } from '../../main/services/setupStatus';

// Re-export docs types for renderer usage
export type { DocFileType as DocFile, DocsListResult, DocsReadResult };

// Re-export setup status types for renderer usage
export type { SetupStatusResult, SetupStatus };

// Re-export telemetry types for renderer usage
export type {
  AgentTelemetryParsed,
  TelemetryAnnotation,
  CreateTelemetryParams,
  CreateAnnotationParams,
  TelemetryFilters,
  EpicTelemetrySummary,
  AgentPerformanceMetrics,
  TelemetryWithAnnotations,
  AgentLabel,
};

// Channel names
export const IPC_CHANNELS = {
  // Beads operations
  BEADS_LIST: 'beads:list',
  BEADS_GET: 'beads:get',
  BEADS_CREATE: 'beads:create',
  BEADS_UPDATE: 'beads:update',
  BEADS_CLOSE: 'beads:close',
  BEADS_REOPEN: 'beads:reopen',
  BEADS_READY: 'beads:ready',
  BEADS_DEP_ADD: 'beads:dep:add',
  BEADS_DEP_REMOVE: 'beads:dep:remove',
  BEADS_DEP_TREE: 'beads:dep:tree',
  BEADS_GET_ALL_WITH_DEPS: 'beads:get-all-with-deps',
  BEADS_WORKTREE_LIST: 'beads:worktree-list',

  // Discovery operations
  DISCOVERY: {
    LIST_BRIEFS: 'discovery:list-briefs',
    GET_BRIEF: 'discovery:get-brief',
    GET_BRIEF_WITH_RELATIONS: 'discovery:get-brief-with-relations',
    GET_QUESTIONS: 'discovery:get-questions',
    GET_REVIEWS: 'discovery:get-reviews',
    LIST_SPECS: 'discovery:list-specs',
    GET_SPEC: 'discovery:get-spec',
    GET_SPEC_FOR_BRIEF: 'discovery:get-spec-for-brief',
    GET_EVENTS: 'discovery:get-events',
    GET_RECENT_EVENTS: 'discovery:get-recent-events',
    GET_PIPELINE_SUMMARY: 'discovery:get-pipeline-summary',
    SET_DATABASE_PATH: 'discovery:set-database-path',
    GET_DATABASE_PATH: 'discovery:get-database-path',
  },

  // Docs operations
  DOCS: {
    LIST_FILES: 'docs:list-files',
    READ_FILE: 'docs:read-file',
  },

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  // App
  APP_GET_VERSION: 'app:version',

  // Dialog
  DIALOG_SELECT_FOLDER: 'dialog:select-folder',

  // Project
  PROJECT_READ_CONFIG: 'project:readConfig',
  PROJECT_WRITE_CONFIG: 'project:writeConfig',
  PROJECT_CREATE_SCAFFOLD: 'project:createScaffold',
  PROJECT_CHECK_SETUP_STATUS: 'project:checkSetupStatus',

  // MCP operations
  MCP: {
    DETECT: 'mcp:detect',
    INSTALL: 'mcp:install',
    GENERATE_INSTRUCTIONS: 'mcp:generateInstructions',
  },

  // Telemetry operations
  TELEMETRY: {
    RECORD: 'telemetry:record',
    GET: 'telemetry:get',
    GET_FOR_TASK: 'telemetry:get-for-task',
    GET_FOR_EPIC: 'telemetry:get-for-epic',
    LIST: 'telemetry:list',
    EPIC_SUMMARY: 'telemetry:epic-summary',
    ADD_ANNOTATION: 'telemetry:add-annotation',
    GET_ANNOTATIONS: 'telemetry:get-annotations',
    AGENT_PERFORMANCE: 'telemetry:agent-performance',
    RECENT_FAILURES: 'telemetry:recent-failures',
    BUG_CAUSING: 'telemetry:bug-causing',
  },

  // Terminal operations
  TERMINAL: {
    DETECT: 'terminal:detect',
    LAUNCH: 'terminal:launch',
  },

  // Events (push from main → renderer)
  EVENTS: {
    FILE_CHANGED: 'file-changed',
    DISCOVERY_CHANGED: 'discovery-changed',
    BEADS_CHANGED: 'beads-changed',
  },
} as const;

// File change event type (pushed from main to renderer)
export type FileChangeEvent = {
  type: 'discovery' | 'beads';
  path: string;
  event: 'add' | 'change' | 'unlink';
};

// Request/Response types for IPC
export interface BeadsListRequest {
  filters?: ListFilters;
}

export interface BeadsListResponse {
  issues: Issue[];
  error?: string;
}

export interface BeadsGetRequest {
  id: BeadId;
}

export interface BeadsGetResponse {
  issue: Issue | null;
  error?: string;
}

export interface BeadsCreateRequest {
  params: CreateIssueParams;
}

export interface BeadsCreateResponse {
  id: BeadId | null;
  error?: string;
}

export interface BeadsUpdateRequest {
  id: BeadId;
  params: UpdateIssueParams;
}

export interface BeadsUpdateResponse {
  success: boolean;
  error?: string;
}

export interface BeadsCloseRequest {
  id: BeadId;
  reason?: string;
}

export interface BeadsDepAddRequest {
  from: BeadId;
  to: BeadId;
  type?: Dependency['type'];
}

export interface BeadsDepTreeRequest {
  id: BeadId;
  direction?: 'up' | 'down' | 'both';
}

export interface BeadsWorktreeListResponse {
  worktrees: Worktree[];
  error?: string;
}

// Dialog types
export interface DialogSelectFolderRequest {
  multiSelections?: boolean;
}

export interface DialogSelectFolderResponse {
  paths: string[] | null;
  error?: string;
}

// ==========================================================================
// Project Types
// ==========================================================================

/** Project configuration structure matching project.schema.json */
export interface ProjectConfig {
  version: string;
  project: {
    name: string;
    description?: string;
    repository?: string;
  };
  vision?: {
    purpose?: string;
    target_users?: string[];
    success_metrics?: string[];
  };
  stacks?: Record<string, unknown> | unknown[];
  design_system?: {
    enabled?: boolean;
    path?: string;
    docs?: string[];
  };
  data_governance?: {
    auth_provider?: string;
    rls_patterns?: {
      description?: string;
      examples?: string[];
    };
    naming_conventions?: {
      dates?: string;
      enums?: string;
      fields?: string;
      files?: string;
      directories?: string;
    };
  };
  agents?: {
    custom?: Array<{
      name: string;
      label: string;
      prompt_file: string;
    }>;
  };
  workflow?: {
    tdd_enabled?: boolean;
  };
}

/** Result of writing project config */
export interface WriteConfigResult {
  success: boolean;
  backupPath?: string;
  error?: string;
}

/** Result of creating scaffold */
export interface CreateScaffoldResult {
  success: boolean;
  createdPaths: string[];
  skippedPaths: string[];
  error?: string;
}

/** Options for scaffold creation */
export interface ScaffoldOptions {
  projectPath: string;
  projectName?: string;
  createDesign?: boolean;
  templateVars?: Record<string, string>;
}

// ==========================================================================
// MCP Types
// ==========================================================================

/** Detected MCP server */
export interface DetectedMCP {
  name: string;
  type: 'stdio' | 'sse';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  detected_from: string;
}

/** MCP detection result */
export interface MCPDetectResult {
  servers: DetectedMCP[];
  suggested: DetectedMCP[];
  error?: string;
}

/** MCP install options */
export interface MCPInstallOptions {
  server: DetectedMCP;
  target: 'claude_desktop' | 'cursor' | 'both';
  backup?: boolean;
}

/** MCP install result */
export interface MCPInstallResult {
  success: boolean;
  installedTo: string[];
  backupPaths?: string[];
  error?: string;
}

/** MCP instructions generation result */
export interface MCPInstructionsResult {
  instructions: string;
  serverCount: number;
  error?: string;
}

// ==========================================================================
// Terminal Types
// ==========================================================================

/** Result of a terminal launch operation */
export interface TerminalLaunchResult {
  success: boolean;
  terminalType: string;
  pid?: number;
  error?: string;
}

/** Options for launching a terminal */
export interface TerminalLaunchOptions {
  workingDir: string;
  command: string;
}

// Exposed API type for renderer
export interface ElectronAPI {
  beads: {
    list: (filters?: ListFilters) => Promise<BeadsListResponse>;
    get: (id: BeadId) => Promise<BeadsGetResponse>;
    create: (params: CreateIssueParams) => Promise<BeadsCreateResponse>;
    update: (id: BeadId, params: UpdateIssueParams) => Promise<BeadsUpdateResponse>;
    close: (id: BeadId, reason?: string) => Promise<BeadsUpdateResponse>;
    reopen: (id: BeadId) => Promise<BeadsUpdateResponse>;
    ready: () => Promise<BeadsListResponse>;
    depAdd: (from: BeadId, to: BeadId, type?: Dependency['type']) => Promise<BeadsUpdateResponse>;
    depRemove: (from: BeadId, to: BeadId) => Promise<BeadsUpdateResponse>;
    depTree: (id: BeadId, direction?: 'up' | 'down' | 'both') => Promise<{ tree: any; error?: string }>;
    getAllWithDependencies: () => Promise<{ issues: (Issue & { dependencies?: Issue[]; parent?: string })[]; error?: string }>;
    worktreeList: () => Promise<BeadsWorktreeListResponse>;
  };
  discovery: {
    listBriefs: (filters?: BriefFilters) => Promise<Brief[]>;
    getBrief: (id: string) => Promise<Brief | null>;
    getBriefWithRelations: (id: string) => Promise<BriefWithRelations | null>;
    getQuestions: (briefId: string) => Promise<InterviewQuestion[]>;
    getReviews: (briefId: string) => Promise<SMEReview[]>;
    listSpecs: (filters?: { status?: SpecStatus }) => Promise<Spec[]>;
    getSpec: (id: string) => Promise<Spec | null>;
    getSpecForBrief: (briefId: string) => Promise<Spec | null>;
    getEvents: (briefId: string) => Promise<WorkflowEvent[]>;
    getRecentEvents: (limit?: number) => Promise<WorkflowEvent[]>;
    getPipelineSummary: () => Promise<PipelineSummary>;
    setDatabasePath: (path: string) => Promise<void>;
    getDatabasePath: () => Promise<string | null>;
  };
  docs: {
    listFiles: () => Promise<DocsListResult>;
    readFile: (filePath: string) => Promise<DocsReadResult>;
  };
  settings: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
  };
  app: {
    getVersion: () => Promise<string>;
  };
  dialog: {
    selectFolder: (options?: DialogSelectFolderRequest) => Promise<DialogSelectFolderResponse>;
  };
  project: {
    readConfig: (projectPath: string) => Promise<{ config: ProjectConfig | null; error?: string }>;
    writeConfig: (projectPath: string, config: ProjectConfig) => Promise<WriteConfigResult>;
    checkSetupStatus: (projectPath: string) => Promise<SetupStatusResult>;
  };
  mcp: {
    detect: (projectPath: string) => Promise<MCPDetectResult>;
    install: (options: MCPInstallOptions) => Promise<MCPInstallResult>;
    generateInstructions: (servers: DetectedMCP[]) => Promise<MCPInstructionsResult>;
  };
  terminal: {
    detect: () => Promise<string>;
    launch: (opts: TerminalLaunchOptions) => Promise<TerminalLaunchResult>;
  };
  telemetry: {
    record: (params: CreateTelemetryParams) => Promise<string>;
    get: (id: string) => Promise<AgentTelemetryParsed | null>;
    getForTask: (taskId: string) => Promise<AgentTelemetryParsed[]>;
    getForEpic: (epicId: string) => Promise<AgentTelemetryParsed[]>;
    list: (filters?: TelemetryFilters) => Promise<AgentTelemetryParsed[]>;
    getEpicSummary: (epicId: string) => Promise<EpicTelemetrySummary>;
    addAnnotation: (params: CreateAnnotationParams) => Promise<string>;
    getAnnotations: (telemetryId: string) => Promise<TelemetryAnnotation[]>;
    getAgentPerformance: (agentType?: AgentLabel) => Promise<AgentPerformanceMetrics[]>;
    getRecentFailures: (limit?: number) => Promise<TelemetryWithAnnotations[]>;
    getBugCausing: () => Promise<TelemetryWithAnnotations[]>;
  };
  events: {
    onFileChange: (callback: (event: FileChangeEvent) => void) => () => void;
    onDiscoveryChange: (callback: () => void) => () => void;
    onBeadsChange: (callback: () => void) => () => void;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
