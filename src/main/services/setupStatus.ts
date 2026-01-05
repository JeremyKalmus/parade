/**
 * Setup Status Detection Service
 *
 * Detects the setup state of a Parade project to show appropriate
 * empty states and guidance in the UI.
 */

import fs from 'fs';
import path from 'path';

// ============================================================================
// Type Definitions
// ============================================================================

export type SetupStatus = 'not-started' | 'scaffolded' | 'configured' | 'ready';

export interface SetupStatusResult {
  status: SetupStatus;
  hasProjectYaml: boolean;
  hasClaudeDir: boolean;
  hasBeadsDir: boolean;
  hasParadeDir: boolean;
  hasDiscoveryDb: boolean;
  legacyDiscoveryDb: boolean; // At root instead of .parade/
}

// ============================================================================
// Setup Status Service Implementation
// ============================================================================

export class SetupStatusService {
  /**
   * Check the setup status of a project path.
   * Detects which setup components exist and returns the overall status.
   */
  checkSetupStatus(projectPath: string): SetupStatusResult {
    // Handle edge cases
    if (!projectPath) {
      return this.createEmptyResult();
    }

    try {
      // Check if path exists and is accessible
      if (!fs.existsSync(projectPath)) {
        return this.createEmptyResult();
      }

      // Check for each component
      const hasProjectYaml = this.checkExists(path.join(projectPath, 'project.yaml'));
      const hasClaudeDir = this.checkExists(path.join(projectPath, '.claude'));
      const hasBeadsDir = this.checkExists(path.join(projectPath, '.beads'));
      const hasParadeDir = this.checkExists(path.join(projectPath, '.parade'));

      // Check for discovery.db in both locations
      const hasDiscoveryDbInParade = this.checkExists(path.join(projectPath, '.parade', 'discovery.db'));
      const hasDiscoveryDbAtRoot = this.checkExists(path.join(projectPath, 'discovery.db'));

      const hasDiscoveryDb = hasDiscoveryDbInParade || hasDiscoveryDbAtRoot;
      const legacyDiscoveryDb = hasDiscoveryDbAtRoot && !hasDiscoveryDbInParade;

      // Determine status based on what exists
      const status = this.determineStatus({
        hasProjectYaml,
        hasClaudeDir,
        hasBeadsDir,
        hasDiscoveryDb,
      });

      return {
        status,
        hasProjectYaml,
        hasClaudeDir,
        hasBeadsDir,
        hasParadeDir,
        hasDiscoveryDb,
        legacyDiscoveryDb,
      };
    } catch (error) {
      // On permission errors or other issues, return safe defaults
      console.error('Error checking setup status:', error);
      return this.createEmptyResult();
    }
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Check if a path exists synchronously.
   * Returns false on any error (permission denied, etc.)
   */
  private checkExists(itemPath: string): boolean {
    try {
      return fs.existsSync(itemPath);
    } catch {
      return false;
    }
  }

  /**
   * Determine the setup status based on what components exist.
   *
   * Status logic:
   * - 'not-started': No project.yaml AND no .claude/ AND no .beads/
   * - 'scaffolded': Has .claude/ and .beads/ but NO project.yaml (old wizard flow)
   * - 'configured': Has project.yaml and .claude/ and .beads/ but no discovery.db
   * - 'ready': All above + discovery.db exists (either location)
   */
  private determineStatus(components: {
    hasProjectYaml: boolean;
    hasClaudeDir: boolean;
    hasBeadsDir: boolean;
    hasDiscoveryDb: boolean;
  }): SetupStatus {
    const { hasProjectYaml, hasClaudeDir, hasBeadsDir, hasDiscoveryDb } = components;

    // Not started: nothing exists
    if (!hasProjectYaml && !hasClaudeDir && !hasBeadsDir) {
      return 'not-started';
    }

    // Scaffolded: has directories but no config file
    if (hasClaudeDir && hasBeadsDir && !hasProjectYaml) {
      return 'scaffolded';
    }

    // Ready: has all components including discovery.db
    if (hasProjectYaml && hasClaudeDir && hasBeadsDir && hasDiscoveryDb) {
      return 'ready';
    }

    // Configured: has config but no discovery.db yet
    if (hasProjectYaml && hasClaudeDir && hasBeadsDir) {
      return 'configured';
    }

    // Partial setup cases - treat as configured if we have project.yaml,
    // or scaffolded if we have at least one directory
    if (hasProjectYaml) {
      return 'configured';
    }

    if (hasClaudeDir || hasBeadsDir) {
      return 'scaffolded';
    }

    // Fallback
    return 'not-started';
  }

  /**
   * Create an empty result for error cases or non-existent paths.
   */
  private createEmptyResult(): SetupStatusResult {
    return {
      status: 'not-started',
      hasProjectYaml: false,
      hasClaudeDir: false,
      hasBeadsDir: false,
      hasParadeDir: false,
      hasDiscoveryDb: false,
      legacyDiscoveryDb: false,
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const setupStatusService = new SetupStatusService();
export default setupStatusService;
