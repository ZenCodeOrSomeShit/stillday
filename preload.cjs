const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('stillday', {
  exportBackup: (data) => ipcRenderer.invoke('backup:export', data),
  importBackup: () => ipcRenderer.invoke('backup:import'),
  platform: process.platform
});
