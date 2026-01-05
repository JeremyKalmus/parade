/**
 * Parade Init - Main Module
 *
 * Orchestrates the initialization of a new Parade project:
 * 1. Check if beads CLI is installed
 * 2. Install beads if needed
 * 3. Scaffold project directories
 */

const installer = require('./installer');

/**
 * Check if beads CLI is installed on the system
 * @returns {Promise<boolean>} True if beads is installed
 */
async function checkBeadsInstalled() {
  console.log('🔍 Checking for beads CLI...');
  const installed = await installer.checkBeadsInstalled();

  if (installed) {
    console.log('✅ Beads CLI found');
  } else {
    console.log('❌ Beads CLI not found');
  }

  return installed;
}

/**
 * Install beads CLI from GitHub releases
 * @returns {Promise<void>}
 */
async function installBeads() {
  try {
    await installer.installBeads();
  } catch (error) {
    // Add user-friendly context to errors
    if (error.message.includes('Permission denied')) {
      console.error('\n❌ Installation failed due to permissions.');
      console.error(error.message);
      throw error;
    } else if (error.message.includes('Network error')) {
      console.error('\n❌ Installation failed due to network issues.');
      console.error(error.message);
      throw error;
    } else {
      console.error('\n❌ Installation failed.');
      console.error(`   Error: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Create project directory structure (.beads/, .claude/, etc.)
 * @param {string} projectPath - Path to the project root
 * @param {object} options - Scaffolding options
 * @param {boolean} options.createDesign - Whether to create .design/
 * @returns {Promise<void>}
 */
async function scaffoldProject(projectPath = process.cwd(), options = {}) {
  const { createProjectScaffold } = require('./scaffolder');
  const result = await createProjectScaffold(projectPath, options);

  if (!result.success) {
    throw new Error('Some directories failed to create. Check output above for details.');
  }
}

/**
 * Main orchestration function
 * Runs the complete initialization workflow
 * @returns {Promise<void>}
 */
async function main() {
  console.log('🎪 Parade Initializer v1.0.0\n');

  try {
    // Check beads installation
    const beadsInstalled = await checkBeadsInstalled();

    if (!beadsInstalled) {
      console.log('📦 Beads CLI not found. Installation will be required.');
      // Actual installation will be implemented in task .2
    } else {
      console.log('✅ Beads CLI already installed');
    }

    console.log('\n✨ Initialization complete! (placeholder)');
    console.log('   Run `/init-project` in Claude Code to configure your project.');

  } catch (error) {
    // Re-throw with context for better error messages
    throw new Error(`Initialization failed: ${error.message}`);
  }
}

// Export all functions
module.exports = {
  checkBeadsInstalled,
  installBeads,
  scaffoldProject,
  main
};
