// IPC handlers - bridge between renderer and main process

import { ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { IPC_CHANNELS } from '../../shared/types/ipc';
import beadsService from '../services/beads';
import settingsService from '../services/settings';
import { discoveryService } from '../services/discovery';
import { fileWatcherService } from '../services/fileWatcher';
import { docsService } from '../services/docs';
import { telemetryService } from '../services/telemetry';
import { terminalLauncherService } from '../services/terminalLauncher';
import { setupStatusService } from '../services/setupStatus';
import type {
  BeadId,
  CreateIssueParams,
  UpdateIssueParams,
  ListFilters,
  Dependency,
} from '../../shared/types/beads';
import type { BriefFilters, SpecStatus } from '../../shared/types/discovery';
import type {
  CreateTelemetryParams,
  CreateAnnotationParams,
  TelemetryFilters,
  AgentLabel,
} from '../../shared/types/telemetry';

export function registerIpcHandlers() {
  // Note: Services are initialized in index.ts via initializeFileWatchers()

  // Beads: List issues
  ipcMain.handle(IPC_CHANNELS.BEADS_LIST, async (_, filters?: ListFilters) => {
    return beadsService.list(filters);
  });

  // Beads: Get single issue
  ipcMain.handle(IPC_CHANNELS.BEADS_GET, async (_, id: BeadId) => {
    return beadsService.get(id);
  });

  // Beads: Create issue
  ipcMain.handle(IPC_CHANNELS.BEADS_CREATE, async (_, params: CreateIssueParams) => {
    return beadsService.create(params);
  });

  // Beads: Update issue
  ipcMain.handle(
    IPC_CHANNELS.BEADS_UPDATE,
    async (_, id: BeadId, params: UpdateIssueParams) => {
      return beadsService.update(id, params);
    }
  );

  // Beads: Close issue
  ipcMain.handle(IPC_CHANNELS.BEADS_CLOSE, async (_, id: BeadId, reason?: string) => {
    return beadsService.close(id, reason);
  });

  // Beads: Reopen issue
  ipcMain.handle(IPC_CHANNELS.BEADS_REOPEN, async (_, id: BeadId) => {
    return beadsService.reopen(id);
  });

  // Beads: Get ready work
  ipcMain.handle(IPC_CHANNELS.BEADS_READY, async () => {
    return beadsService.ready();
  });

  // Beads: Add dependency
  ipcMain.handle(
    IPC_CHANNELS.BEADS_DEP_ADD,
    async (_, from: BeadId, to: BeadId, type?: Dependency['type']) => {
      return beadsService.depAdd(from, to, type);
    }
  );

  // Beads: Remove dependency
  ipcMain.handle(IPC_CHANNELS.BEADS_DEP_REMOVE, async (_, from: BeadId, to: BeadId) => {
    return beadsService.depRemove(from, to);
  });

  // Beads: Get dependency tree
  ipcMain.handle(
    IPC_CHANNELS.BEADS_DEP_TREE,
    async (_, id: BeadId, direction?: 'up' | 'down' | 'both') => {
      return beadsService.depTree(id, direction);
    }
  );

  // Beads: Get all issues with full dependency data
  ipcMain.handle(IPC_CHANNELS.BEADS_GET_ALL_WITH_DEPS, async () => {
    return beadsService.getAllWithDependencies();
  });

  // Settings: Get
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async (_event, key: string) => {
    if (key === 'all') {
      return settingsService.getAll();
    }
    return settingsService.get(key as 'beadsProjectPath' | 'claudeApiKey');
  });

  // Settings: Set
  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_event, key: string, value: unknown) => {
    settingsService.set(key as 'beadsProjectPath' | 'claudeApiKey', value as string);

    // If beads path changed, update all services and watchers
    if (key === 'beadsProjectPath' && typeof value === 'string') {
      const projectPath = value;

      // Update BeadsService
      beadsService.setProjectPath(projectPath);

      // Update DiscoveryService - check .parade/ first, fallback to root
      const paradeDbPath = path.join(projectPath, '.parade', 'discovery.db');
      const legacyDbPath = path.join(projectPath, 'discovery.db');
      const discoveryDbPath = fs.existsSync(paradeDbPath) ? paradeDbPath :
                              fs.existsSync(legacyDbPath) ? legacyDbPath : paradeDbPath;
      discoveryService.setDatabasePath(discoveryDbPath);

      // Update TelemetryService (shares discovery.db)
      telemetryService.setDatabasePath(discoveryDbPath);

      // Update DocsService
      docsService.setProjectPath(projectPath);

      // Restart file watchers
      fileWatcherService.stopAll();
      fileWatcherService.watchDiscovery(discoveryDbPath);
      fileWatcherService.watchBeads(path.join(projectPath, '.beads'));

      console.log('Services reinitialized for project path:', projectPath);
    }
  });

  // App: Get version
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, async () => {
    const { app } = await import('electron');
    return app.getVersion();
  });

  // Dialog: Select folder
  ipcMain.handle(
    IPC_CHANNELS.DIALOG_SELECT_FOLDER,
    async (_, options?: { multiSelections?: boolean }) => {
      try {
        const result = await dialog.showOpenDialog({
          properties: [
            'openDirectory',
            'createDirectory',
            ...(options?.multiSelections ? ['multiSelections' as const] : []),
          ],
        });

        return {
          paths: result.canceled ? null : result.filePaths,
          error: undefined,
        };
      } catch (error) {
        return {
          paths: null,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    }
  );

  // ==========================================================================
  // Discovery handlers
  // ==========================================================================

  // Discovery: List briefs
  ipcMain.handle(IPC_CHANNELS.DISCOVERY.LIST_BRIEFS, async (_, filters?: BriefFilters) => {
    return discoveryService.listBriefs(filters);
  });

  // Discovery: Get single brief
  ipcMain.handle(IPC_CHANNELS.DISCOVERY.GET_BRIEF, async (_, id: string) => {
    return discoveryService.getBrief(id);
  });

  // Discovery: Get brief with all relations
  ipcMain.handle(IPC_CHANNELS.DISCOVERY.GET_BRIEF_WITH_RELATIONS, async (_, id: string) => {
    return discoveryService.getBriefWithRelations(id);
  });

  // Discovery: Get questions for a brief
  ipcMain.handle(IPC_CHANNELS.DISCOVERY.GET_QUESTIONS, async (_, briefId: string) => {
    return discoveryService.getQuestionsForBrief(briefId);
  });

  // Discovery: Get reviews for a brief
  ipcMain.handle(IPC_CHANNELS.DISCOVERY.GET_REVIEWS, async (_, briefId: string) => {
    return discoveryService.getReviewsForBrief(briefId);
  });

  // Discovery: List specs
  ipcMain.handle(IPC_CHANNELS.DISCOVERY.LIST_SPECS, async (_, filters?: { status?: SpecStatus }) => {
    return discoveryService.listSpecs(filters);
  });

  // Discovery: Get single spec
  ipcMain.handle(IPC_CHANNELS.DISCOVERY.GET_SPEC, async (_, id: string) => {
    return discoveryService.getSpec(id);
  });

  // Discovery: Get spec for a brief
  ipcMain.handle(IPC_CHANNELS.DISCOVERY.GET_SPEC_FOR_BRIEF, async (_, briefId: string) => {
    return discoveryService.getSpecForBrief(briefId);
  });

  // Discovery: Get events for a brief
  ipcMain.handle(IPC_CHANNELS.DISCOVERY.GET_EVENTS, async (_, briefId: string) => {
    return discoveryService.getEventsForBrief(briefId);
  });

  // Discovery: Get recent events across all briefs
  ipcMain.handle(IPC_CHANNELS.DISCOVERY.GET_RECENT_EVENTS, async (_, limit?: number) => {
    return discoveryService.getRecentEvents(limit);
  });

  // Discovery: Get pipeline summary
  ipcMain.handle(IPC_CHANNELS.DISCOVERY.GET_PIPELINE_SUMMARY, async () => {
    return discoveryService.getPipelineSummary();
  });

  // Discovery: Set database path (with .parade/ fallback support)
  ipcMain.handle(IPC_CHANNELS.DISCOVERY.SET_DATABASE_PATH, async (_, inputPath: string) => {
    // If path ends with discovery.db, resolve to correct location
    let dbPath = inputPath;
    if (inputPath.endsWith('discovery.db')) {
      // Extract project path from the db path
      const projectPath = inputPath.replace(/\/?\.parade\/discovery\.db$/, '').replace(/\/?discovery\.db$/, '');
      const paradeDbPath = path.join(projectPath, '.parade', 'discovery.db');
      const legacyDbPath = path.join(projectPath, 'discovery.db');
      dbPath = fs.existsSync(paradeDbPath) ? paradeDbPath :
               fs.existsSync(legacyDbPath) ? legacyDbPath : paradeDbPath;
      console.log('Discovery path resolved:', inputPath, '->', dbPath);
    }
    discoveryService.setDatabasePath(dbPath);
    telemetryService.setDatabasePath(dbPath);
  });

  // Discovery: Get database path
  ipcMain.handle(IPC_CHANNELS.DISCOVERY.GET_DATABASE_PATH, async () => {
    return discoveryService.getDatabasePath();
  });

  // ==========================================================================
  // Docs handlers
  // ==========================================================================

  // Docs: List files from docs/, .claude/, .design/ directories
  ipcMain.handle(IPC_CHANNELS.DOCS.LIST_FILES, async () => {
    return docsService.listFiles();
  });

  // Docs: Read file contents
  ipcMain.handle(IPC_CHANNELS.DOCS.READ_FILE, async (_, filePath: string) => {
    return docsService.readFile(filePath);
  });

  // ==========================================================================
  // Telemetry handlers
  // ==========================================================================

  // Telemetry: Record agent execution
  ipcMain.handle(IPC_CHANNELS.TELEMETRY.RECORD, async (_, params: CreateTelemetryParams) => {
    return telemetryService.recordTelemetry(params);
  });

  // Telemetry: Get by ID
  ipcMain.handle(IPC_CHANNELS.TELEMETRY.GET, async (_, id: string) => {
    return telemetryService.getTelemetry(id);
  });

  // Telemetry: Get for task
  ipcMain.handle(IPC_CHANNELS.TELEMETRY.GET_FOR_TASK, async (_, taskId: string) => {
    return telemetryService.getTelemetryForTask(taskId);
  });

  // Telemetry: Get for epic
  ipcMain.handle(IPC_CHANNELS.TELEMETRY.GET_FOR_EPIC, async (_, epicId: string) => {
    return telemetryService.getTelemetryForEpic(epicId);
  });

  // Telemetry: List with filters
  ipcMain.handle(IPC_CHANNELS.TELEMETRY.LIST, async (_, filters?: TelemetryFilters) => {
    return telemetryService.listTelemetry(filters);
  });

  // Telemetry: Get epic summary
  ipcMain.handle(IPC_CHANNELS.TELEMETRY.EPIC_SUMMARY, async (_, epicId: string) => {
    return telemetryService.getEpicSummary(epicId);
  });

  // Telemetry: Add annotation
  ipcMain.handle(IPC_CHANNELS.TELEMETRY.ADD_ANNOTATION, async (_, params: CreateAnnotationParams) => {
    return telemetryService.addAnnotation(params);
  });

  // Telemetry: Get annotations
  ipcMain.handle(IPC_CHANNELS.TELEMETRY.GET_ANNOTATIONS, async (_, telemetryId: string) => {
    return telemetryService.getAnnotations(telemetryId);
  });

  // Telemetry: Get agent performance
  ipcMain.handle(IPC_CHANNELS.TELEMETRY.AGENT_PERFORMANCE, async (_, agentType?: AgentLabel) => {
    return telemetryService.getAgentPerformance(agentType);
  });

  // Telemetry: Get recent failures
  ipcMain.handle(IPC_CHANNELS.TELEMETRY.RECENT_FAILURES, async (_, limit?: number) => {
    return telemetryService.getRecentFailures(limit);
  });

  // Telemetry: Get bug-causing telemetry
  ipcMain.handle(IPC_CHANNELS.TELEMETRY.BUG_CAUSING, async () => {
    return telemetryService.getBugCausingTelemetry();
  });

  // ==========================================================================
  // Terminal handlers
  // ==========================================================================

  // Terminal: Detect preferred terminal
  ipcMain.handle(IPC_CHANNELS.TERMINAL.DETECT, async () => {
    return terminalLauncherService.detectTerminal();
  });

  // Terminal: Launch terminal with command
  ipcMain.handle(IPC_CHANNELS.TERMINAL.LAUNCH, async (_, opts: { workingDir: string; command: string }) => {
    return terminalLauncherService.launch(opts.workingDir, opts.command);
  });

  // ==========================================================================
  // Project Setup Status handlers
  // ==========================================================================

  // Project: Check setup status
  ipcMain.handle(IPC_CHANNELS.PROJECT_CHECK_SETUP_STATUS, async (_, projectPath: string) => {
    return setupStatusService.checkSetupStatus(projectPath);
  });
}
