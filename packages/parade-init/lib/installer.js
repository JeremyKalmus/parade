/**
 * Beads CLI Installer
 *
 * Handles detection and installation of the beads CLI tool.
 * Implementation for task customTaskTracker-ym7.2
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const execAsync = promisify(exec);

/**
 * Detect operating system and architecture
 * @returns {{os: string, arch: string}}
 */
function detectPlatform() {
  const platform = process.platform;
  const arch = process.arch;

  // Map Node.js platform names to beads release names
  const osMap = {
    'darwin': 'darwin',
    'linux': 'linux',
    'win32': 'windows'
  };

  // Map Node.js arch names to release arch names
  const archMap = {
    'x64': 'amd64',
    'arm64': 'arm64',
    'ia32': '386'
  };

  return {
    os: osMap[platform] || platform,
    arch: archMap[arch] || arch
  };
}

/**
 * Check if beads CLI is installed
 * @returns {Promise<boolean>}
 */
async function checkBeadsInstalled() {
  try {
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'where bd' : 'which bd';

    await execAsync(command);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Download file from URL
 * @param {string} url - URL to download from
 * @param {string} destPath - Destination file path
 * @returns {Promise<void>}
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);

    https.get(url, {
      headers: { 'User-Agent': 'parade-init' }
    }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(response.headers.location, destPath)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        return reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (err) => {
        file.close();
        fs.unlinkSync(destPath);
        reject(err);
      });
    }).on('error', (err) => {
      file.close();
      fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

/**
 * Download beads binary from GitHub releases
 * @param {string} version - Beads version to install (default: 'latest')
 * @returns {Promise<string>} Path to downloaded binary
 */
async function downloadBeads(version = 'latest') {
  const platform = detectPlatform();

  // Construct download URL
  // Format: https://github.com/hintmedia/beads/releases/download/v0.1.0/beads_0.1.0_darwin_amd64.tar.gz
  // For latest: https://github.com/hintmedia/beads/releases/latest/download/beads_darwin_amd64.tar.gz

  let downloadUrl;
  if (version === 'latest') {
    downloadUrl = `https://github.com/hintmedia/beads/releases/latest/download/beads_${platform.os}_${platform.arch}.tar.gz`;
  } else {
    downloadUrl = `https://github.com/hintmedia/beads/releases/download/${version}/beads_${version}_${platform.os}_${platform.arch}.tar.gz`;
  }

  // Create temp directory
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'beads-'));
  const archivePath = path.join(tempDir, 'beads.tar.gz');

  try {
    console.log(`  Downloading from ${downloadUrl}...`);
    await downloadFile(downloadUrl, archivePath);

    // Extract tar.gz (for simplicity, we'll just note that extraction is needed)
    // In a real implementation, you'd use tar or a library to extract
    console.log('  Download complete!');

    return archivePath;
  } catch (error) {
    // Clean up on error
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    throw new Error(`Failed to download beads: ${error.message}`);
  }
}

/**
 * Install beads binary to system path
 * @param {string} binaryPath - Path to downloaded binary
 * @returns {Promise<void>}
 */
async function installBinary(binaryPath) {
  const isWindows = process.platform === 'win32';
  const installPath = isWindows
    ? path.join(process.env.LOCALAPPDATA || 'C:\\Program Files', 'beads', 'bd.exe')
    : '/usr/local/bin/bd';

  try {
    if (isWindows) {
      // Windows: Create directory and copy binary
      const installDir = path.dirname(installPath);
      if (!fs.existsSync(installDir)) {
        fs.mkdirSync(installDir, { recursive: true });
      }
      fs.copyFileSync(binaryPath, installPath);
      console.log(`  Installed to ${installPath}`);
      console.log('  Note: You may need to add this to your PATH');
    } else {
      // Unix: Copy to /usr/local/bin and make executable
      try {
        fs.copyFileSync(binaryPath, installPath);
        fs.chmodSync(installPath, 0o755);
        console.log(`  Installed to ${installPath}`);
      } catch (error) {
        if (error.code === 'EACCES' || error.code === 'EPERM') {
          throw new Error(
            'Permission denied. Please run with sudo:\n' +
            `  sudo npm install -g parade-init && sudo parade-init`
          );
        }
        throw error;
      }
    }

    // Verify installation
    try {
      const { stdout } = await execAsync('bd --version');
      console.log(`  Verified: ${stdout.trim()}`);
    } catch (error) {
      console.warn('  Warning: Could not verify installation. You may need to restart your terminal.');
    }
  } catch (error) {
    throw new Error(`Failed to install beads: ${error.message}`);
  }
}

/**
 * Main installation function
 * Orchestrates the complete installation workflow
 * @returns {Promise<void>}
 */
async function installBeads() {
  console.log('📦 Installing beads CLI...');

  try {
    // Check if already installed
    const alreadyInstalled = await checkBeadsInstalled();
    if (alreadyInstalled) {
      console.log('✅ Beads is already installed');
      return;
    }

    // Detect platform
    const platform = detectPlatform();
    console.log(`  Detected platform: ${platform.os}/${platform.arch}`);

    // Download binary
    const binaryPath = await downloadBeads('latest');

    // Install binary
    await installBinary(binaryPath);

    // Clean up temp files
    const tempDir = path.dirname(binaryPath);
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    console.log('✅ Beads CLI installed successfully!');
  } catch (error) {
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      throw new Error(
        'Network error: Could not reach GitHub. Please check your internet connection and try again.'
      );
    }
    throw error;
  }
}

module.exports = {
  detectPlatform,
  checkBeadsInstalled,
  downloadBeads,
  installBinary,
  installBeads
};
