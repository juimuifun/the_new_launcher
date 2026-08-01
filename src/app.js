class AppUI {
  constructor() {
    this.currentUser = JSON.parse(localStorage.getItem('launcher_user')) || null;
    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.bindWindowControls();
      this.bindEvents();
      this.applyCustomFont();
      this.applyThemeColor(appConfig.primaryColor);
      this.applyBackgroundMedia();
      this.applyLogoIcon();
      this.updateTranslations();
      this.loadSettingsForm();
      this.updateUserDisplay();
      this.initAutoUpdater();

      // Force Auth View as default initial screen
      this.switchView('view-auth');

      i18n.subscribe(() => {
        this.updateTranslations();
      });
    });
  }

  applyCustomFont() {
    if (appConfig.fontPath && appConfig.fontName) {
      const fontFace = new FontFace(appConfig.fontName, `url('${appConfig.fontPath}')`);
      fontFace.load().then(loadedFont => {
        document.fonts.add(loadedFont);
        document.body.style.fontFamily = `'${appConfig.fontName}', sans-serif`;
      }).catch(err => {
        console.warn('Failed to load custom font:', err);
      });
    }
  }

  applyBackgroundMedia() {
    const videoEl = document.getElementById('bg-video');
    const imageEl = document.getElementById('bg-image');

    if (appConfig.bgVideo && videoEl) {
      videoEl.src = appConfig.bgVideo;
      videoEl.classList.remove('hidden');
      videoEl.play().catch(e => {
        console.warn('Auto-play video prevented or failed:', e);
        if (imageEl && appConfig.bgImage) {
          imageEl.style.backgroundImage = `url('${appConfig.bgImage}')`;
          imageEl.classList.remove('hidden');
        }
      });
    } else if (imageEl && appConfig.bgImage) {
      imageEl.style.backgroundImage = `url('${appConfig.bgImage}')`;
      imageEl.classList.remove('hidden');
    }
  }

  applyLogoIcon() {
    const logoText = document.getElementById('logo-text');
    const logoImg = document.getElementById('logo-img');
    const val = appConfig.logoIcon;

    if (!val) return;

    // Check if value is a URL, image path or file extension
    const isImage = val.startsWith('http://') || 
                    val.startsWith('https://') || 
                    val.startsWith('data:') || 
                    val.includes('/') || 
                    val.includes('\\') || 
                    /\.(png|jpg|jpeg|svg|webp|gif)$/i.test(val);

    if (isImage) {
      if (logoImg) {
        logoImg.src = val;
        logoImg.classList.remove('hidden');
      }
      if (logoText) logoText.classList.add('hidden');
    } else {
      if (logoText) {
        logoText.innerText = val;
        logoText.classList.remove('hidden');
      }
      if (logoImg) logoImg.classList.add('hidden');
    }
  }

  bindWindowControls() {
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      const btnMin = document.getElementById('win-btn-minimize');
      const btnClose = document.getElementById('win-btn-close');

      if (btnMin) {
        btnMin.addEventListener('click', () => ipcRenderer.send('window-minimize'));
      }
      if (btnClose) {
        btnClose.addEventListener('click', () => ipcRenderer.send('window-close'));
      }
    }
  }

  initAutoUpdater() {
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      const statusBanner = document.getElementById('updater-status-banner');
      const statusText = document.getElementById('updater-status-text');
      const progressBar = document.getElementById('updater-progress-bar');
      const progressContainer = document.getElementById('updater-progress-container');

      ipcRenderer.on('updater-message', (event, data) => {
        if (statusBanner && statusText) {
          statusBanner.classList.remove('hidden');
          statusText.innerText = data.message;

          if (data.status === 'downloaded') {
            statusBanner.className = 'mb-4 p-3 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between';
          } else if (data.status === 'error') {
            statusBanner.className = 'mb-4 p-3 rounded-xl border bg-rose-500/10 border-rose-500/30 text-rose-400 text-xs flex items-center justify-between';
          } else {
            statusBanner.className = 'mb-4 p-3 rounded-xl border bg-purple-500/10 border-purple-500/30 text-purple-400 text-xs flex items-center justify-between';
          }
        }
      });

      ipcRenderer.on('updater-progress', (event, data) => {
        if (progressContainer && progressBar) {
          progressContainer.classList.remove('hidden');
          progressBar.style.width = `${data.percent}%`;
        }
      });

      const btnCheckUpdate = document.getElementById('btn-check-update');
      if (btnCheckUpdate) {
        btnCheckUpdate.addEventListener('click', () => {
          ipcRenderer.send('check-for-update-manual');
        });
      }
    }
  }

  bindEvents() {
    // View navigation buttons
    document.querySelectorAll('[data-target-view]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-target-view');
        this.switchView(target);
      });
    });

    // Toggle between Sign In & Create Account
    const toggleToRegister = document.getElementById('toggle-to-register');
    const toggleToLogin = document.getElementById('toggle-to-login');
    const formLoginContainer = document.getElementById('form-login-container');
    const formRegisterContainer = document.getElementById('form-register-container');
    const btnLoginWrap = document.getElementById('btn-login-wrap');
    const btnRegisterWrap = document.getElementById('btn-register-wrap');

    if (toggleToRegister && toggleToLogin) {
      toggleToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        this.clearAlert();
        formLoginContainer.classList.add('hidden');
        formRegisterContainer.classList.remove('hidden');
        btnLoginWrap.classList.add('hidden');
        btnRegisterWrap.classList.remove('hidden');
        toggleToRegister.classList.add('hidden');
        toggleToLogin.classList.remove('hidden');
      });

      toggleToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        this.clearAlert();
        formRegisterContainer.classList.add('hidden');
        formLoginContainer.classList.remove('hidden');
        btnRegisterWrap.classList.add('hidden');
        btnLoginWrap.classList.remove('hidden');
        toggleToLogin.classList.add('hidden');
        toggleToRegister.classList.remove('hidden');
      });
    }

    // Login Button Submit
    const btnLoginSubmit = document.getElementById('btn-login-submit');
    if (btnLoginSubmit) {
      btnLoginSubmit.addEventListener('click', () => {
        const username = document.getElementById('input-login-user').value.trim();
        const password = document.getElementById('input-login-pass').value;

        if (!username && !password) {
          return this.showAlert(i18n.t('errUserPassRequired'));
        }
        if (!username) {
          return this.showAlert(i18n.t('errUserRequired'));
        }
        if (!password) {
          return this.showAlert(i18n.t('errPassRequired'));
        }

        // Check saved users
        const savedUsers = JSON.parse(localStorage.getItem('launcher_users') || '{}');
        if (savedUsers[username] && savedUsers[username] !== password) {
          return this.showAlert(i18n.t('errWrongPass'));
        }

        this.clearAlert();
        this.currentUser = { name: username, loggedInAt: new Date().toISOString() };
        localStorage.setItem('launcher_user', JSON.stringify(this.currentUser));
        this.updateUserDisplay();
        this.switchView('view-home');
      });
    }

    // Register Button Submit
    const btnRegisterSubmit = document.getElementById('btn-register-submit');
    if (btnRegisterSubmit) {
      btnRegisterSubmit.addEventListener('click', () => {
        const username = document.getElementById('input-reg-user').value.trim();
        const password = document.getElementById('input-reg-pass').value;
        const confirm = document.getElementById('input-reg-confirm').value;

        if (!username && !password) {
          return this.showAlert(i18n.t('errUserPassRequired'));
        }
        if (!username) {
          return this.showAlert(i18n.t('errUserRequired'));
        }
        if (!password) {
          return this.showAlert(i18n.t('errPassRequired'));
        }
        if (!confirm) {
          return this.showAlert(i18n.t('errConfirmRequired'));
        }
        if (password !== confirm) {
          return this.showAlert(i18n.t('errPassMismatch'));
        }

        // Check duplicate username
        const savedUsers = JSON.parse(localStorage.getItem('launcher_users') || '{}');
        if (savedUsers[username]) {
          return this.showAlert(i18n.t('errUserTaken', { name: username }));
        }

        // Save new user
        savedUsers[username] = password;
        localStorage.setItem('launcher_users', JSON.stringify(savedUsers));

        this.clearAlert();
        this.currentUser = { name: username, loggedInAt: new Date().toISOString() };
        localStorage.setItem('launcher_user', JSON.stringify(this.currentUser));
        this.updateUserDisplay();
        this.switchView('view-home');
      });
    }

    // Logout Action
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        this.currentUser = null;
        localStorage.removeItem('launcher_user');
        this.updateUserDisplay();
        this.switchView('view-auth');
      });
    }

    // Settings Save Action
    const formSettings = document.getElementById('form-settings');
    if (formSettings) {
      formSettings.addEventListener('submit', (e) => {
        e.preventDefault();
        const lang = document.getElementById('setting-language').value;

        appConfig.saveUserSettings({ language: lang });
        i18n.setLanguage(lang);

        const alertMsg = document.getElementById('settings-alert');
        if (alertMsg) {
          alertMsg.classList.remove('hidden');
          setTimeout(() => alertMsg.classList.add('hidden'), 3000);
        }
      });
    }

    // Language Selector directly in settings
    const langSelect = document.getElementById('setting-language');
    if (langSelect) {
      langSelect.addEventListener('change', (e) => {
        i18n.setLanguage(e.target.value);
      });
    }
  }

  showAlert(message) {
    const alertBox = document.getElementById('auth-alert');
    const alertText = document.getElementById('auth-alert-text');
    if (alertBox && alertText) {
      alertText.textContent = message;
      alertBox.classList.remove('hidden');
    }
  }

  clearAlert() {
    const alertBox = document.getElementById('auth-alert');
    if (alertBox) {
      alertBox.classList.add('hidden');
    }
  }

  applyThemeColor(colorHex) {
    document.documentElement.style.setProperty('--primary-color', colorHex);
  }

  switchView(viewId) {
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.add('hidden');
    });

    const targetView = document.getElementById(viewId);
    if (targetView) {
      targetView.classList.remove('hidden');
    }
  }

  loadSettingsForm() {
    const langSelect = document.getElementById('setting-language');
    if (langSelect) langSelect.value = i18n.getLanguage();
  }

  updateUserDisplay() {
    const userNameEl = document.getElementById('home-username');
    if (this.currentUser) {
      if (userNameEl) userNameEl.innerText = i18n.t('welcomeUser', { name: this.currentUser.name });
    } else {
      if (userNameEl) userNameEl.innerText = i18n.t('welcomeUser', { name: 'Player' });
    }
  }

  updateTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.innerText = i18n.t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = i18n.t(key);
    });

    this.updateUserDisplay();
  }
}

const appUI = new AppUI();
