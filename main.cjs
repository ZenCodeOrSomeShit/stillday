const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const capturePath = process.argv.find((arg) => arg.startsWith('--capture='))?.slice('--capture='.length);

const createWindow = () => {
  Menu.setApplicationMenu(null);
  const window = new BrowserWindow({
    width: 1260,
    height: 820,
    minWidth: 1040,
    minHeight: 680,
    show: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#131512',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.loadFile(path.join(__dirname, 'src', 'index.html'));
  window.once('ready-to-show', () => {
    if (!capturePath) window.show();
  });

  if (capturePath) {
    window.webContents.once('did-finish-load', async () => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const image = await window.webContents.capturePage();
      await fs.mkdir(path.dirname(capturePath), { recursive: true });
      await fs.writeFile(capturePath, image.toPNG());
      app.quit();
    });
  }

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
};

app.setName('Stillday');

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('backup:export', async (_event, data) => {
  const result = await dialog.showSaveDialog({
    title: 'Export Stillday backup',
    defaultPath: `stillday-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON backup', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  await fs.writeFile(result.filePath, data, 'utf8');
  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle('backup:import', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Import Stillday backup',
    properties: ['openFile'],
    filters: [{ name: 'JSON backup', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  return { canceled: false, data: await fs.readFile(result.filePaths[0], 'utf8') };
});
