const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron,
  closeApp: () => ipcRenderer.send('app:close'),
  minimizeApp: () => ipcRenderer.send('app:minimize'),
  toggleKiosk: () => ipcRenderer.send('app:toggle-kiosk'),
  setAutoStart: (enable) => ipcRenderer.send('app:set-autostart', enable)
});

