// MigrationService - Auto-migrate discovery.db from root to .parade/
// This service handles one-time migration of discovery.db and its WAL files
// from legacy project root location to new .parade/ directory structure

import fs from 'fs';
import path from 'path';

/**
 * Result of migration operation
 */
export interface MigrationResult {
  /** Whether migration was performed */
  migrated: boolean;
  /** Source path if migration occurred */
  from?: string;
  /** Destination path if migration occurred */
  to?: string;
  /** Error message if migration failed */
  error?: string;
}

/**
 * MigrationService handles automatic migration of discovery.db from
 * project root to .parade/ directory structure.
 */
class MigrationService {
  /**
   * Migrate discovery.db from root to .parade/ directory if needed
   *
   * Migration logic:
   * 1. Skip if .parade/discovery.db already exists
   * 2. Check if root discovery.db exists
   * 3. Create .parade/ directory if needed
   * 4. Move discovery.db and WAL files
   *
   * @param projectPath - Absolute path to project root
   * @returns MigrationResult indicating what happened
   */
  async migrateDiscoveryDb(projectPath: string): Promise<MigrationResult> {
    const newPath = path.join(projectPath, '.parade', 'discovery.db');
    const legacyPath = path.join(projectPath, 'discovery.db');
    const paradeDir = path.join(projectPath, '.parade');

    try {
      // Skip if new location already exists
      if (fs.existsSync(newPath)) {
        console.log('Migration skipped: discovery.db already exists in .parade/');
        return { migrated: false };
      }

      // Check if legacy location exists
      if (!fs.existsSync(legacyPath)) {
        console.log('Migration skipped: no discovery.db found in project root');
        return { migrated: false };
      }

      // Create .parade/ directory if it doesn't exist
      if (!fs.existsSync(paradeDir)) {
        fs.mkdirSync(paradeDir, { recursive: true });
        console.log('Created .parade/ directory:', paradeDir);
      }

      // Move discovery.db
      fs.renameSync(legacyPath, newPath);
      console.log(`Moved discovery.db: ${legacyPath} -> ${newPath}`);

      // Move WAL files if they exist
      const walFiles = ['discovery.db-shm', 'discovery.db-wal'];
      for (const walFile of walFiles) {
        const walLegacyPath = path.join(projectPath, walFile);
        const walNewPath = path.join(paradeDir, walFile);

        if (fs.existsSync(walLegacyPath)) {
          fs.renameSync(walLegacyPath, walNewPath);
          console.log(`Moved WAL file: ${walFile}`);
        }
      }

      return {
        migrated: true,
        from: legacyPath,
        to: newPath,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Migration failed:', errorMessage);

      return {
        migrated: false,
        error: errorMessage,
      };
    }
  }
}

// Export singleton instance
export const migrationService = new MigrationService();
export default migrationService;
