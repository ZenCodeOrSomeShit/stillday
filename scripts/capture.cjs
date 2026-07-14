const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

app.whenReady().then(async () => {
  const root = path.join(__dirname, '..');
  const window = new BrowserWindow({ width: 1440, height: 940, show: false, backgroundColor: '#121411' });
  await window.loadFile(path.join(root, 'src', 'index.html'));
  await new Promise((resolve) => setTimeout(resolve, 800));
  const image = await window.webContents.capturePage();
  await fs.mkdir(path.join(root, 'docs'), { recursive: true });
  await fs.writeFile(path.join(root, 'docs', 'stillday.png'), image.toPNG());
  app.quit();
});
