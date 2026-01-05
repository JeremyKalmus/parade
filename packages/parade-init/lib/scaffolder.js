/**
 * Project Scaffolder
 *
 * Creates the directory structure for a new Parade project.
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

/**
 * Create .parade/ directory with README
 * @param {string} projectPath - Project root path
 * @returns {Promise<{created: boolean, skipped: boolean, path: string}>}
 */
async function createParadeDir(projectPath) {
  const paradePath = path.join(projectPath, '.parade');
  const readmePath = path.join(paradePath, 'README.md');

  try {
    // Check if directory already exists
    try {
      await fs.access(paradePath);
      return { created: false, skipped: true, path: paradePath };
    } catch {
      // Directory doesn't exist, create it
    }

    await fs.mkdir(paradePath, { recursive: true });

    const readmeContent = `# .parade Directory

This directory contains Parade workflow orchestrator data.
Do not modify files here directly.

- discovery.db: Pre-approval workflow database
- metrics/: Execution telemetry (future)
`;

    await fs.writeFile(readmePath, readmeContent, 'utf8');

    return { created: true, skipped: false, path: paradePath };
  } catch (error) {
    throw new Error(`Failed to create .parade directory: ${error.message}`);
  }
}

/**
 * Create .claude/ directory structure
 * @param {string} projectPath - Project root path
 * @returns {Promise<{created: boolean, skipped: boolean, path: string}>}
 */
async function createClaudeDir(projectPath) {
  const claudePath = path.join(projectPath, '.claude');

  try {
    // Check if directory already exists
    try {
      await fs.access(claudePath);
      return { created: false, skipped: true, path: claudePath };
    } catch {
      // Directory doesn't exist, create it
    }

    // Create main .claude directory
    await fs.mkdir(claudePath, { recursive: true });

    // Create subdirectories
    const subdirs = ['skills', 'agents', 'templates'];
    for (const subdir of subdirs) {
      await fs.mkdir(path.join(claudePath, subdir), { recursive: true });
    }

    return { created: true, skipped: false, path: claudePath };
  } catch (error) {
    throw new Error(`Failed to create .claude directory: ${error.message}`);
  }
}

/**
 * Initialize beads by running `bd init`
 * @param {string} projectPath - Project root path
 * @returns {Promise<{created: boolean, skipped: boolean, path: string, error?: string}>}
 */
async function initializeBeads(projectPath) {
  const beadsPath = path.join(projectPath, '.beads');

  try {
    // Check if .beads/ already exists
    try {
      await fs.access(beadsPath);
      return { created: false, skipped: true, path: beadsPath };
    } catch {
      // Directory doesn't exist, try to run bd init
    }

    // Check if bd is installed
    try {
      execSync('which bd', { stdio: 'pipe' });
    } catch {
      return {
        created: false,
        skipped: false,
        path: beadsPath,
        error: 'bd CLI not installed'
      };
    }

    // Run bd init
    execSync('bd init', {
      cwd: projectPath,
      stdio: 'pipe'
    });

    return { created: true, skipped: false, path: beadsPath };
  } catch (error) {
    return {
      created: false,
      skipped: false,
      path: beadsPath,
      error: error.message
    };
  }
}

/**
 * Create .design/ directory structure
 * @param {string} projectPath - Project root path
 * @param {object} options - Options object
 * @param {boolean} options.createDesign - Whether to create .design/
 * @returns {Promise<{created: boolean, skipped: boolean, path: string}>}
 */
async function createDesignDir(projectPath, options = {}) {
  const designPath = path.join(projectPath, '.design');

  // Skip if not requested
  if (!options.createDesign) {
    return { created: false, skipped: true, path: designPath };
  }

  try {
    // Check if directory already exists
    try {
      await fs.access(designPath);
      return { created: false, skipped: true, path: designPath };
    } catch {
      // Directory doesn't exist, create it
    }

    await fs.mkdir(designPath, { recursive: true });

    // Create placeholder files
    const colorsContent = `# Colors

Brand colors and palette definitions.
`;

    const typographyContent = `# Typography

Font families, sizes, and text styles.
`;

    const componentsContent = `# Components

Design patterns and component specifications.
`;

    await fs.writeFile(path.join(designPath, 'Colors.md'), colorsContent, 'utf8');
    await fs.writeFile(path.join(designPath, 'Typography.md'), typographyContent, 'utf8');
    await fs.writeFile(path.join(designPath, 'Components.md'), componentsContent, 'utf8');

    return { created: true, skipped: false, path: designPath };
  } catch (error) {
    throw new Error(`Failed to create .design directory: ${error.message}`);
  }
}

/**
 * Create complete project scaffold
 * @param {string} projectPath - Project root path
 * @param {object} options - Options object
 * @param {boolean} options.createDesign - Whether to create .design/
 * @returns {Promise<{results: Array, success: boolean}>}
 */
async function createProjectScaffold(projectPath, options = {}) {
  console.log('\n📁 Creating project structure...\n');

  const results = [];
  let allSuccessful = true;

  // Create .parade/
  try {
    const paradeResult = await createParadeDir(projectPath);
    results.push({ name: '.parade', ...paradeResult });
    console.log(paradeResult.skipped
      ? '⏭️  .parade/ already exists, skipping'
      : '✅ Created .parade/ with README.md'
    );
  } catch (error) {
    results.push({ name: '.parade', created: false, skipped: false, error: error.message });
    console.log(`❌ Failed to create .parade/: ${error.message}`);
    allSuccessful = false;
  }

  // Create .claude/
  try {
    const claudeResult = await createClaudeDir(projectPath);
    results.push({ name: '.claude', ...claudeResult });
    console.log(claudeResult.skipped
      ? '⏭️  .claude/ already exists, skipping'
      : '✅ Created .claude/ with subdirectories (skills/, agents/, templates/)'
    );
  } catch (error) {
    results.push({ name: '.claude', created: false, skipped: false, error: error.message });
    console.log(`❌ Failed to create .claude/: ${error.message}`);
    allSuccessful = false;
  }

  // Initialize beads
  try {
    const beadsResult = await initializeBeads(projectPath);
    results.push({ name: '.beads', ...beadsResult });

    if (beadsResult.skipped) {
      console.log('⏭️  .beads/ already exists, skipping');
    } else if (beadsResult.error) {
      console.log(`⚠️  Could not initialize beads: ${beadsResult.error}`);
      console.log('   Install beads manually and run `bd init` if needed');
    } else {
      console.log('✅ Initialized .beads/ via bd init');
    }
  } catch (error) {
    results.push({ name: '.beads', created: false, skipped: false, error: error.message });
    console.log(`⚠️  Failed to initialize beads: ${error.message}`);
    // Don't mark as unsuccessful for beads failures
  }

  // Create .design/ if requested
  try {
    const designResult = await createDesignDir(projectPath, options);
    results.push({ name: '.design', ...designResult });

    if (options.createDesign) {
      console.log(designResult.skipped
        ? '⏭️  .design/ already exists, skipping'
        : '✅ Created .design/ with placeholder files'
      );
    }
  } catch (error) {
    results.push({ name: '.design', created: false, skipped: false, error: error.message });
    console.log(`❌ Failed to create .design/: ${error.message}`);
    allSuccessful = false;
  }

  console.log('\n📦 Scaffolding complete!\n');

  return { results, success: allSuccessful };
}

module.exports = {
  createParadeDir,
  createClaudeDir,
  initializeBeads,
  createDesignDir,
  createProjectScaffold
};
