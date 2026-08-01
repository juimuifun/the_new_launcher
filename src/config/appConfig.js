// Configuration bundled at build-time (Developer Hardcoded Config)
// Supports local relative paths (e.g. 'assets/bg.png') or full HTTP/HTTPS URLs (e.g. 'https://domain.com/bg.webm')
const BUILD_CONFIG = {
  apiDomain: 'https://api.yourserver.com',
  primaryColor: '#8b5cf6', // Default accent color (purple)
  bgVideo: 'assets/videos/bg.webm', // Local path or URL (e.g. 'https://example.com/video.webm')
  bgImage: 'assets/bg.png', // Local path or URL (e.g. 'https://example.com/bg.png')
  logoIcon: 'JF', // Text logo (e.g. 'JF') or Image Path / URL (e.g. 'https://example.com/logo.png')
  fontPath: 'assets/fonts/NEXON Football Gothic B.otf', // Local path or URL (e.g. 'https://example.com/font.ttf')
  fontName: 'NexonFootballGothic'
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
    return BUILD_CONFIG.apiDomain;
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

  get fontPath() {
    return BUILD_CONFIG.fontPath;
  }

  get fontName() {
    return BUILD_CONFIG.fontName;
  }

  get language() {
    return this.userSettings.language || 'en';
  }
}

const appConfig = new AppConfig();
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { appConfig, BUILD_CONFIG };
}
