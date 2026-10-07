const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const { configureAutoStart } = require('./startup');

let mainWindow = null;
let apiProcess = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const API_PORT = process.env.PORT || 5001;
const WEB_URL = isDev ? 'http://localhost:5173' : `http://127.0.0.1:${API_PORT}`;

// Launch backend process if running in production bundle
function startBackendServer() {
  if (isDev) return;

  const backendEntry = path.join(__dirname, '../../local-api/src/index.js');
  console.log('[ELECTRON] Spawning background local-api backend:', backendEntry);

  apiProcess = spawn(process.execPath, [backendEntry], {
    env: { ...process.env, PORT: API_PORT, NODE_ENV: 'production' },
    stdio: 'ignore'
  });

  apiProcess.on('error', (err) => {
    console.error('[ELECTRON] Failed to start local-api process:', err);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 720,
    kiosk: !isDev, // Kiosk mode on production attendance terminal
    autoHideMenuBar: true,
    backgroundColor: '#020617',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // In production, load the built UI or local server
    const indexPath = path.join(__dirname, '../../web/dist/index.html');
    mainWindow.loadFile(indexPath).catch(() => {
      mainWindow.loadURL(WEB_URL);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // 1. Configure Windows auto-start
  configureAutoStart(true);

  // 2. Start local backend
  startBackendServer();

  // 3. Create kiosk window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (apiProcess) {
    apiProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC controls
ipcMain.on('app:close', () => app.quit());
ipcMain.on('app:minimize', () => mainWindow && mainWindow.minimize());
ipcMain.on('app:toggle-kiosk', () => {
  if (mainWindow) {
    const isKiosk = mainWindow.isKiosk();
    mainWindow.setKiosk(!isKiosk);
  }
});
ipcMain.on('app:set-autostart', (event, enable) => {
  configureAutoStart(enable);
});

