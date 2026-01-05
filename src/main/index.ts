// Electron main process entry point

import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { registerIpcHandlers } from './ipc/handlers';
import { registerProjectHandlers } from './ipc/project-handlers';
import { fileWatcherService } from './services/fileWatcher';
import { discoveryService } from './services/discovery';
import beadsService from './services/beads';
import settingsService from './services/settings';
import { docsService } from './services/docs';
import { telemetryService } from './services/telemetry';
import { migrationService } from './services/migration';
import { IPC_CHANNELS } from '../shared/types/ipc';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Debounce function for IPC events to prevent excessive re-renders
function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timeoutId: NodeJS.Timeout | null = null;
  return ((...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  }) as T;
}

// Debounced IPC event senders (300ms to coalesce rapid file changes)
const sendDiscoveryChange = debounce(() => {
  mainWindow?.webContents.send(IPC_CHANNELS.EVENTS.DISCOVERY_CHANGED);
}, 300);

const sendBeadsChange = debounce(() => {
  mainWindow?.webContents.send(IPC_CHANNELS.EVENTS.BEADS_CHANGED);
}, 300);

/**
 * Get the discovery.db path with fallback support
 * First checks .parade/discovery.db (new location), falls back to discovery.db (legacy)
 * @param projectPath - The project root path
 * @returns The path to discovery.db
 */
function getDiscoveryDbPath(projectPath: string): string {
  const newPath = path.join(projectPath, '.parade', 'discovery.db');
  const legacyPath = path.join(projectPath, 'discovery.db');

  // Check new location first
  if (fs.existsSync(newPath)) {
    console.log('Using discovery.db from .parade/ directory:', newPath);
    return newPath;
  }

  // Fall back to legacy location
  if (fs.existsSync(legacyPath)) {
    console.log('Using legacy discovery.db from project root:', legacyPath);
    return legacyPath;
  }

  // Default to new location if neither exists (for new projects)
  console.log('No existing discovery.db found, will use .parade/ location:', newPath);
  return newPath;
}

/**
 * Initialize file watchers based on saved project path
 */
async function initializeFileWatchers(): Promise<void> {
  const projectPath = settingsService.get('beadsProjectPath');
  if (projectPath) {
    // Auto-migrate discovery.db if needed
    const migrationResult = await migrationService.migrateDiscoveryDb(projectPath);
    if (migrationResult.migrated) {
      console.log(`Migrated discovery.db from ${migrationResult.from} to ${migrationResult.to}`);
    } else if (migrationResult.error) {
      console.error('Migration failed, continuing with legacy path:', migrationResult.error);
    }

    // Initialize DiscoveryService with database path (with fallback support)
    const discoveryDbPath = getDiscoveryDbPath(projectPath);
    discoveryService.setDatabasePath(discoveryDbPath);
    console.log('DiscoveryService initialized with:', discoveryDbPath);

    // Initialize TelemetryService with same database path
    telemetryService.setDatabasePath(discoveryDbPath);
    console.log('TelemetryService initialized with:', discoveryDbPath);

    // Initialize BeadsService with project path
    beadsService.setProjectPath(projectPath);
    console.log('BeadsService initialized with:', projectPath);

    // Initialize DocsService with project path
    docsService.setProjectPath(projectPath);
    console.log('DocsService initialized with:', projectPath);

    // Set up discovery.db watching with smart fallback
    const paradeDir = path.join(projectPath, '.parade');

    if (fs.existsSync(discoveryDbPath)) {
      // Watch the existing discovery.db file (either .parade/ or legacy location)
      fileWatcherService.watchDiscovery(discoveryDbPath);
    } else if (fs.existsSync(paradeDir)) {
      // .parade/ exists but discovery.db doesn't yet - watch for creation
      console.log('Watching for discovery.db creation in .parade/');
      fileWatcherService.watchForDiscoveryCreation(paradeDir, (createdDbPath) => {
        // Update services to use the newly created db
        discoveryService.setDatabasePath(createdDbPath);
        telemetryService.setDatabasePath(createdDbPath);
        console.log('Discovery database created, services updated:', createdDbPath);

        // Start watching the newly created db file
        fileWatcherService.watchDiscovery(createdDbPath);

        // Notify UI of discovery change
        sendDiscoveryChange();
      });
    } else {
      // Neither .parade/ nor discovery.db exists - watcher will be set up when file is created
      console.log('No discovery.db found yet, will watch when created');
    }

    // Watch .beads/ directory for changes
    const beadsPath = path.join(projectPath, '.beads');
    fileWatcherService.watchBeads(beadsPath);

    console.log('File watchers initialized for project:', projectPath);
  } else {
    console.log('No project path configured, file watchers not started');
  }
}

/**
 * Set up file watcher event listeners
 */
function setupFileWatcherEvents(): void {
  fileWatcherService.on('change', (event) => {
    if (event.type === 'discovery') {
      sendDiscoveryChange();
    } else if (event.type === 'beads') {
      sendBeadsChange();
    }
  });

  fileWatcherService.on('error', (error) => {
    console.error('File watcher error:', error);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Parade',
    backgroundColor: '#f9fafb', // gray-50
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Required for better-sqlite3
    },
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Register IPC handlers before creating window
app.whenReady().then(async () => {
  registerIpcHandlers();
  registerProjectHandlers();

  // Initialize services BEFORE creating window so they're ready when renderer starts
  setupFileWatcherEvents();
  await initializeFileWatchers();

  // Now create the window
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up file watchers before app quits
app.on('before-quit', () => {
  fileWatcherService.stopAll();
  console.log('File watchers stopped on app quit');
});

// Security: prevent navigation to unknown URLs
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== 'http://localhost:5173') {
      event.preventDefault();
    }
  });
});
