// Configuration bundled at build-time (Developer Hardcoded Config)
// Supports local relative paths (e.g. 'assets/bg.png') or full HTTP/HTTPS URLs (e.g. 'https://domain.com/bg.webm')
const BUILD_CONFIG = {
  apiDomain: 'http://localhost:80', // Web Server API URL (e.g. 'http://localhost:3000' or 'https://api.yourserver.com')
  gameFolderNamespace: '.the_new_launcher', // Custom game folder name inside app installation directory

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
  logoIcon: 'JF', // Text logo (e.g. 'JF') or Image Path / URL (e.g. 'https://example.com/logo.png')

  // Server Identity (แสดงในหน้า Home)
  serverName: 'JUIMUIFUN SERVER', // ชื่อเซิร์ฟเวอร์ที่แสดงในหน้า Home
  serverDescription: [
    'ยินดีต้อนรับสู่ JuimuiFun Minecraft Server!',
    'ระบบจะอัปเดตไฟล์ Mod & Config อัตโนมัติ'
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
      maxRam: '4096',
      autoConnect: true
    };
  }

  loadUserSettings() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        return { ...this.getDefaultUserSettings(), ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load user settings from storage:', e);
    }
    return this.getDefaultUserSettings();
  }

  saveUserSettings(newSettings) {
    this.userSettings = { ...this.userSettings, ...newSettings };
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.userSettings));
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
    return BUILD_CONFIG.gameFolderNamespace || '.the_new_launcher';
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
}

const appConfig = new AppConfig();
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { appConfig, BUILD_CONFIG };
}
