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

  const projectPath = process.cwd();

  try {
    // Step 1: Check beads installation
    const beadsInstalled = await checkBeadsInstalled();

    if (!beadsInstalled) {
      console.log('\n📦 Installing beads CLI...');
      try {
        await installBeads();
        console.log('✅ Beads CLI installed successfully');
      } catch (installError) {
        console.error('⚠️  Could not auto-install beads. Please install manually:');
        console.error('   npm install -g beads');
        console.error('   Or visit: https://github.com/steveyegge/beads');
        // Continue with scaffolding even if beads install fails
      }
    }

    // Step 2: Scaffold project directories
    console.log('\n📁 Creating project structure...');
    await scaffoldProject(projectPath, { createDesign: false });

    // Step 3: Copy skill files
    console.log('\n📋 Copying skill definitions...');
    await copySkills(projectPath);

    console.log('\n✨ Initialization complete!');
    console.log('\n' + '─'.repeat(60));
    console.log('\n📋 Next Steps:\n');
    console.log('   1. Open Claude Code in this directory');
    console.log('   2. Run /init-project to configure your project');
    console.log('   3. Run /parade-doctor to verify setup');
    console.log('\n🖥️  Parade App (Visual Dashboard):\n');
    console.log('   The Parade app provides a visual Kanban board for tracking');
    console.log('   your workflow. To install:\n');
    console.log('   # Clone the Parade repository');
    console.log('   git clone https://github.com/JeremyKalmus/parade.git ~/parade');
    console.log('   cd ~/parade && npm install\n');
    console.log('   # Run the app');
    console.log('   npm run dev\n');
    console.log('   Then open your project folder in the app.\n');
    console.log('─'.repeat(60));

  } catch (error) {
    // Re-throw with context for better error messages
    throw new Error(`Initialization failed: ${error.message}`);
  }
}

/**
 * Copy skill files from the package to the project
 * @param {string} projectPath - Path to the project root
 * @returns {Promise<void>}
 */
async function copySkills(projectPath) {
  const fs = require('fs').promises;
  const path = require('path');

  // Skills are bundled in the package's skills/ directory
  const packageSkillsPath = path.join(__dirname, '..', 'skills');
  const projectSkillsPath = path.join(projectPath, '.claude', 'skills');

  try {
    // Check if package has bundled skills
    await fs.access(packageSkillsPath);
  } catch {
    console.log('   ⚠️  No bundled skills found (development mode)');
    return;
  }

  // Copy each skill directory
  const skillDirs = await fs.readdir(packageSkillsPath);
  let copiedCount = 0;

  for (const skillDir of skillDirs) {
    const srcPath = path.join(packageSkillsPath, skillDir);
    const destPath = path.join(projectSkillsPath, skillDir);

    // Check if it's a directory
    const stat = await fs.stat(srcPath);
    if (!stat.isDirectory()) continue;

    // Skip if skill already exists in project
    try {
      await fs.access(destPath);
      console.log(`   ⏭️  ${skillDir} (already exists)`);
      continue;
    } catch {
      // Skill doesn't exist, copy it
    }

    // Copy the skill directory recursively
    await copyDir(srcPath, destPath);
    console.log(`   ✅ ${skillDir}`);
    copiedCount++;
  }

  if (copiedCount === 0) {
    console.log('   All skills already present');
  }
}

/**
 * Recursively copy a directory
 * @param {string} src - Source path
 * @param {string} dest - Destination path
 */
async function copyDir(src, dest) {
  const fs = require('fs').promises;
  const path = require('path');

  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

// Export all functions
module.exports = {
  checkBeadsInstalled,
  installBeads,
  scaffoldProject,
  main
};
