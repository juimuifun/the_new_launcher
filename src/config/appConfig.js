// Configuration bundled at build-time (Developer Hardcoded Config)
// Supports local relative paths (e.g. 'assets/bg.png') or full HTTP/HTTPS URLs (e.g. 'https://domain.com/bg.webm')
const BUILD_CONFIG = {
  apiDomain: 'https://minecrad.com', // Web Server API URL (e.g. 'http://localhost:3000' or 'https://api.yourserver.com')
  gameFolderNamespace: '.minecrad', // Custom game folder name inside app installation directory

  // รายการโฟลเดอร์/ไฟล์ที่ไม่ต้องการให้ EML-Lib ลบทิ้งตอนสแกนคลีนก่อนรันเกม
  cleaningIgnored: [
    'mods/',
    'config/authxcheck_client.json',
    'crash-reports/',
    'logs/',
    'resourcepacks/',
    'resources/',
    'saves/',
    'shaderpacks/',
    'options.txt',
    'optionsof.txt'
  ],

  primaryColor: '#8b5cf6', // Default accent color (purple)
  bgVideo: 'assets/videos/bg.webm', // Local path or URL (e.g. 'https://example.com/video.webm')
  bgImage: 'assets/bg.png', // Local path or URL (e.g. 'https://example.com/bg.png')
  logoIcon: 'M', // Text logo (e.g. 'JF') or Image Path / URL (e.g. 'https://example.com/logo.png')

  // Server Identity (แสดงในหน้า Home)
  serverName: 'MINECRAD', // ชื่อเซิร์ฟเวอร์ที่แสดงในหน้า Home
  serverDescription: [
    'ยินดีต้อนรับสู่ Minecrad Server!',
    'SWORD ART ONLINE'
  ], // คำอธิบายเซิร์ฟเวอร์ (ใส่หลายบรรทัดได้)

  // Font Configs
  fontHeadingPath: 'assets/fonts/NEXON Football Gothic B.otf', // Primary heading font
  fontHeadingName: 'NexonFootballGothic',
  fontBodyPath: 'assets/fonts/EkkamaiVibe-Regular.ttf', // Body & input font
  fontBodyName: 'EkkamaiVibe'
};

class AppConfig {
  constructor() {
    this.STORAGE_KEY = 'launcher_user_settings';
    this.userSettings = this.loadUserSettings();
  }

  getDefaultUserSettings() {
    return {
      language: 'en',
      maxRam: 4096,
      fullscreen: false,
      windowWidth: 854,
      windowHeight: 480,
      autoConnect: true
    };
  }

  loadUserSettings() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
          return { ...this.getDefaultUserSettings(), ...JSON.parse(saved) };
        }
      }
    } catch (e) {
      console.error('Failed to load user settings from storage:', e);
    }
    return this.getDefaultUserSettings();
  }

  saveUserSettings(newSettings) {
    this.userSettings = { ...this.userSettings, ...newSettings };
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.userSettings));
      }
    } catch (e) {
      console.error('Failed to save user settings to storage:', e);
    }
    return this.userSettings;
  }

  get apiDomain() {
    let domain = BUILD_CONFIG.apiDomain || 'http://localhost:3000';
    domain = domain.trim().replace(/\/+$/, ''); // Remove trailing slash
    if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
      domain = `http://${domain}`;
    }
    return domain;
  }

  get gameFolderNamespace() {
    return BUILD_CONFIG.gameFolderNamespace || '.minecrad';
  }

  get cleaningIgnored() {
    return BUILD_CONFIG.cleaningIgnored || [
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
  }

  get serverName() {
    return BUILD_CONFIG.serverName || 'MINECRAFT SERVER';
  }

  get serverDescription() {
    const desc = BUILD_CONFIG.serverDescription;
    if (Array.isArray(desc)) return desc;
    if (typeof desc === 'string') return [desc];
    return [];
  }

  get primaryColor() {
    return BUILD_CONFIG.primaryColor;
  }

  get bgVideo() {
    return BUILD_CONFIG.bgVideo;
  }

  get bgImage() {
    return BUILD_CONFIG.bgImage;
  }

  get logoIcon() {
    return BUILD_CONFIG.logoIcon;
  }

  get fontHeadingPath() {
    return BUILD_CONFIG.fontHeadingPath;
  }

  get fontHeadingName() {
    return BUILD_CONFIG.fontHeadingName;
  }

  get fontBodyPath() {
    return BUILD_CONFIG.fontBodyPath;
  }

  get fontBodyName() {
    return BUILD_CONFIG.fontBodyName;
  }

  get language() {
    return this.userSettings.language || 'en';
  }

  get maxRam() {
    return parseInt(this.userSettings.maxRam) || 4096;
  }

  get fullscreen() {
    return !!this.userSettings.fullscreen;
  }

  get windowWidth() {
    return parseInt(this.userSettings.windowWidth) || 854;
  }

  get windowHeight() {
    return parseInt(this.userSettings.windowHeight) || 480;
  }
}

const appConfig = new AppConfig();
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { appConfig, BUILD_CONFIG };
}
