// Notarization disabled - takes too long in CI and is flaky
// Users can run: xattr -cr /Applications/Parade.app
// To re-enable, set ENABLE_NOTARIZATION=true in GitHub secrets

exports.default = async function notarizing(context) {
  if (process.env.ENABLE_NOTARIZATION !== 'true') {
    console.log('Notarization skipped (ENABLE_NOTARIZATION not set)');
    console.log('Users should run: xattr -cr /Applications/Parade.app');
    return;
  }

  const { notarize } = require('@electron/notarize');
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== 'darwin') {
    return;
  }

  if (!process.env.APPLE_ID || !process.env.APPLE_APP_SPECIFIC_PASSWORD || !process.env.APPLE_TEAM_ID) {
    console.log('Skipping notarization: missing credentials');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  console.log(`Notarizing ${appPath}...`);

  try {
    await notarize({
      appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    });
    console.log('Notarization complete!');
  } catch (error) {
    console.error('Notarization failed:', error.message);
    throw error;
  }
};
