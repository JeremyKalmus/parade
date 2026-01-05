// Preload script - exposes safe APIs to renderer

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types/ipc';
import type {
  ElectronAPI,
  FileChangeEvent,
  ProjectConfig,
  DetectedMCP,
  MCPInstallOptions,
  TerminalLaunchOptions,
} from '../shared/types/ipc';
import type {
  BeadId,
  CreateIssueParams,
  UpdateIssueParams,
  ListFilters,
  Dependency,
} from '../shared/types/beads';
import type { BriefFilters, SpecStatus } from '../shared/types/discovery';
import type { CreateTelemetryParams, CreateAnnotationParams, TelemetryFilters, AgentLabel } from '../shared/types/telemetry';

const electronAPI: ElectronAPI = {
  beads: {
    list: (filters?: ListFilters) => ipcRenderer.invoke(IPC_CHANNELS.BEADS_LIST, filters),
    get: (id: BeadId) => ipcRenderer.invoke(IPC_CHANNELS.BEADS_GET, id),
    create: (params: CreateIssueParams) => ipcRenderer.invoke(IPC_CHANNELS.BEADS_CREATE, params),
    update: (id: BeadId, params: UpdateIssueParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.BEADS_UPDATE, id, params),
    close: (id: BeadId, reason?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.BEADS_CLOSE, id, reason),
    reopen: (id: BeadId) => ipcRenderer.invoke(IPC_CHANNELS.BEADS_REOPEN, id),
    ready: () => ipcRenderer.invoke(IPC_CHANNELS.BEADS_READY),
    depAdd: (from: BeadId, to: BeadId, type?: Dependency['type']) =>
      ipcRenderer.invoke(IPC_CHANNELS.BEADS_DEP_ADD, from, to, type),
    depRemove: (from: BeadId, to: BeadId) =>
      ipcRenderer.invoke(IPC_CHANNELS.BEADS_DEP_REMOVE, from, to),
    depTree: (id: BeadId, direction?: 'up' | 'down' | 'both') =>
      ipcRenderer.invoke(IPC_CHANNELS.BEADS_DEP_TREE, id, direction),
    getAllWithDependencies: () =>
      ipcRenderer.invoke(IPC_CHANNELS.BEADS_GET_ALL_WITH_DEPS),
    worktreeList: () =>
      ipcRenderer.invoke(IPC_CHANNELS.BEADS_WORKTREE_LIST),
  },
  discovery: {
    listBriefs: (filters?: BriefFilters) =>
      ipcRenderer.invoke(IPC_CHANNELS.DISCOVERY.LIST_BRIEFS, filters),
    getBrief: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DISCOVERY.GET_BRIEF, id),
    getBriefWithRelations: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DISCOVERY.GET_BRIEF_WITH_RELATIONS, id),
    getQuestions: (briefId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DISCOVERY.GET_QUESTIONS, briefId),
    getReviews: (briefId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DISCOVERY.GET_REVIEWS, briefId),
    listSpecs: (filters?: { status?: SpecStatus }) =>
      ipcRenderer.invoke(IPC_CHANNELS.DISCOVERY.LIST_SPECS, filters),
    getSpec: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DISCOVERY.GET_SPEC, id),
    getSpecForBrief: (briefId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DISCOVERY.GET_SPEC_FOR_BRIEF, briefId),
    getEvents: (briefId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DISCOVERY.GET_EVENTS, briefId),
    getRecentEvents: (limit?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.DISCOVERY.GET_RECENT_EVENTS, limit),
    getPipelineSummary: () =>
      ipcRenderer.invoke(IPC_CHANNELS.DISCOVERY.GET_PIPELINE_SUMMARY),
    setDatabasePath: (path: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DISCOVERY.SET_DATABASE_PATH, path),
    getDatabasePath: () =>
      ipcRenderer.invoke(IPC_CHANNELS.DISCOVERY.GET_DATABASE_PATH),
  },
  docs: {
    listFiles: () =>
      ipcRenderer.invoke(IPC_CHANNELS.DOCS.LIST_FILES),
    readFile: (filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DOCS.READ_FILE, filePath),
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, key),
    set: (key: string, value: any) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value),
  },
  app: {
    getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
  },
  dialog: {
    selectFolder: (options?: { multiSelections?: boolean }) =>
      ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SELECT_FOLDER, options),
  },
  project: {
    readConfig: (projectPath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.PROJECT_READ_CONFIG, projectPath),
    writeConfig: (projectPath: string, config: ProjectConfig) =>
      ipcRenderer.invoke(IPC_CHANNELS.PROJECT_WRITE_CONFIG, projectPath, config),
    checkSetupStatus: (projectPath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.PROJECT_CHECK_SETUP_STATUS, projectPath),
  },
  mcp: {
    detect: (projectPath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP.DETECT, projectPath),
    install: (options: MCPInstallOptions) =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP.INSTALL, options),
    generateInstructions: (servers: DetectedMCP[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP.GENERATE_INSTRUCTIONS, servers),
  },
  terminal: {
    detect: () =>
      ipcRenderer.invoke(IPC_CHANNELS.TERMINAL.DETECT),
    launch: (opts: TerminalLaunchOptions) =>
      ipcRenderer.invoke(IPC_CHANNELS.TERMINAL.LAUNCH, opts),
  },
  telemetry: {
    record: (params: CreateTelemetryParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.TELEMETRY.RECORD, params),
    get: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TELEMETRY.GET, id),
    getForTask: (taskId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TELEMETRY.GET_FOR_TASK, taskId),
    getForEpic: (epicId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TELEMETRY.GET_FOR_EPIC, epicId),
    list: (filters?: TelemetryFilters) =>
      ipcRenderer.invoke(IPC_CHANNELS.TELEMETRY.LIST, filters),
    getEpicSummary: (epicId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TELEMETRY.EPIC_SUMMARY, epicId),
    addAnnotation: (params: CreateAnnotationParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.TELEMETRY.ADD_ANNOTATION, params),
    getAnnotations: (telemetryId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TELEMETRY.GET_ANNOTATIONS, telemetryId),
    getAgentPerformance: (agentType?: AgentLabel) =>
      ipcRenderer.invoke(IPC_CHANNELS.TELEMETRY.AGENT_PERFORMANCE, agentType),
    getRecentFailures: (limit?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TELEMETRY.RECENT_FAILURES, limit),
    getBugCausing: () =>
      ipcRenderer.invoke(IPC_CHANNELS.TELEMETRY.BUG_CAUSING),
  },
  events: {
    onFileChange: (callback: (event: FileChangeEvent) => void) => {
      const handler = (_: Electron.IpcRendererEvent, event: FileChangeEvent) => callback(event);
      ipcRenderer.on(IPC_CHANNELS.EVENTS.FILE_CHANGED, handler);
      // Return unsubscribe function
      return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENTS.FILE_CHANGED, handler);
    },
    onDiscoveryChange: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on(IPC_CHANNELS.EVENTS.DISCOVERY_CHANGED, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENTS.DISCOVERY_CHANGED, handler);
    },
    onBeadsChange: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on(IPC_CHANNELS.EVENTS.BEADS_CHANGED, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENTS.BEADS_CHANGED, handler);
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronAPI);
