const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');

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
      // ส่งข้อความกลับไปที่ UI เพื่อบอกว่าไม่ต้องรอเช็คอัปเดต
      if (mainWindow) {
        mainWindow.webContents.send('updater-message', {
          status: 'not-available'
        });
      }
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

// IPC Handler to get app version
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// IPC Handler to check if game namespace folder exists
ipcMain.handle('check-namespace-exists', (event, folderNamespace) => {
  try {
    const cleanNamespace = (folderNamespace || 'the_new_launcher').replace(/^\.+/, '');
    const rootPath = path.join(app.getPath('appData'), `.${cleanNamespace}`);
    return fs.existsSync(rootPath);
  } catch (e) {
    return false;
  }
});

// ----------------------------------------------------
// EML-Lib Minecraft Launching & Status System
// ----------------------------------------------------
const path = require('path');

// Helper Function: ป้องกันและแก้ปัญหา ENOTDIR โดยการตรวจสอบและลบไฟล์ที่ขวางโฟลเดอร์ในทุกระดับ Subpath
function ensureDirSafe(targetPath) {
  try {
    if (!targetPath) return;
    const normalized = path.normalize(targetPath);
    const root = path.parse(normalized).root;
    const segments = normalized.replace(root, '').split(path.sep).filter(Boolean);

    let current = root;
    for (const segment of segments) {
      current = path.join(current, segment);
      try {
        if (fs.existsSync(current)) {
          try {
            const stat = fs.statSync(current);
            if (!stat.isDirectory()) {
              console.warn(`[ENOTDIR Protection] Found file where directory expected, removing: ${current}`);
              fs.rmSync(current, { force: true, recursive: true });
              fs.mkdirSync(current, { recursive: true });
            }
          } catch (statErr) {
            // หากติด File Lock / EPERM หรือ statSync ล้มเหลว ให้ละเว้นกรณีโฟลเดอร์มีอยู่แล้ว
          }
        } else {
          fs.mkdirSync(current, { recursive: true });
        }
      } catch (e) { }
    }
  } catch (err) {
    console.warn(`[ENOTDIR Protection] ensureDirSafe error for ${targetPath}:`, err.message);
    try {
      if (fs.existsSync(targetPath)) {
        const stat = fs.statSync(targetPath);
        if (!stat.isDirectory()) {
          fs.rmSync(targetPath, { force: true, recursive: true });
        }
      }
      fs.mkdirSync(targetPath, { recursive: true });
    } catch (e) { }
  }
}

let isGameRunning = false;

ipcMain.on('launch-game', async (event, userPayload) => {
  if (isGameRunning) {
    console.warn('[Launcher] Prevented duplicate game launch attempt.');
    if (mainWindow) {
      mainWindow.webContents.send('launch-progress', {
        status: 'error',
        percent: 0,
        text: 'เกมกำลังทำงานอยู่ ไม่สามารถเปิดซ้อนหลายจอได้'
      });
    }
    return;
  }

  isGameRunning = true;

  try {
    const { Launcher, Java, CrackAuth, ServerStatus } = await import('eml-lib');
    const apiDomain = userPayload.apiDomain || 'http://localhost:3000';
    const folderNamespace = (userPayload.gameFolderNamespace || 'the_new_launcher').replace(/^\.+/, '');

    // Game directory path (e.g., %APPDATA%/.the_new_launcher)
    const rootPath = path.join(app.getPath('appData'), `.${folderNamespace}`);

    // Prevent ENOTDIR by ensuring rootPath and all standard Minecraft subdirectories are valid folders
    ensureDirSafe(rootPath);
    const standardDirs = ['assets', 'libraries', 'versions', 'natives', 'mods', 'config', 'runtime', 'saves', 'resourcepacks', 'shaderpacks'];
    for (const dirName of standardDirs) {
      ensureDirSafe(path.join(rootPath, dirName));
    }

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

    // Step 0: Re-authenticate to get a fresh (One-Time) accessToken before launch
    let freshAccessToken = userPayload.accessToken || 'offline_token';
    if (userPayload.username && userPayload.password) {
      sendProgress('authenticating', 5, 'กำลังยืนยันตัวตนอีกครั้ง...');
      try {
        const loginEndpoint = `${apiDomain}/minecraft/api/login`;
        const response = await fetch(loginEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: userPayload.username, password: userPayload.password })
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.success) {
          const userObj = data.user || data.data || data;
          freshAccessToken = userObj.accessToken || userObj.token || 'offline_token';
          console.log(`[Auth] Successfully obtained fresh accessToken for '${userPayload.username}'`);
        }
      } catch (e) {
        console.warn('[Auth] Failed to get fresh accessToken, will use cached one. Error:', e.message);
        // Fallback to cached token if re-auth fails
      }
    }

    // บันทึก/อัปเดตไฟล์ config/authxcheck_client.json ทันที
    saveAuthXCheckConfig(userPayload.username || 'Player', freshAccessToken, folderNamespace);

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
      accessToken: freshAccessToken,
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

    // Setup File Logger inside User Data Directory
    const logsDir = path.join(app.getPath('userData'), 'logs');
    ensureDirSafe(logsDir);
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
      'config/',
      'config/authxcheck_client.json',
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
        max: parseInt(userPayload.maxRam) || 4096,
        min: 1024
      },
      window: {
        width: parseInt(userPayload.windowWidth) || 854,
        height: parseInt(userPayload.windowHeight) || 480,
        fullscreen: !!userPayload.fullscreen
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
      logMessage('[Progress 45%] Computing and verifying game files...');
      sendProgress('computing', 45, 'Computing game files...');
    });

    launcher.on('launch_download', (info) => {
      const amount = info?.total?.amount || 0;
      logMessage(`[Progress 50%] Downloading game files (${amount} files)...`);
      sendProgress('downloading', 50, `Downloading game files (${amount} files)...`);
    });

    launcher.on('launch_install_loader', (loaderInfo) => {
      logMessage(`[Progress 75%] Installing Mod Loader (${loaderInfo?.loader || 'Loader'})...`);
      sendProgress('install_loader', 75, `Installing Mod Loader (${loaderInfo?.loader || 'Loader'})...`);
    });

    launcher.on('launch_extract_natives', () => {
      logMessage('[Progress 85%] Extracting Natives...');
      sendProgress('natives', 85, 'Extracting Natives...');
    });

    launcher.on('launch_copy_assets', () => {
      logMessage('[Progress 90%] Preparing Game Assets...');
      sendProgress('assets', 90, 'Preparing Game Assets...');
    });

    launcher.on('launch_patch_loader', () => {
      logMessage('[Progress 95%] Patching Mod Loader...');
      sendProgress('patching', 95, 'Patching Mod Loader...');
    });

    launcher.on('launch_launch', () => {
      logMessage('[Progress 100%] Game Launched Successfully!');
      logMessage('[Launcher] Minecraft game window process spawned successfully!');
      sendProgress('launched', 100, 'Game Launched!');
      if (mainWindow) {
        mainWindow.webContents.send('game-status-changed', { isRunning: true });
      }
    });

    launcher.on('launch_close', (code) => {
      logMessage(`[Launcher] Game process exited cleanly with code: ${code}`);
      isGameRunning = false;
      if (mainWindow) {
        mainWindow.webContents.send('game-status-changed', { isRunning: false });
      }
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
      isGameRunning = false;
      if (mainWindow) {
        mainWindow.webContents.send('game-status-changed', { isRunning: false });
      }
    });

    launcher.on('data', (log) => {
      logMessage(`[Minecraft Data] ${log}`);
    });

    // Step 6: Launch Minecraft Game Engine
    logMessage('[Launcher] Starting Minecraft process execution...');
    await launcher.launch();
  } catch (error) {
    isGameRunning = false;
    if (mainWindow) {
      mainWindow.webContents.send('game-status-changed', { isRunning: false });
    }
    console.error('Launch Game Failed:', error);
    if (mainWindow) {
      mainWindow.webContents.send('launch-progress', { status: 'error', percent: 0, text: `Error: ${error.message}` });
    }
  }
});

// ฟังก์ชันและ IPC บันทึก/อัปเดตไฟล์ config/authxcheck_client.json
function saveAuthXCheckConfig(username, accessToken, folderNamespace = 'the_new_launcher') {
  try {
    const cleanNamespace = (folderNamespace || 'the_new_launcher').replace(/^\.+/, '');
    const rootPath = path.join(app.getPath('appData'), `.${cleanNamespace}`);
    const configDir = path.join(rootPath, 'config');
    ensureDirSafe(configDir);
    const authxCheckPath = path.join(configDir, 'authxcheck_client.json');
    let authxData = { secretKey: accessToken || 'offline_token', username: username || 'Player' };
    if (fs.existsSync(authxCheckPath)) {
      try {
        const existingContent = JSON.parse(fs.readFileSync(authxCheckPath, 'utf8'));
        authxData = { ...existingContent, username: username || 'Player', secretKey: accessToken || 'offline_token' };
      } catch (e) {
        // ใช้ค่าเริ่มต้นหากอ่านไฟล์เดิมไม่สำเร็จ
      }
    }
    fs.writeFileSync(authxCheckPath, JSON.stringify(authxData, null, 2));
    console.log(`[AuthXCheck] Saved client config upon login to: ${authxCheckPath}`);
  } catch (err) {
    console.warn('[AuthXCheck] Failed to save authxcheck_client.json:', err.message);
  }
}

ipcMain.on('save-authxcheck-config', (event, payload) => {
  saveAuthXCheckConfig(payload?.username, payload?.accessToken, payload?.gameFolderNamespace);
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// ลบโฟลเดอร์ namespace เกม (ใช้สำหรับติดตั้งใหม่)
ipcMain.handle('delete-namespace-folder', async (event) => {
  try {
    const { BUILD_CONFIG } = require('./src/config/appConfig');
    const gameFolderNamespace = BUILD_CONFIG.gameFolderNamespace || '.the_new_launcher';
    const cleanNamespace = gameFolderNamespace.replace(/^\.+/, '');
    const rootPath = path.join(app.getPath('appData'), `.${cleanNamespace}`);
    console.log(`[Repair] Deleting namespace folder: ${rootPath}`);
    if (fs.existsSync(rootPath)) {
      fs.rmSync(rootPath, { recursive: true, force: true });
      console.log(`[Repair] Namespace folder deleted successfully.`);
      return { success: true };
    } else {
      console.log(`[Repair] Namespace folder not found (already clean): ${rootPath}`);
      return { success: true };
    }
  } catch (e) {
    console.error(`[Repair] Failed to delete namespace folder: ${e.message}`);
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

// Helper Function: ดาวน์โหลดไฟล์เสริม (Mods, Configs, Resourcepacks) จาก Web Server API (รองรับ manifest.json + SHA256 Hash + ป้องกัน ENOTDIR)
async function downloadCustomServerFiles(apiDomain, rootPath, onProgress) {
  const path = require('path');
  const crypto = require('crypto');

  // คำนวณ SHA256 Hash ของไฟล์ในเครื่อง
  const getFileHash = (filePath) => {
    try {
      if (!fs.existsSync(filePath)) return null;
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) return null;
      const fileBuffer = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (e) {
      return null;
    }
  };

  try {
    ensureDirSafe(rootPath);

    // ลองยิงไปที่ /minecraft/api/manifest.json ก่อน ถ้าไม่มีค่อย fallback ไปที่ /minecraft/api/files
    let manifestRes = await fetch(`${apiDomain}/minecraft/api/manifest.json`).catch(() => null);
    if (!manifestRes || !manifestRes.ok) {
      manifestRes = await fetch(`${apiDomain}/minecraft/api/files`).catch(() => null);
    }

    if (!manifestRes || !manifestRes.ok) return;

    const data = await manifestRes.json().catch(() => ({}));
    const files = data.files || []; // [{ path: "mods/mod1.jar", hash: "...", size: 1234, url: "http://..." }]
    if (!Array.isArray(files) || files.length === 0) return;

    // 1. สแกนและลบไฟล์แปลกปลอมในโฟลเดอร์ mods ที่ไม่อยู่ในรายการ manifest.json
    const allowedModPaths = new Set(
      files
        .map(f => f.path ? path.normalize(f.path).replace(/\\/g, '/').toLowerCase() : null)
        .filter(Boolean)
    );

    const modsDir = path.join(rootPath, 'mods');
    if (fs.existsSync(modsDir)) {
      const modsStat = fs.statSync(modsDir);
      if (modsStat.isDirectory()) {
        const localModFiles = fs.readdirSync(modsDir, { recursive: true });
        for (const relativeFile of localModFiles) {
          const fullLocalPath = path.join(modsDir, relativeFile);
          try {
            const stat = fs.statSync(fullLocalPath);
            if (stat.isFile()) {
              const normalizedRelPath = path.normalize(`mods/${relativeFile}`).replace(/\\/g, '/').toLowerCase();
              if (!allowedModPaths.has(normalizedRelPath)) {
                console.warn(`[Protection] Removing unauthorized mod/file: ${normalizedRelPath}`);
                fs.unlinkSync(fullLocalPath);
              }
            }
          } catch (err) {
            // ละเว้นหากไฟล์ถูกเคลื่อนย้ายไปแล้ว
          }
        }
      } else {
        // หาก mods เป็นไฟล์ ให้ลบทิ้งเพื่อเตรียมสร้างโฟลเดอร์ mods
        fs.unlinkSync(modsDir);
      }
    }

    // 2. ดำเนินการตรวจสอบ Hash และดาวน์โหลดไฟล์ม็อดที่ถูกต้อง
    let completed = 0;
    for (const file of files) {
      if (!file.path) continue;

      const normalizedRelPath = path.normalize(file.path.replace(/\\/g, '/'));
      const targetPath = path.join(rootPath, normalizedRelPath);

      // หากรายการใน manifest เป็นการประกาศโฟลเดอร์
      if (file.path.endsWith('/') || file.path.endsWith('\\') || file.type === 'FOLDER' || file.type === 'directory') {
        ensureDirSafe(targetPath);
        completed++;
        if (onProgress) onProgress(Math.round((completed / files.length) * 100));
        continue;
      }

      const targetDir = path.dirname(targetPath);
      ensureDirSafe(targetDir);

      if (!file.url) {
        completed++;
        if (onProgress) onProgress(Math.round((completed / files.length) * 100));
        continue;
      }

      // ตรวจสอบ Hash ถ้าตรงกันอยู่แล้วไม่ต้องโหลดซ้ำ
      if (file.hash) {
        const localHash = getFileHash(targetPath);
        if (localHash && localHash.toLowerCase() === file.hash.toLowerCase()) {
          console.log(`[Sync] Skip file (Hash matches): ${file.path}`);
          completed++;
          if (onProgress) onProgress(Math.round((completed / files.length) * 100));
          continue;
        }
      }

      // หากมีโฟลเดอร์ชื่อเดียวกับไฟล์ปลายทางขวางอยู่ ให้ลบทิ้งก่อนเซฟไฟล์
      if (fs.existsSync(targetPath)) {
        const targetStat = fs.statSync(targetPath);
        if (targetStat.isDirectory()) {
          fs.rmSync(targetPath, { recursive: true, force: true });
        }
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
