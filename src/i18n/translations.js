const translations = {
  en: {
    appTitle: "The New Launcher",
    navHome: "Home",
    navForum: "Forum",
    navStore: "Store",
    navSetting: "Settings",
    navAuth: "Account",
    logout: "Sign Out",
    
    // Auth Page
    welcomeTitle: "Log in",
    createTitle: "Create account",
    welcomeSubtitle: "Log in to your launcher account to continue",
    tabLogin: "Log In",
    tabRegister: "Create Account",
    labelUsername: "USERNAME",
    labelEmail: "EMAIL ADDRESS",
    labelPassword: "PASSWORD",
    labelConfirmPassword: "CONFIRM PASSWORD",
    placeholderUsername: "USERNAME",
    placeholderEmail: "EMAIL ADDRESS",
    placeholderPassword: "PASSWORD",
    placeholderConfirmPassword: "CONFIRM PASSWORD",
    btnSubmitLogin: "Log In",
    btnSubmitRegister: "Register",
    staySignedIn: "Stay logged in",
    cantSignInOrCreate: "CAN'T LOG IN? / CREATE ACCOUNT",
    alreadyHaveAccountSignIn: "ALREADY HAVE AN ACCOUNT? LOG IN",
    
    // Auth Validation Messages
    errUserPassRequired: "Please enter username and password",
    errUserRequired: "Please enter username",
    errPassRequired: "Please enter password",
    errConfirmRequired: "Please confirm password",
    errPassMismatch: "Passwords do not match",
    errWrongPass: "Incorrect username or password",
    errUserTaken: "Username \"{name}\" is already taken",
    errApiConnection: "Unable to connect to Web API Server",
    
    // Home Page
    playNow: "PLAY NOW",
    btnRepairLauncher: "Repair Launcher & Client",
    serverStatus: "Server Status",
    online: "Online",
    offline: "Offline",
    playersOnline: "Players Online",
    labelOnlinePlayers: "Online Players",
    labelServerOffline: "Server Offline",
    labelPlayerRole: "Player",
    latestNews: "Latest Updates & News",
    welcomeUser: "Welcome, {name}!",
    readyToPlay: "Ready to jump into the adventure?",

    // Setting Page
    settingTitle: "Launcher Configuration",
    settingSubtitle: "Manage your launcher API backend, language, and client options",
    secGeneral: "General Settings",
    secApi: "API & Web Server",
    labelLanguage: "Interface Language",
    labelPrimaryColor: "Theme Accent Color",
    labelApiDomain: "Main Web Server API Domain",
    placeholderApiDomain: "https://api.yourserver.com",
    btnSaveSettings: "Save Settings",
    settingsSavedMessage: "Settings updated successfully!",

    // Update Modal
    updateReadyTitle: "Update Ready",
    updateModalDesc: "Version {version} downloaded. Restart now to install update.",
    btnRestartNow: "Restart Now",
    btnLater: "Later",

    // Repair Modal
    repairModalTitle: "System Repair",
    repairModalDesc: "Checking and repairing launcher & game client files...",
    btnClose: "OK",
  },
  th: {
    appTitle: "ตัวรันใหม่",
    navHome: "หน้าแรก",
    navForum: "เว็บบอร์ด",
    navStore: "ร้านค้า",
    navSetting: "ตั้งค่า",
    navAuth: "บัญชีผู้ใช้",
    logout: "ออกจากระบบ",
    
    // Auth Page
    welcomeTitle: "เข้าสู่ระบบ",
    createTitle: "สร้างบัญชีใหม่",
    welcomeSubtitle: "เข้าสู่ระบบเพื่อใช้งาน Launcher ของคุณ",
    tabLogin: "เข้าสู่ระบบ",
    tabRegister: "สมัครสมาชิก",
    labelUsername: "ชื่อผู้ใช้ (USERNAME)",
    labelEmail: "อีเมล (EMAIL)",
    labelPassword: "รหัสผ่าน (PASSWORD)",
    labelConfirmPassword: "ยืนยันรหัสผ่าน (CONFIRM PASSWORD)",
    placeholderUsername: "USERNAME",
    placeholderEmail: "EMAIL",
    placeholderPassword: "PASSWORD",
    placeholderConfirmPassword: "CONFIRM PASSWORD",
    btnSubmitLogin: "เข้าสู่ระบบ",
    btnSubmitRegister: "ลงทะเบียน",
    staySignedIn: "จดจำการเข้าสู่ระบบ",
    cantSignInOrCreate: "เข้าสู่ระบบไม่ได้? / สมัครสมาชิก",
    alreadyHaveAccountSignIn: "มีบัญชีอยู่แล้ว? เข้าสู่ระบบ",
    
    // Auth Validation Messages
    errUserPassRequired: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน",
    errUserRequired: "กรุณากรอกชื่อผู้ใช้",
    errPassRequired: "กรุณากรอกรหัสผ่าน",
    errConfirmRequired: "กรุณายืนยันรหัสผ่าน",
    errPassMismatch: "รหัสผ่านไม่ตรงกัน",
    errWrongPass: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
    errUserTaken: "ชื่อผู้ใช้ \"{name}\" มีผู้ใช้งานแล้ว",
    errApiConnection: "ไม่สามารถเชื่อมต่อ Web API Server ได้",
    
    // Home Page
    playNow: "เริ่มเกม",
    btnRepairLauncher: "ซ่อมแซม Launcher และตัวเกม",
    serverStatus: "สถานะเซิร์ฟเวอร์",
    online: "เปิดใช้งาน",
    offline: "ปิดปรับปรุง",
    playersOnline: "ผู้เล่นออนไลน์",
    labelOnlinePlayers: "ผู้เล่นออนไลน์",
    labelServerOffline: "เซิร์ฟปิด",
    labelPlayerRole: "ผู้เล่น",
    latestNews: "ข่าวสารและอัปเดตล่าสุด",
    welcomeUser: "ยินดีต้อนรับคุณ {name}!",
    readyToPlay: "พร้อมสำหรับการผจญภัยหรือยัง?",

    // Setting Page
    settingTitle: "ตั้งค่า Launcher",
    settingSubtitle: "จัดการโดเมน Web API ภาษา และตัวเลือกการทำงาน",
    secGeneral: "การตั้งค่าทั่วไป",
    secApi: "การเชื่อมต่อ API & Web Server",
    labelLanguage: "ภาษาของเมนู",
    labelPrimaryColor: "โทนสีของแอป (Accent Color)",
    labelApiDomain: "โดเมน Web Server API หลัก",
    placeholderApiDomain: "https://api.yourserver.com",
    btnSaveSettings: "บันทึกการตั้งค่า",
    settingsSavedMessage: "บันทึกการตั้งค่าเรียบร้อยแล้ว!",

    // Update Modal
    updateReadyTitle: "มีอัปเดตใหม่พร้อมใช้งาน",
    updateModalDesc: "ดาวน์โหลดเวอร์ชัน {version} เรียบร้อยแล้ว รีสตาร์ทตอนนี้เพื่อทำการติดตั้ง",
    btnRestartNow: "รีสตาร์ทตอนนี้",
    btnLater: "ภายหลัง",

    // Repair Modal
    repairModalTitle: "ซ่อมแซมระบบ",
    repairModalDesc: "ระบบกำลังทำการตรวจสอบและซ่อมแซมไฟล์เกม / Launcher...",
    btnClose: "ตกลง",
  }
};

class I18nManager {
  constructor() {
    this.currentLang = localStorage.getItem('app_language') || 'en';
    this.listeners = [];
  }

  setLanguage(lang) {
    if (translations[lang]) {
      this.currentLang = lang;
      localStorage.setItem('app_language', lang);
      this.notifyListeners();
    }
  }

  getLanguage() {
    return this.currentLang;
  }

  t(key, params = {}) {
    const langDict = translations[this.currentLang] || translations.en;
    let text = langDict[key] || translations.en[key] || key;

    Object.keys(params).forEach(pKey => {
      text = text.replace(`{${pKey}}`, params[pKey]);
    });

    return text;
  }

  subscribe(callback) {
    this.listeners.push(callback);
  }

  notifyListeners() {
    this.listeners.forEach(cb => cb(this.currentLang));
  }
}

const i18n = new I18nManager();
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { i18n, translations };
}
