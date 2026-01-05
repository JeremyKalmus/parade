// FileWatcherService - Real-time file system monitoring for discovery.db and .beads/
// Uses chokidar for cross-platform file watching with debouncing
// Supports both .parade/discovery.db (new) and root discovery.db (legacy)

import chokidar, { FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';

/**
 * Event emitted when a file change is detected
 */
export type FileChangeEvent = {
  type: 'discovery' | 'beads';
  path: string;
  event: 'add' | 'change' | 'unlink';
};

/**
 * Chokidar watcher options optimized for SQLite and directory watching
 */
const WATCHER_OPTIONS: chokidar.WatchOptions = {
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 50,
  },
  // Ignore common system files
  ignored: /(^|[\/\\])\..(?!beads)/, // Ignore hidden files except .beads
};

/**
 * FileWatcherService monitors the discovery.db file and .beads/ directory
 * for changes and emits events to notify the UI layer.
 *
 * This enables real-time updates without polling.
 *
 * Supports both:
 * - .parade/discovery.db (new location)
 * - discovery.db at project root (legacy)
 *
 * Can also watch for discovery.db creation in .parade/ directory.
 *
 * Usage:
 *   fileWatcherService.on('change', (event: FileChangeEvent) => {
 *     mainWindow.webContents.send('file-changed', event);
 *   });
 *   fileWatcherService.watchDiscovery('/path/to/.parade/discovery.db');
 *   fileWatcherService.watchBeads('/path/to/.beads/');
 *   fileWatcherService.watchForDiscoveryCreation('/path/to/.parade/', (dbPath) => {
 *     // Handle discovery.db creation
 *   });
 */
class FileWatcherService extends EventEmitter {
  private discoveryWatcher: FSWatcher | null = null;
  private beadsWatcher: FSWatcher | null = null;
  private paradeWatcher: FSWatcher | null = null;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private debounceMs: number = 100; // Reduced from 200ms for faster updates

  /**
   * Start watching the discovery.db file
   * @param dbPath - Absolute path to discovery.db
   */
  watchDiscovery(dbPath: string): void {
    // Stop existing watcher if any
    if (this.discoveryWatcher) {
      this.discoveryWatcher.close().catch((err) => {
        console.error('Error closing discovery watcher:', err);
      });
      this.discoveryWatcher = null;
    }

    try {
      this.discoveryWatcher = chokidar.watch(dbPath, {
        ...WATCHER_OPTIONS,
        // SQLite creates temporary files during writes
        // Watch the parent directory pattern to catch -wal and -shm files
        awaitWriteFinish: {
          stabilityThreshold: 150,
          pollInterval: 50,
        },
      });

      this.discoveryWatcher
        .on('change', (path) => this.handleChange('discovery', path, 'change'))
        .on('add', (path) => this.handleChange('discovery', path, 'add'))
        .on('unlink', (path) => this.handleChange('discovery', path, 'unlink'))
        .on('error', (error) => {
          console.error('Discovery watcher error:', error);
          this.emit('error', { type: 'discovery', error });
        })
        .on('ready', () => {
          console.log('Discovery watcher ready:', dbPath);
        });
    } catch (err) {
      console.error('Failed to start discovery watcher:', err);
      this.emit('error', { type: 'discovery', error: err });
    }
  }

  /**
   * Watch the .parade/ directory for discovery.db creation
   * Used when .parade/ exists but discovery.db hasn't been created yet
   * @param paradeDir - Absolute path to .parade/ directory
   * @param onDiscoveryCreated - Callback when discovery.db is created
   */
  watchForDiscoveryCreation(
    paradeDir: string,
    onDiscoveryCreated: (dbPath: string) => void
  ): void {
    // Stop existing parade watcher if any
    if (this.paradeWatcher) {
      this.paradeWatcher.close().catch((err) => {
        console.error('Error closing parade watcher:', err);
      });
      this.paradeWatcher = null;
    }

    try {
      this.paradeWatcher = chokidar.watch(paradeDir, {
        ...WATCHER_OPTIONS,
        // Don't ignore initial files - we want to catch if discovery.db appears
        ignoreInitial: false,
        // Watch for files being added to this directory
        depth: 0,
      });

      this.paradeWatcher
        .on('add', (filePath) => {
          // Check if the added file is discovery.db
          if (filePath.endsWith('discovery.db')) {
            console.log('Discovery database created in .parade/:', filePath);

            // Stop watching the parade directory
            if (this.paradeWatcher) {
              this.paradeWatcher.close().catch((err) => {
                console.error('Error closing parade watcher:', err);
              });
              this.paradeWatcher = null;
            }

            // Notify caller to switch to watching the db file
            onDiscoveryCreated(filePath);
          }
        })
        .on('error', (error) => {
          console.error('Parade directory watcher error:', error);
          this.emit('error', { type: 'discovery', error });
        })
        .on('ready', () => {
          console.log('Watching for discovery.db creation in:', paradeDir);
        });
    } catch (err) {
      console.error('Failed to start parade directory watcher:', err);
      this.emit('error', { type: 'discovery', error: err });
    }
  }

  /**
   * Start watching the .beads/ directory
   * @param beadsPath - Absolute path to .beads/ directory
   */
  watchBeads(beadsPath: string): void {
    // Stop existing watcher if any
    if (this.beadsWatcher) {
      this.beadsWatcher.close().catch((err) => {
        console.error('Error closing beads watcher:', err);
      });
      this.beadsWatcher = null;
    }

    try {
      this.beadsWatcher = chokidar.watch(beadsPath, {
        ...WATCHER_OPTIONS,
        // Watch directory recursively for all bead files
        depth: 3,
        // Include .yaml and .md files in .beads/
        ignored: undefined,
      });

      this.beadsWatcher
        .on('change', (path) => this.handleChange('beads', path, 'change'))
        .on('add', (path) => this.handleChange('beads', path, 'add'))
        .on('unlink', (path) => this.handleChange('beads', path, 'unlink'))
        .on('error', (error) => {
          console.error('Beads watcher error:', error);
          this.emit('error', { type: 'beads', error });
        })
        .on('ready', () => {
          console.log('Beads watcher ready:', beadsPath);
        });
    } catch (err) {
      console.error('Failed to start beads watcher:', err);
      this.emit('error', { type: 'beads', error: err });
    }
  }

  /**
   * Stop all watchers and cleanup resources
   */
  stopAll(): void {
    // Clear all pending debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Close discovery watcher
    if (this.discoveryWatcher) {
      this.discoveryWatcher.close().catch((err) => {
        console.error('Error closing discovery watcher:', err);
      });
      this.discoveryWatcher = null;
      console.log('Discovery watcher stopped');
    }

    // Close beads watcher
    if (this.beadsWatcher) {
      this.beadsWatcher.close().catch((err) => {
        console.error('Error closing beads watcher:', err);
      });
      this.beadsWatcher = null;
      console.log('Beads watcher stopped');
    }

    // Close parade watcher
    if (this.paradeWatcher) {
      this.paradeWatcher.close().catch((err) => {
        console.error('Error closing parade watcher:', err);
      });
      this.paradeWatcher = null;
      console.log('Parade directory watcher stopped');
    }
  }

  /**
   * Set the debounce timing for file change events
   * @param ms - Debounce time in milliseconds (recommended: 100-300)
   */
  setDebounceMs(ms: number): void {
    if (ms < 0) {
      console.warn('Debounce ms must be positive, using 0');
      ms = 0;
    }
    this.debounceMs = ms;
  }

  /**
   * Get the current debounce timing
   */
  getDebounceMs(): number {
    return this.debounceMs;
  }

  /**
   * Check if discovery watcher is active
   */
  isWatchingDiscovery(): boolean {
    return this.discoveryWatcher !== null;
  }

  /**
   * Check if beads watcher is active
   */
  isWatchingBeads(): boolean {
    return this.beadsWatcher !== null;
  }

  /**
   * Handle file change with debouncing to prevent excessive updates
   * Multiple rapid changes to the same file will be coalesced into a single event
   */
  private handleChange(
    type: 'discovery' | 'beads',
    path: string,
    event: 'add' | 'change' | 'unlink'
  ): void {
    // Create a unique key for this file change
    const key = `${type}:${path}`;

    // Clear existing timer for this file if any
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set a new debounced timer
    const timer = setTimeout(() => {
      this.debounceTimers.delete(key);

      const changeEvent: FileChangeEvent = {
        type,
        path,
        event,
      };

      // Emit the change event
      this.emit('change', changeEvent);

      // Log for debugging
      console.log(`File ${event}: [${type}] ${path}`);
    }, this.debounceMs);

    this.debounceTimers.set(key, timer);
  }
}

// Export singleton instance
export const fileWatcherService = new FileWatcherService();
export default fileWatcherService;
