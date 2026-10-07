const { app } = require('electron');

/**
 * Configure Windows auto-start on user login
 */
function configureAutoStart(enable = true) {
  if (process.platform !== 'win32') {
    console.log('[AUTO-START] Platform is not Windows, skipping login item settings');
    return;
  }

  try {
    app.setLoginItemSettings({
      openAtLogin: enable,
      openAsHidden: false,
      path: process.execPath,
      args: ['--kiosk-mode']
    });
    console.log(`[AUTO-START] Windows startup configured: ${enable}`);
  } catch (err) {
    console.error('[AUTO-START] Failed to configure Windows startup:', err);
  }
}

module.exports = {
  configureAutoStart
};

