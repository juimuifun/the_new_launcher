const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');

// ตั้งค่า AutoUpdater ให้ดาวน์โหลดอัตโนมัติทันทีที่เจออัปเดต
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.logger = require('electron-log');
if (autoUpdater.logger) {
  autoUpdater.logger.transports.file.level = 'info';
}

// ปิด GPU Cache warning log บน Windows
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 600,
    resizable: false,
    maximizable: false,
    frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');

  // ตรวจสอบอัปเดตทันทีเมื่อเปิดแอป (เฉพาะในโหมดที่ build แล้ว หรือฉบับใช้งานจริง)
  mainWindow.webContents.on('did-finish-load', () => {
    if (app.isPackaged) {
      autoUpdater.checkForUpdates();
    } else {
      console.log('Development mode: Skipping autoUpdater check');
    }
  });
}

// ----------------------------------------------------
// ระบบ Auto Updater Events & IPC Handling
// ----------------------------------------------------
autoUpdater.on('checking-for-update', () => {
  if (mainWindow) mainWindow.webContents.send('updater-message', { status: 'checking', message: 'Checking for updates...' });
});

autoUpdater.on('update-available', (info) => {
  if (mainWindow) {
    mainWindow.webContents.send('updater-message', {
      status: 'available',
      message: `Found new update v${info.version}! Downloading...`,
      version: info.version
    });
  }
});

autoUpdater.on('update-not-available', (info) => {
  if (mainWindow) {
    mainWindow.webContents.send('updater-message', { status: 'not-available', message: 'Launcher is up to date.' });
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow) {
    mainWindow.webContents.send('updater-progress', {
      percent: Math.round(progressObj.percent),
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total
    });
  }
});

autoUpdater.on('update-downloaded', (info) => {
  if (mainWindow) {
    mainWindow.webContents.send('updater-message', {
      status: 'downloaded',
      message: `Update v${info.version} downloaded! Restarting to install...`,
      version: info.version
    });

    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'อัปเดตพร้อมแล้ว (Update Ready)',
      message: `ดาวน์โหลดเวอร์ชัน ${info.version} เรียบร้อยแล้ว แอปจะรีสตาร์ทเพื่อติดตั้งทันที`,
      buttons: ['รีสตาร์ทเพื่ออัปเดตตอนนี้ (Restart Now)']
    }).then(() => {
      autoUpdater.quitAndInstall();
    });
  }
});

autoUpdater.on('error', (err) => {
  if (mainWindow) {
    mainWindow.webContents.send('updater-message', { status: 'error', message: err ? err.message : 'Update error' });
  }
});

// IPC Listener ให้ Renderer สามารถกดเช็คอัปเดตเองได้แบบ Manual
ipcMain.on('check-for-update-manual', () => {
  if (app.isPackaged) {
    autoUpdater.checkForUpdates();
  } else {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Dev Mode',
      message: 'การเช็คอัปเดตอัตโนมัติจะทำงานเมื่อส่งออก Build (.exe / NSIS) เท่านั้น',
      buttons: ['ตกลง']
    });
  }
});


ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
