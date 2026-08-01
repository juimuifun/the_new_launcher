const { app, BrowserWindow, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

// ปิด log ที่ไม่จำเป็น (เปิดเป็น true เพื่อ debug)
autoUpdater.logger = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 800,
    minHeight: 550,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f172a',
      symbolColor: '#f8fafc'
    },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');

  // ตรวจสอบ update หลังหน้าต่างโหลดเสร็จ
  win.webContents.on('did-finish-load', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });

  // มี version ใหม่ให้ดาวน์โหลด
  autoUpdater.on('update-available', () => {
    dialog.showMessageBox(win, {
      type: 'info',
      title: 'มีอัปเดตใหม่',
      message: 'มีเวอร์ชันใหม่ กำลังดาวน์โหลดในเบื้องหลัง...',
      buttons: ['ตกลง']
    });
  });

  // ดาวน์โหลดเสร็จ พร้อมติดตั้ง
  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(win, {
      type: 'info',
      title: 'อัปเดตพร้อมแล้ว',
      message: 'ดาวน์โหลดเสร็จแล้ว กด "รีสตาร์ท" เพื่อติดตั้งเวอร์ชันใหม่',
      buttons: ['รีสตาร์ทเดี๋ยวนี้', 'ภายหลัง']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });
}

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
