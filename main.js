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
      message: `Update v${info.version} downloaded!`,
      version: info.version
    });
    mainWindow.webContents.send('update-ready-modal', {
      version: info.version
    });
  }
});

autoUpdater.on('error', (err) => {
  if (mainWindow) {
    mainWindow.webContents.send('updater-message', { status: 'error', message: err ? err.message : 'Update error' });
  }
});

// IPC Listener ให้ UI สั่งรีสตาร์ทเพื่อติดตั้ง
ipcMain.on('restart-and-install', () => {
  autoUpdater.quitAndInstall();
});

// IPC Listener ให้ Renderer สามารถกดเช็คอัปเดตเองได้แบบ Manual
ipcMain.on('check-for-update-manual', () => {
  if (app.isPackaged) {
    autoUpdater.checkForUpdates();
  } else {
    if (mainWindow) {
      mainWindow.webContents.send('updater-message', {
        status: 'info',
        message: 'Development mode: Auto-updater works on packaged builds.'
      });
    }
  }
});

// ----------------------------------------------------
// EML-Lib Minecraft Launching & Status System
// ----------------------------------------------------
const path = require('path');

ipcMain.on('launch-game', async (event, userPayload) => {
  try {
    const { Launcher, Java, CrackAuth, ServerStatus } = await import('eml-lib');
    const apiDomain = userPayload.apiDomain || 'http://localhost:3000';
    const folderNamespace = (userPayload.gameFolderNamespace || 'the_new_launcher').replace(/^\.+/, '');

    // ตำแหน่งโฟลเดอร์เก็บไฟล์เกมตามมาตรฐาน Minecraft (%APPDATA%\.namespace)
    const rootPath = path.join(app.getPath('appData'), `.${folderNamespace}`);

    // ----------------------------------------------------
    // Monotonic Progress Tracker (เดินหน้าอย่างเดียว การันตี 0% -> 100%)
    // ----------------------------------------------------
    let currentMaxPercent = 0;
    const sendProgress = (status, percent, text) => {
      if (percent > currentMaxPercent) {
        currentMaxPercent = Math.min(100, percent);
      }
      if (mainWindow) {
        mainWindow.webContents.send('launch-progress', { status, percent: currentMaxPercent, text });
      }
    };

    // Step 1: Fetch Game Config from Web Server API
    let gameConfig = {
      version: '1.20.1',
      loader: 'vanilla',
      loaderVersion: '',
      serverIp: '',
      serverPort: 25565,
      javaVersion: 17
    };

    try {
      console.log(`[Launcher] Fetching game config from: ${apiDomain}/minecraft/api/launcher-config`);
      const configRes = await fetch(`${apiDomain}/minecraft/api/launcher-config`).catch(() => null);
      if (configRes && configRes.ok) {
        const resData = await configRes.json().catch(() => ({}));
        if (resData && resData.game) {
          gameConfig.version = resData.game.version || gameConfig.version;
          gameConfig.loader = resData.game.loader || gameConfig.loader;
          gameConfig.loaderVersion = resData.game.loaderVersion || '';
          gameConfig.serverIp = resData.game.serverIp || '';
          gameConfig.serverPort = resData.game.serverPort || 25565;
          if (resData.java && resData.java.version) {
            gameConfig.javaVersion = resData.java.version;
          }
          console.log('[Launcher] Successfully loaded config from Web Server:', gameConfig);
        }
      } else {
        console.warn('[Launcher] Could not reach launcher-config API, using default config:', gameConfig);
      }
    } catch (err) {
      console.warn('[Launcher] Launcher config API fetch error:', err.message);
    }

    // Step 2: Create Authenticator Session (Using Web API Login Session + CrackAuth fallback)
    const authenticator = new CrackAuth();
    const defaultAuth = authenticator.auth(userPayload.username || 'Player');

    const authSession = {
      name: userPayload.username || defaultAuth.name,
      uuid: userPayload.uuid || defaultAuth.uuid,
      accessToken: userPayload.accessToken || defaultAuth.accessToken || 'offline',
      clientToken: userPayload.uuid || defaultAuth.clientToken,
      meta: { online: false, type: 'crack' }
    };

    console.log('[Launcher] Using Auth Session:', { name: authSession.name, uuid: authSession.uuid });

    // Step 3: Install Java Runtime Environment via EML-Lib Java Class (10% - 25%)
    sendProgress('java-preparing', 10, 'Preparing Java Runtime...');

    const javaManager = new Java({
      root: rootPath,
      version: {
        number: gameConfig.version,
        type: 'release'
      }
    });

    javaManager.on('progress', (data) => {
      const p = Math.round(10 + (data.percent || 0) * 0.15); // Java: 10% to 25%
      sendProgress('java-downloading', p, `Downloading Java (${data.percent || 0}%)`);
    });

    const javaPath = await javaManager.download().catch((err) => {
      console.warn('Java download info:', err.message);
      return 'java';
    });

    // Step 4: Download Custom Extra Files (Mods, Configs, Resourcepacks) from Web Server API (25% - 40%)
    sendProgress('extra-files', 25, 'Checking Server Custom Files...');
    
    await downloadCustomServerFiles(apiDomain, rootPath, (downloadProgress) => {
      const p = Math.round(25 + downloadProgress * 0.15); // Extra files: 25% to 40%
      sendProgress('extra-downloading', p, `Syncing Server Files (${downloadProgress}%)`);
    });

    // Setup File Logger inside Project Directory
    const fs = require('fs');
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const logFilePath = path.join(logsDir, 'launcher_game.log');
    
    // เคลียร์ Log เก่า ล้างไฟล์เริ่มต้นใหม่ทุกครั้งที่กดเริ่มเกม
    fs.writeFileSync(logFilePath, `========== SESSION LAUNCHED AT ${new Date().toLocaleString('th-TH')} ==========\n`);
    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

    const logMessage = (msg) => {
      const timeStr = `[${new Date().toLocaleTimeString('th-TH')}] ${msg}`;
      console.log(timeStr);
      logStream.write(timeStr + '\n');
    };

    logMessage(`[System] Game Directory Namespace: .${folderNamespace}`);
    logMessage(`[System] Web Server API Domain: ${apiDomain}`);
    logMessage(`[System] Initializing game config: ${JSON.stringify(gameConfig)}`);

    // Step 5: Configure Launcher with EML-Lib Launcher Class
    const ignoredList = Array.isArray(userPayload.cleaningIgnored) ? userPayload.cleaningIgnored : [
      'mods/',
      'crash-reports/',
      'logs/',
      'resourcepacks/',
      'resources/',
      'saves/',
      'shaderpacks/',
      'options.txt',
      'optionsof.txt'
    ];

    const launcher = new Launcher({
      serverId: folderNamespace,
      cleaning: {
        enabled: true,
        ignored: ignoredList
      },
      minecraft: {
        version: gameConfig.version,
        loader: {
          loader: gameConfig.loader || 'vanilla',
          version: gameConfig.loaderVersion || gameConfig.version
        }
      },
      account: authSession,
      memory: {
        max: 4096,
        min: 1024
      },
      quickPlay: gameConfig.serverIp ? {
        type: 'multiplayer',
        identifier: `${gameConfig.serverIp}:${gameConfig.serverPort}`
      } : null
    });

    // ----------------------------------------------------
    // Catch ALL EML-Lib Internal Events & Game Output
    // ----------------------------------------------------
    const originalEmit = launcher.emit.bind(launcher);
    launcher.emit = function (eventName, ...args) {
      const eventStr = String(eventName);
      if (eventStr !== 'launch_data' && !eventStr.endsWith('_progress')) {
        logMessage(`[EML-Lib Event] ${eventStr} ${args.length > 0 ? JSON.stringify(args[0]) : ''}`);
      }
      return originalEmit(eventName, ...args);
    };

    launcher.on('launch_compute_download', () => {
      logMessage('[Progress 45%] กำลังตรวจสอบและคำนวณไฟล์เกม...');
      sendProgress('computing', 45, 'กำลังตรวจสอบและคำนวณไฟล์เกม...');
    });

    launcher.on('launch_download', (info) => {
      const amount = info?.total?.amount || 0;
      logMessage(`[Progress 50%] กำลังดาวน์โหลดไฟล์เกม (${amount} ไฟล์)`);
      sendProgress('downloading', 50, `กำลังดาวน์โหลดไฟล์เกม (${amount} ไฟล์)`);
    });

    launcher.on('launch_install_loader', (loaderInfo) => {
      logMessage(`[Progress 75%] กำลังติดตั้ง Mod Loader (${loaderInfo?.loader || 'Loader'})...`);
      sendProgress('install_loader', 75, `กำลังติดตั้ง Mod Loader (${loaderInfo?.loader || 'Loader'})...`);
    });

    launcher.on('launch_extract_natives', () => {
      logMessage('[Progress 85%] กำลังสกัดไฟล์ระบบ Natives...');
      sendProgress('natives', 85, 'กำลังสกัดไฟล์ระบบ Natives...');
    });

    launcher.on('launch_copy_assets', () => {
      logMessage('[Progress 90%] กำลังจัดเตรียมไฟล์ภาพและเสียง (Assets)...');
      sendProgress('assets', 90, 'กำลังจัดเตรียมไฟล์ภาพและเสียง (Assets)...');
    });

    launcher.on('launch_patch_loader', () => {
      logMessage('[Progress 95%] กำลังปรับแต่ง Mod Loader...');
      sendProgress('patching', 95, 'กำลังปรับแต่ง Mod Loader...');
    });

    launcher.on('launch_launch', () => {
      logMessage('[Progress 100%] เปิดเกมเรียบร้อยแล้ว!');
      logMessage('[Launcher] Minecraft game window process spawned successfully!');
      sendProgress('launched', 100, 'เปิดเกมเรียบร้อยแล้ว!');
    });

    launcher.on('launch_close', (code) => {
      logMessage(`[Launcher] Game process exited cleanly with code: ${code}`);
    });

    let lastLoggedPercent = -1;
    launcher.on('progress', (data) => {
      const rawPercent = typeof data === 'number' ? data : (data.percent || 0);
      const percent = Math.round(50 + rawPercent * 0.25); // Game Assets/Jars: 50% to 75%
      
      if (percent > lastLoggedPercent && percent % 5 === 0) {
        lastLoggedPercent = percent;
        logMessage(`[Progress ${percent}%] Downloading files... (${rawPercent}%)`);
      }

      sendProgress('downloading', percent, `กำลังดาวน์โหลดไฟล์เกม (${rawPercent || percent}%)`);
    });

    launcher.on('launch_data', (log) => {
      logMessage(`[Minecraft Game Log] ${log}`);
    });

    launcher.on('launch_crash', (crashData) => {
      logMessage(`[Minecraft Crash Detected] Exit Code: ${crashData.code}, Log: ${crashData.logsPath}`);
    });

    launcher.on('data', (log) => {
      logMessage(`[Minecraft Data] ${log}`);
    });

    // Step 6: Launch Minecraft Game Engine
    logMessage('[Launcher] Starting Minecraft process execution...');
    await launcher.launch();
  } catch (error) {
    console.error('Launch Game Failed:', error);
    if (mainWindow) {
      mainWindow.webContents.send('launch-progress', { status: 'error', percent: 0, text: `Error: ${error.message}` });
    }
  }
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// ลบโฟลเดอร์ namespace เกม (ใช้สำหรับติดตั้งใหม่)
ipcMain.handle('delete-namespace-folder', async (event, payload) => {
  try {
    const fs = require('fs');
    const folderNamespace = payload?.gameFolderNamespace || 'the_new_launcher';
    const cleanNamespace = folderNamespace.replace(/^\\.+/, '');
    const rootPath = path.join(app.getPath('appData'), `.${cleanNamespace}`);
    logMessage(`[Repair] Deleting namespace folder: ${rootPath}`);
    if (fs.existsSync(rootPath)) {
      fs.rmSync(rootPath, { recursive: true, force: true });
      logMessage(`[Repair] Namespace folder deleted successfully.`);
      return { success: true };
    } else {
      logMessage(`[Repair] Namespace folder not found (already clean): ${rootPath}`);
      return { success: true };
    }
  } catch (e) {
    logMessage(`[Repair] Failed to delete namespace folder: ${e.message}`);
    return { success: false, error: e.message };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Helper Function: ดาวน์โหลดไฟล์เสริม (Mods, Configs, Resourcepacks) จาก Web Server API (รองรับ manifest.json + SHA256 Hash)
async function downloadCustomServerFiles(apiDomain, rootPath, onProgress) {
  const fs = require('fs');
  const path = require('path');
  const crypto = require('crypto');

  // คำนวณ SHA256 Hash ของไฟล์ในเครื่อง
  const getFileHash = (filePath) => {
    try {
      if (!fs.existsSync(filePath)) return null;
      const fileBuffer = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (e) {
      return null;
    }
  };

  try {
    // ลองยิงไปที่ /minecraft/api/manifest.json ก่อน ถ้าไม่มีค่อย fallback ไปที่ /minecraft/api/files
    let manifestRes = await fetch(`${apiDomain}/minecraft/api/manifest.json`).catch(() => null);
    if (!manifestRes || !manifestRes.ok) {
      manifestRes = await fetch(`${apiDomain}/minecraft/api/files`).catch(() => null);
    }
    
    if (!manifestRes || !manifestRes.ok) return;

    const data = await manifestRes.json().catch(() => ({}));
    const files = data.files || []; // [{ path: "mods/mod1.jar", hash: "...", size: 1234, url: "http://..." }]
    if (!Array.isArray(files) || files.length === 0) return;

    // 1. สแกนและลบไฟล์แปลกปลอมในโฟลเดอร์ mods ที่ไม่อยู่ในรายการ manifest.json (ป้องกันผู้เล่นแอบแฮก/ใส่โปร)
    const allowedModPaths = new Set(
      files
        .map(f => f.path ? path.normalize(f.path).toLowerCase() : null)
        .filter(Boolean)
    );

    const modsDir = path.join(rootPath, 'mods');
    if (fs.existsSync(modsDir)) {
      const localModFiles = fs.readdirSync(modsDir, { recursive: true });
      for (const relativeFile of localModFiles) {
        const fullLocalPath = path.join(modsDir, relativeFile);
        const stat = fs.statSync(fullLocalPath);
        
        if (stat.isFile()) {
          const normalizedRelPath = path.normalize(`mods/${relativeFile}`).toLowerCase();
          // ถ้าไฟล์นี้ไม่อยู่ใน manifest.json ให้ลบทิ้งทันที!
          if (!allowedModPaths.has(normalizedRelPath)) {
            console.warn(`[Protection] Removing unauthorized mod/file: ${normalizedRelPath}`);
            try {
              fs.unlinkSync(fullLocalPath);
            } catch (err) {
              console.error(`[Protection] Failed to remove illegal file ${fullLocalPath}:`, err.message);
            }
          }
        }
      }
    }

    // 2. ดำเนินการตรวจสอบ Hash และดาวน์โหลดไฟล์ม็อดที่ถูกต้อง
    let completed = 0;
    for (const file of files) {
      if (!file.path || !file.url) continue;

      const targetPath = path.join(rootPath, file.path);
      const targetDir = path.dirname(targetPath);

      // ตรวจสอบ Hash ถ้าตรงกันอยู่แล้วไม่ต้องโหลดซ้ำ!
      if (file.hash) {
        const localHash = getFileHash(targetPath);
        if (localHash && localHash.toLowerCase() === file.hash.toLowerCase()) {
          console.log(`[Sync] Skip file (Hash matches): ${file.path}`);
          completed++;
          if (onProgress) onProgress(Math.round((completed / files.length) * 100));
          continue;
        }
      }

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // ดาวน์โหลดไฟล์ใหม่กรณีม็อดมีการอัปเดตหรือยังไม่มีไฟล์
      console.log(`[Sync] Downloading file: ${file.path} from ${file.url}`);
      const fileRes = await fetch(file.url).catch(() => null);
      if (fileRes && fileRes.ok) {
        const arrayBuffer = await fileRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(targetPath, buffer);
      }

      completed++;
      if (onProgress) {
        onProgress(Math.round((completed / files.length) * 100));
      }
    }
  } catch (err) {
    console.warn('[Launcher] Download custom server files warning:', err.message);
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
