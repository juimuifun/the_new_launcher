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
      this.updatePlayButtonState();

      if (window.require) {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.on('game-status-changed', (event, data) => {
          this.isGameRunning = data.isRunning;
          this.updatePlayButtonState();
        });
      }

      i18n.subscribe(() => {
        this.updateTranslations();
      });
    });
  }

  applyCustomFont() {
    // Load Heading Font
    if (appConfig.fontHeadingPath && appConfig.fontHeadingName) {
      const headingFont = new FontFace(appConfig.fontHeadingName, `url('${appConfig.fontHeadingPath}')`);
      headingFont.load().then(loadedFont => {
        document.fonts.add(loadedFont);
        document.documentElement.style.setProperty('--font-heading', `'${appConfig.fontHeadingName}', sans-serif`);
      }).catch(err => {
        console.warn('Failed to load heading font:', err);
      });
    }

    // Load Body Font
    if (appConfig.fontBodyPath && appConfig.fontBodyName) {
      const bodyFont = new FontFace(appConfig.fontBodyName, `url('${appConfig.fontBodyPath}')`);
      bodyFont.load().then(loadedFont => {
        document.fonts.add(loadedFont);
        document.documentElement.style.setProperty('--font-body', `'${appConfig.fontBodyName}', sans-serif`);
        document.body.style.fontFamily = `'${appConfig.fontBodyName}', sans-serif`;
      }).catch(err => {
        console.warn('Failed to load body font:', err);
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

      // Get app version for display
      ipcRenderer.invoke('get-app-version').then(version => {
        const versionEl = document.getElementById('app-version-display');
        if (versionEl) versionEl.innerText = version;
      });
    }
  }

  initAutoUpdater() {
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      const updateCheckOverlay = document.getElementById('update-check-overlay');
      const statusText = document.getElementById('update-check-status-text');
      const subText = document.getElementById('update-check-sub-text');
      const progressWrap = document.getElementById('update-check-progress-wrap');
      const progressBar = document.getElementById('update-check-progress-bar');

      const endUpdateCheck = () => {
        if (updateCheckOverlay) {
          updateCheckOverlay.classList.add('opacity-0', 'pointer-events-none');
          setTimeout(() => updateCheckOverlay.classList.add('hidden'), 300);
        }
        // Reset user session and show auth view after check is complete
        this.currentUser = null;
        localStorage.removeItem('launcher_user');
        this.updateUserDisplay();
        this.switchView('view-auth');
      };

      ipcRenderer.on('updater-message', (event, data) => {
        if (data.status === 'checking') {
          if (statusText) statusText.innerText = 'Checking for updates...';
        } else if (data.status === 'available') {
          if (statusText) statusText.innerText = 'New update found. Downloading...';
          if (subText) subText.innerText = `Version ${data.version}`;
          if (progressWrap) progressWrap.classList.remove('hidden');
        } else if (data.status === 'not-available') {
          if (statusText) statusText.innerText = 'Launcher is up to date.';
          setTimeout(endUpdateCheck, 1000);
        } else if (data.status === 'error') {
          if (statusText) statusText.innerText = 'Unable to check for updates.';
          if (subText) subText.innerText = 'Skipping and continuing...';
          setTimeout(endUpdateCheck, 1500);
        }
      });

      const updateModal = document.getElementById('update-modal');
      const updateTitle = document.getElementById('update-modal-title');
      const updateDesc = document.getElementById('update-modal-desc');
      const updateProgressWrap = document.getElementById('update-modal-progress-wrap');
      const updateProgressBar = document.getElementById('update-modal-progress-bar');
      const updateProgressText = document.getElementById('update-modal-progress-text');
      const updateActions = document.getElementById('update-modal-actions');
      const btnRestart = document.getElementById('btn-update-restart');
      const btnLater = document.getElementById('btn-update-later');

      // Show progress in modal if available
      ipcRenderer.on('updater-progress', (event, data) => {
        // Update both the startup overlay and the later modal
        if (progressBar) progressBar.style.width = `${data.percent}%`;
        if (updateProgressBar) {
          updateProgressBar.style.width = `${data.percent}%`;
        }
      });

      // Show Custom Update Modal when update downloaded & ready
      ipcRenderer.on('update-ready-modal', (event, data) => {
        if (updateModal) {
          if (updateTitle) updateTitle.innerText = i18n.t('updateReadyTitle');
          if (updateDesc) {
            updateDesc.innerHTML = i18n.t('updateModalDesc', { version: `<strong class="custom-accent-text font-bold">${data.version || ''}</strong>` });
          }
          if (updateProgressWrap) updateProgressWrap.classList.add('hidden');
          if (updateActions) updateActions.classList.remove('hidden');

          // Hide startup overlay and show the final modal
          if (updateCheckOverlay) updateCheckOverlay.classList.add('hidden');
          updateModal.classList.remove('hidden');
        }
      });

      if (btnRestart) {
        btnRestart.addEventListener('click', () => {
          ipcRenderer.send('restart-and-install');
        });
      }

      if (btnLater) {
        btnLater.addEventListener('click', () => {
          if (updateModal) updateModal.classList.add('hidden');
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

    // Helper to generate offline UUID fallback if Web Server didn't send one
    const getOrGenerateUUID = (userObj, name) => {
      if (userObj && (userObj.uuid || userObj.id)) {
        return userObj.uuid || userObj.id;
      }
      // Simple hash-based v3-like UUID string for Minecraft offline mode
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = (hash << 5) - hash + name.charCodeAt(i);
        hash |= 0;
      }
      const hex = Math.abs(hash).toString(16).padStart(8, '0');
      return `${hex}-0000-4000-8000-000000000000`;
    };

    // Helper to toggle button loading spinner state
    const setButtonLoading = (type, isLoading) => {
      const btn = document.getElementById(`btn-${type}-submit`);
      const icon = document.getElementById(`btn-${type}-icon`);
      const spinner = document.getElementById(`btn-${type}-spinner`);
      if (btn) btn.disabled = isLoading;
      if (icon) icon.classList.toggle('hidden', isLoading);
      if (spinner) spinner.classList.toggle('hidden', !isLoading);
    };

    // Login Button Submit
    const btnLoginSubmit = document.getElementById('btn-login-submit');
    if (btnLoginSubmit) {
      btnLoginSubmit.addEventListener('click', async () => {
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

        setButtonLoading('login', true);
        const startTime = Date.now();

        const ensureMinLoadingTime = async () => {
          const elapsed = Date.now() - startTime;
          const remaining = 2000 - elapsed;
          if (remaining > 0) {
            await new Promise(resolve => setTimeout(resolve, remaining));
          }
        };

        try {
          const endpoint = `${appConfig.apiDomain}/minecraft/api/login`;
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });

          const data = await response.json().catch(() => ({}));
          await ensureMinLoadingTime();

          if (!response.ok || !data.success) {
            setButtonLoading('login', false);
            return this.showAlert(data.message || i18n.t('errWrongPass'));
          }

          const userObj = data.user || data.data || data;
          const finalName = userObj.username || userObj.name || username;
          const finalUUID = getOrGenerateUUID(userObj, finalName);
          const finalToken = userObj.accessToken || userObj.token || 'offline_token';
          const finalSkin = userObj.skinUrl || userObj.skin || userObj.avatar || null;

          this.clearAlert();
          this.currentUser = {
            name: finalName,
            uuid: finalUUID,
            accessToken: finalToken,
            password: password, // Store password for re-authentication on launch
            skinUrl: finalSkin,
            loggedInAt: new Date().toISOString()
          };
          localStorage.setItem('launcher_user', JSON.stringify(this.currentUser));
          setButtonLoading('login', false);
          this.updateUserDisplay();
          this.switchView('view-home');
        } catch (error) {
          console.error('Login API error:', error);
          await ensureMinLoadingTime();
          setButtonLoading('login', false);
          this.showAlert(i18n.t('errApiConnection'));
        }
      });
    }

    // Register Button Submit
    const btnRegisterSubmit = document.getElementById('btn-register-submit');
    if (btnRegisterSubmit) {
      btnRegisterSubmit.addEventListener('click', async () => {
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

        setButtonLoading('register', true);
        const startTime = Date.now();

        const ensureMinLoadingTime = async () => {
          const elapsed = Date.now() - startTime;
          const remaining = 2000 - elapsed;
          if (remaining > 0) {
            await new Promise(resolve => setTimeout(resolve, remaining));
          }
        };

        try {
          // Step 1: Register API Call
          const regEndpoint = `${appConfig.apiDomain}/minecraft/api/register`;
          const regResponse = await fetch(regEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });

          const regData = await regResponse.json().catch(() => ({}));

          if (!regResponse.ok || !regData.success) {
            await ensureMinLoadingTime();
            setButtonLoading('register', false);
            return this.showAlert(regData.message || i18n.t('errUserTaken', { name: username }));
          }

          // Step 2: Auto Login after successful Register to verify credentials
          const loginEndpoint = `${appConfig.apiDomain}/minecraft/api/login`;
          const loginResponse = await fetch(loginEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });

          const loginData = await loginResponse.json().catch(() => ({}));
          await ensureMinLoadingTime();
          setButtonLoading('register', false);

          if (!loginResponse.ok || !loginData.success) {
            return this.showAlert(loginData.message || i18n.t('errWrongPass'));
          }

          const userObj = loginData.user || loginData.data || loginData;
          const finalName = userObj.username || userObj.name || username;
          const finalUUID = getOrGenerateUUID(userObj, finalName);
          const finalToken = userObj.accessToken || userObj.token || 'offline_token';
          const finalSkin = userObj.skinUrl || userObj.skin || userObj.avatar || null;

          this.clearAlert();
          this.currentUser = {
            name: finalName,
            uuid: finalUUID,
            accessToken: finalToken,
            password: password, // Store password for re-authentication on launch
            skinUrl: finalSkin,
            loggedInAt: new Date().toISOString()
          };
          localStorage.setItem('launcher_user', JSON.stringify(this.currentUser));
          this.updateUserDisplay();
          this.switchView('view-home');
        } catch (error) {
          console.error('Register API error:', error);
          setButtonLoading('register', false);
          this.showAlert(i18n.t('errApiConnection'));
        }
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

    // Launch Game Button Click Action
    const btnLaunchGame = document.getElementById('btn-launch-game');
    if (btnLaunchGame) {
      btnLaunchGame.addEventListener('click', () => {
        this.simulateLaunchGame();
      });
    }

    // Repair Launcher Button Click Action
    const btnRepairLauncher = document.getElementById('btn-repair-launcher');
    if (btnRepairLauncher) {
      btnRepairLauncher.addEventListener('click', () => {
        this.simulateRepairLauncher();
      });
    }

    // Settings RAM Slider live value display update & active preset highlighting
    const ramInput = document.getElementById('setting-ram');
    const ramVal = document.getElementById('setting-ram-val');

    const updateRamPresetHighlight = (val) => {
      document.querySelectorAll('.ram-preset-btn').forEach(btn => {
        const pVal = btn.getAttribute('data-ram-preset');
        if (String(pVal) === String(val)) {
          btn.classList.add('custom-accent-bg', 'text-white', 'border-transparent');
          btn.classList.remove('bg-slate-900', 'text-slate-300', 'border-slate-800');
        } else {
          btn.classList.remove('custom-accent-bg', 'text-white', 'border-transparent');
          btn.classList.add('bg-slate-900', 'text-slate-300', 'border-slate-800');
        }
      });
    };

    if (ramInput && ramVal) {
      ramInput.addEventListener('input', (e) => {
        ramVal.innerText = e.target.value;
        updateRamPresetHighlight(e.target.value);
      });
    }

    const showSettingsSaved = () => {
      // Silent save: no UI alert shown
    };

    const saveSettings = () => {
      const lang = document.getElementById('setting-language')?.value || 'en';
      const fullscreen = document.getElementById('setting-fullscreen')?.checked || false;
      const width = parseInt(document.getElementById('setting-width')?.value) || 854;
      const height = parseInt(document.getElementById('setting-height')?.value) || 480;
      const maxRam = parseInt(document.getElementById('setting-ram')?.value) || 4096;

      appConfig.saveUserSettings({
        language: lang,
        fullscreen: fullscreen,
        windowWidth: width,
        windowHeight: height,
        maxRam: maxRam
      });
      i18n.setLanguage(lang);
    };

    let settingsSaveTimer = null;
    const saveSettingsDebounced = () => {
      if (settingsSaveTimer) clearTimeout(settingsSaveTimer);
      settingsSaveTimer = setTimeout(saveSettings, 300);
    };

    // Settings Save Action
    const formSettings = document.getElementById('form-settings');
    if (formSettings) {
      formSettings.addEventListener('submit', (e) => {
        e.preventDefault();
        saveSettings();
      });
    }

    // Auto-save settings when inputs change
    const settingsInputs = [
      document.getElementById('setting-language'),
      document.getElementById('setting-fullscreen'),
      document.getElementById('setting-width'),
      document.getElementById('setting-height'),
      document.getElementById('setting-ram')
    ].filter(Boolean);

    settingsInputs.forEach(input => {
      const eventType = input.tagName.toLowerCase() === 'select' || input.type === 'checkbox' ? 'change' : 'input';
      input.addEventListener(eventType, saveSettingsDebounced);

      if (input.id === 'setting-width' || input.id === 'setting-height') {
        input.addEventListener('input', (e) => {
          e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
      }
    });

    document.querySelectorAll('.ram-preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const val = e.currentTarget.getAttribute('data-ram-preset');
        if (ramInput && ramVal && val) {
          ramInput.value = val;
          ramVal.innerText = val;
          updateRamPresetHighlight(val);
          saveSettings();
        }
      });
    });

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

    if (viewId === 'view-forum') {
      this.loadForumDataIfNeeded();
    } else if (viewId === 'view-store') {
      this.loadStoreDataIfNeeded();
    } else if (viewId === 'view-setting') {
      this.loadSettingsForm();
    }

    // Highlight active nav item
    document.querySelectorAll('[data-target-view]').forEach(btn => {
      const isTarget = btn.getAttribute('data-target-view') === viewId;
      if (btn.classList.contains('nav-btn-item')) {
        if (isTarget) {
          btn.classList.add('custom-accent-bg', 'text-white');
          btn.classList.remove('bg-slate-900/80', 'text-slate-400');
        } else {
          btn.classList.remove('custom-accent-bg', 'text-white');
          btn.classList.add('bg-slate-900/80', 'text-slate-400');
        }
      }
    });
  }

  loadSettingsForm() {
    const langSelect = document.getElementById('setting-language');
    const fullscreenCheckbox = document.getElementById('setting-fullscreen');
    const widthInput = document.getElementById('setting-width');
    const heightInput = document.getElementById('setting-height');
    const ramInput = document.getElementById('setting-ram');
    const ramVal = document.getElementById('setting-ram-val');
    const ramMaxLabel = document.getElementById('setting-ram-max-label');
    const settingVersionEl = document.getElementById('setting-app-version');

    if (langSelect) langSelect.value = i18n.getLanguage();
    if (fullscreenCheckbox) fullscreenCheckbox.checked = appConfig.fullscreen;
    if (widthInput) widthInput.value = appConfig.windowWidth;
    if (heightInput) heightInput.value = appConfig.windowHeight;
    if (ramInput) ramInput.value = appConfig.maxRam;
    if (ramVal) ramVal.innerText = appConfig.maxRam;

    // Highlight preset button matching current RAM
    const currentRamStr = String(appConfig.maxRam);
    document.querySelectorAll('.ram-preset-btn').forEach(btn => {
      const pVal = btn.getAttribute('data-ram-preset');
      if (String(pVal) === currentRamStr) {
        btn.classList.add('custom-accent-bg', 'text-white', 'border-transparent');
        btn.classList.remove('bg-slate-900', 'text-slate-300', 'border-slate-800');
      } else {
        btn.classList.remove('custom-accent-bg', 'text-white', 'border-transparent');
        btn.classList.add('bg-slate-900', 'text-slate-300', 'border-slate-800');
      }
    });

    // Detect system max RAM & version via Electron if available
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('get-app-version').then(version => {
        if (settingVersionEl) settingVersionEl.innerText = version;
      }).catch(() => { });

      try {
        const os = window.require('os');
        const totalMemMB = Math.floor(os.totalmem() / (1024 * 1024));
        if (ramInput && totalMemMB > 1024) {
          ramInput.max = totalMemMB;
          if (ramMaxLabel) ramMaxLabel.innerText = `${totalMemMB} MB`;
        }
      } catch (e) { }
    }
  }

  updateUserDisplay() {
    const mainSidebar = document.getElementById('main-sidebar');
    const sidebarAuth = document.getElementById('sidebar-auth-content');
    const sidebarApp = document.getElementById('sidebar-app-content');
    const userNameEl = document.getElementById('home-username');
    const userAvatarEl = document.getElementById('home-user-avatar');

    if (this.currentUser) {
      // Logged in: collapse sidebar to narrow icon bar (~1/12 size, 80px)
      if (mainSidebar) {
        mainSidebar.className = 'w-20 min-w-[80px] max-w-[80px] bg-[#0c101c]/90 backdrop-blur-md px-3 pt-6 pb-6 flex flex-col z-20 h-full relative transition-all duration-300 rounded-l-3xl overflow-hidden';
      }
      if (sidebarAuth) sidebarAuth.classList.add('hidden');
      if (sidebarApp) sidebarApp.classList.remove('hidden');

      // Duplicate logo config to app logo badge
      this.applyLogoIcon(BUILD_CONFIG.logoIcon, 'app-logo-text', 'app-logo-img');

      if (userNameEl) userNameEl.innerText = this.currentUser.name;
      if (userAvatarEl) {
        this.loadUserAvatar(this.currentUser.name, this.currentUser.skinUrl, userAvatarEl);
      }

      // Inject server name and description from appConfig
      const serverNameEl = document.getElementById('home-server-name');
      const serverDescEl = document.getElementById('home-server-description');
      if (serverNameEl) serverNameEl.innerText = appConfig.serverName;
      if (serverDescEl) {
        serverDescEl.innerHTML = '';
        appConfig.serverDescription.forEach(line => {
          const p = document.createElement('p');
          p.className = 'text-sm text-slate-300/80 font-ekkamaivibe leading-snug';
          p.innerText = line;
          serverDescEl.appendChild(p);
        });
      }

      // Fetch online player count from server if available
      this.fetchServerPlayerCount();
    } else {
      // Logged out: expand sidebar to auth form (1/3 size, 320px)
      if (mainSidebar) {
        mainSidebar.className = 'w-1/3 min-w-[320px] max-w-[340px] bg-[#0c101c]/80 backdrop-blur-md px-8 pt-8 pb-8 flex flex-col z-20 h-full relative transition-all duration-300 rounded-l-3xl overflow-hidden';
      }
      if (sidebarAuth) sidebarAuth.classList.remove('hidden');
      if (sidebarApp) sidebarApp.classList.add('hidden');

      if (userNameEl) userNameEl.innerText = 'Player';
      if (userAvatarEl) userAvatarEl.src = 'https://mc-heads.net/avatar/steve/64';
    }
  }

  // Dynamic Avatar Loader using mc-heads.net/avatar/{username}
  loadUserAvatar(username, skinUrl, imgElement) {
    if (!imgElement || !username) return;

    const avatarUrl = skinUrl || `https://mc-heads.net/avatar/${encodeURIComponent(username)}`;

    imgElement.onerror = () => {
      imgElement.onerror = null;
      imgElement.src = 'https://mc-heads.net/avatar/Steve';
    };

    imgElement.src = avatarUrl;
  }

  async fetchServerPlayerCount() {
    const playerCountEl = document.getElementById('home-player-count');
    const cardPlayerCountEl = document.getElementById('card-player-count');

    const updateUI = (data) => {
      const statusIconBox = document.getElementById('server-status-icon');
      const iconOnline = document.getElementById('server-icon-online');
      const iconOffline = document.getElementById('server-icon-offline');
      const playerLabelEl = document.getElementById('home-player-label');

      if (data && data.online !== undefined) {
        if (data.online) {
          // Online: show people icon, accent color
          if (statusIconBox) {
            statusIconBox.className = 'w-12 h-12 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-center custom-accent-text shadow-md transition-all duration-300';
          }
          if (iconOnline) iconOnline.classList.remove('hidden');
          if (iconOffline) iconOffline.classList.add('hidden');
          if (playerCountEl) {
            playerCountEl.innerText = `${data.players || 0}`;
            playerCountEl.className = 'text-base font-bold text-white font-nexon leading-tight';
          }
          if (playerLabelEl) playerLabelEl.innerText = i18n.t('labelOnlinePlayers');
          if (cardPlayerCountEl) cardPlayerCountEl.innerText = `${data.players || 0} / ${data.maxPlayers || 200}`;
        } else {
          // Offline: show X/circle icon, red/muted color
          if (statusIconBox) {
            statusIconBox.className = 'w-12 h-12 rounded-2xl bg-red-950/60 border border-red-800/50 flex items-center justify-center text-red-400 shadow-md transition-all duration-300';
          }
          if (iconOnline) iconOnline.classList.add('hidden');
          if (iconOffline) iconOffline.classList.remove('hidden');
          if (playerCountEl) {
            playerCountEl.innerText = i18n.t('labelServerOffline');
            playerCountEl.className = 'text-base font-bold text-red-400 font-nexon leading-tight';
          }
          if (playerLabelEl) playerLabelEl.innerText = i18n.t('labelOnlinePlayers');
          if (cardPlayerCountEl) cardPlayerCountEl.innerText = `0 / ${data.maxPlayers || 200}`;
        }
      } else {
        if (playerCountEl) {
          playerCountEl.innerText = '---';
          playerCountEl.className = 'text-base font-bold text-white font-nexon leading-tight';
        }
        if (cardPlayerCountEl) cardPlayerCountEl.innerText = '---';
      }
    };

    const doFetch = async () => {
      try {
        let serverIp = '';
        let serverPort = 25565;

        // 1. ดึง IP / Port เซิร์ฟเวอร์จาก launcher-config ก่อน
        try {
          const configRes = await fetch(`${appConfig.apiDomain}/minecraft/api/launcher-config`).catch(() => null);
          if (configRes && configRes.ok) {
            const configData = await configRes.json().catch(() => ({}));
            if (configData && configData.game) {
              serverIp = (configData.game.serverIp || '').trim();
              serverPort = configData.game.serverPort || 25565;
            }
          }
        } catch (err) {
          console.warn('Error fetching launcher-config for server status:', err);
        }

        // 2. ถ้าได้ serverIp มา ให้เช็คตรงผ่าน Minecraft status API (api.mcsrvstat.us)
        if (serverIp && serverIp !== 'localhost' && serverIp !== '127.0.0.1') {
          const queryHost = serverPort && serverPort !== 25565 ? `${serverIp}:${serverPort}` : serverIp;
          const mcStatRes = await fetch(`https://api.mcsrvstat.us/3/${queryHost}`).catch(() => null);
          if (mcStatRes && mcStatRes.ok) {
            const mcData = await mcStatRes.json().catch(() => ({}));
            if (mcData && mcData.online) {
              updateUI({
                online: true,
                players: mcData.players ? (mcData.players.online || 0) : 0,
                maxPlayers: mcData.players ? (mcData.players.max || 200) : 200
              });
              return;
            }
          }
        }

        // 3. Fallback: ถ้าเช็คตรงไม่ได้ หรือเป็น localhost ให้เรียก status endpoint ของ Web API
        const endpoint = `${appConfig.apiDomain}/minecraft/api/status`;
        const response = await fetch(endpoint).catch(() => null);
        if (response && response.ok) {
          const data = await response.json().catch(() => ({}));
          updateUI(data);
        } else {
          updateUI({ online: false });
        }
      } catch (e) {
        console.warn('Status API fetch error:', e);
        updateUI({ online: false });
      }
    };

    // Initial fetch
    await doFetch();

    // Setup 15s auto-refresh polling interval
    if (this.statusInterval) clearInterval(this.statusInterval);
    this.statusInterval = setInterval(() => {
      if (this.currentUser) {
        doFetch();
      } else {
        clearInterval(this.statusInterval);
      }
    }, 15000);
  }

  async updatePlayButtonState() {
    const btn = document.getElementById('btn-launch-game');
    const textLabel = document.getElementById('launch-btn-text');
    const iconPlay = document.getElementById('launch-btn-icon-play');
    const iconSpinner = document.getElementById('launch-btn-icon-spinner');

    if (!btn || !textLabel) return;

    if (this.isGameRunning) {
      btn.disabled = true;
      btn.classList.add('bg-slate-700', 'text-slate-300', 'cursor-not-allowed', 'opacity-80');
      btn.classList.remove('custom-accent-bg', 'hover:opacity-95', 'bg-amber-500', 'text-slate-950', 'text-white');
      if (iconPlay) iconPlay.classList.add('hidden');
      if (iconSpinner) iconSpinner.classList.add('hidden');
      textLabel.innerText = i18n.t('gameRunning');
    } else {
      btn.disabled = false;
      btn.classList.remove('bg-amber-500', 'text-slate-950', 'bg-slate-700', 'text-slate-300', 'cursor-not-allowed', 'opacity-70', 'opacity-80', 'opacity-90');
      btn.classList.add('custom-accent-bg', 'text-white', 'hover:opacity-95');
      if (iconPlay) iconPlay.classList.remove('hidden');

      if (window.require) {
        try {
          const { ipcRenderer } = window.require('electron');
          const exists = await ipcRenderer.invoke('check-namespace-exists', appConfig.gameFolderNamespace);
          if (!exists) {
            textLabel.innerText = i18n.t('installGame');
            return;
          }
        } catch (e) { }
      }
      textLabel.innerText = i18n.t('playNow');
    }
  }

  simulateLaunchGame() {
    const btn = document.getElementById('btn-launch-game');
    const progressBar = document.getElementById('launch-progress-bar');
    const iconPlay = document.getElementById('launch-btn-icon-play');
    const iconSpinner = document.getElementById('launch-btn-icon-spinner');
    const textLabel = document.getElementById('launch-btn-text');
    const statusTextLabel = document.getElementById('launch-status-text');

    if (!btn || btn.disabled || this.isGameRunning) return;

    btn.disabled = true;
    if (iconPlay) iconPlay.classList.add('hidden');
    if (iconSpinner) iconSpinner.classList.remove('hidden');

    if (window.require) {
      const { ipcRenderer } = window.require('electron');

      const userPayload = {
        apiDomain: appConfig.apiDomain,
        gameFolderNamespace: appConfig.gameFolderNamespace,
        cleaningIgnored: appConfig.cleaningIgnored,
        username: this.currentUser ? this.currentUser.name : 'Player',
        uuid: this.currentUser ? this.currentUser.uuid : null,
        accessToken: this.currentUser ? this.currentUser.accessToken : null,
        password: this.currentUser ? this.currentUser.password : null,
        maxRam: appConfig.maxRam,
        fullscreen: appConfig.fullscreen,
        windowWidth: appConfig.windowWidth,
        windowHeight: appConfig.windowHeight
      };

      const progressListener = (event, data) => {
        const percent = data.percent || 0;
        if (progressBar) progressBar.style.width = `${percent}%`;

        // Detailed text shown above button
        if (statusTextLabel) statusTextLabel.innerText = data.text || '';

        // Clean short text inside button
        if (textLabel) {
          if (data.status === 'launched') {
            textLabel.innerText = i18n.t('gameRunning');
          } else if (data.status === 'error') {
            textLabel.innerText = i18n.t('errApiConnection');
          } else {
            textLabel.innerText = `${i18n.t('downloadingText') || 'DOWNLOADING'} ${percent}%`;
          }
        }

        if (data.status === 'launched' || data.status === 'error') {
          ipcRenderer.removeListener('launch-progress', progressListener);

          setTimeout(() => {
            if (progressBar) progressBar.style.width = '0%';
            if (iconSpinner) iconSpinner.classList.add('hidden');
            if (statusTextLabel) statusTextLabel.innerText = '';

            if (data.status === 'launched') {
              this.isGameRunning = true;
            } else {
              this.isGameRunning = false;
              btn.disabled = false;
            }
            this.updatePlayButtonState();
          }, 2000);
        }
      };

      ipcRenderer.on('launch-progress', progressListener);
      ipcRenderer.send('launch-game', userPayload);
    } else {
      // Fallback mock simulation for browser testing
      let progress = 0;
      if (statusTextLabel) statusTextLabel.innerText = 'กำลังดาวน์โหลดทรัพยากรเกม...';

      const interval = setInterval(() => {
        progress += 5;
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (textLabel) textLabel.innerText = `กำลังดาวน์โหลด ${progress}%`;

        if (progress >= 100) {
          clearInterval(interval);
          if (textLabel) textLabel.innerText = 'กำลังเปิดเกม...';

          setTimeout(() => {
            btn.disabled = false;
            if (progressBar) progressBar.style.width = '0%';
            if (iconPlay) iconPlay.classList.remove('hidden');
            if (iconSpinner) iconSpinner.classList.add('hidden');
            if (textLabel) textLabel.innerText = i18n.t('playNow');
            if (statusTextLabel) statusTextLabel.innerText = '';
          }, 1500);
        }
      }, 100);
    }
  }

  simulateRepairLauncher() {
    const repairModal = document.getElementById('repair-modal');
    const btnCancel = document.getElementById('btn-repair-cancel');
    const btnConfirm = document.getElementById('btn-repair-confirm');
    const statusTextLabel = document.getElementById('launch-status-text');

    if (!repairModal) return;

    // Show modal
    repairModal.classList.remove('hidden');

    // Cancel — close modal
    if (btnCancel) {
      btnCancel.onclick = () => repairModal.classList.add('hidden');
    }

    // Confirm — delete namespace folder
    if (btnConfirm) {
      btnConfirm.onclick = async () => {
        repairModal.classList.add('hidden');
        if (statusTextLabel) statusTextLabel.innerText = '🗑️ Deleting game folder...';

        const { ipcRenderer } = window.require('electron');
        ipcRenderer.invoke('delete-namespace-folder').then((result) => {
          if (result && result.success) {
            if (statusTextLabel) statusTextLabel.innerText = '✅ Deleted — Press Play to re-install the game.';
            this.updatePlayButtonState();
          } else {
            if (statusTextLabel) statusTextLabel.innerText = `❌ Delete failed: ${result?.error || 'unknown error'}`;
          }
          setTimeout(() => {
            if (statusTextLabel) statusTextLabel.innerText = '';
          }, 5000);
        }).catch((e) => {
          if (statusTextLabel) statusTextLabel.innerText = `❌ Error: ${e.message}`;
        });
      };
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
    this.updatePlayButtonState();
  }

  // --- FORUM MODULE METHODS ---

  loadForumDataIfNeeded() {
    if (!this.forumPosts) {
      this.fetchForumData();
    }
  }

  loadStoreDataIfNeeded() {
    if (!this.storeItems) {
      this.fetchStoreData();
    }
  }

  async fetchStoreData() {
    const loadingEl = document.getElementById('store-loading');
    const emptyEl = document.getElementById('store-empty');
    const gridEl = document.getElementById('store-grid');

    if (loadingEl) loadingEl.classList.remove('hidden');
    if (emptyEl) emptyEl.classList.add('hidden');
    if (gridEl) gridEl.innerHTML = '';

    try {
      const endpoint = `${appConfig.apiDomain}/api/store`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);

      const data = await response.json();
      this.storeItems = Array.isArray(data) ? data : [];
      this.storeCurrentPage = 0;
      this.storeItemsPerPage = 6;
      this.bindStoreEvents();
      this.renderStoreItems();
    } catch (error) {
      console.error('Failed to fetch store data:', error);
      this.storeItems = [];
      if (emptyEl) {
        emptyEl.innerText = 'Failed to load hot store items. Please check your API server connection.';
        emptyEl.classList.remove('hidden');
      }
      if (gridEl) gridEl.innerHTML = '';
      const totalCountEl = document.getElementById('store-total-count');
      if (totalCountEl) totalCountEl.innerText = '0 items total';
      const pageIndicator = document.getElementById('store-page-indicator');
      if (pageIndicator) pageIndicator.innerText = 'Page 1 / 1';
    } finally {
      if (loadingEl) loadingEl.classList.add('hidden');
    }
  }

  bindStoreEvents() {
    if (this.storeEventsBound) return;
    this.storeEventsBound = true;

    const prevBtn = document.getElementById('store-prev-page');
    const nextBtn = document.getElementById('store-next-page');
    const container = document.getElementById('store-container');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.storeCurrentPage > 0) {
          this.storeCurrentPage--;
          this.renderStoreItems();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil((this.storeItems?.length || 0) / (this.storeItemsPerPage || 6)) || 1;
        if (this.storeCurrentPage < totalPages - 1) {
          this.storeCurrentPage++;
          this.renderStoreItems();
        }
      });
    }

    if (container) {
      let isWheelThrottled = false;
      container.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (isWheelThrottled) return;
        const totalPages = Math.ceil((this.storeItems?.length || 0) / (this.storeItemsPerPage || 6)) || 1;

        if (e.deltaY > 0) {
          if (this.storeCurrentPage < totalPages - 1) {
            isWheelThrottled = true;
            this.storeCurrentPage++;
            this.renderStoreItems();
            setTimeout(() => { isWheelThrottled = false; }, 250);
          }
        } else if (e.deltaY < 0) {
          if (this.storeCurrentPage > 0) {
            isWheelThrottled = true;
            this.storeCurrentPage--;
            this.renderStoreItems();
            setTimeout(() => { isWheelThrottled = false; }, 250);
          }
        }
      }, { passive: false });
    }
  }

  renderStoreItems() {
    const gridEl = document.getElementById('store-grid');
    const emptyEl = document.getElementById('store-empty');

    if (!gridEl) return;

    const items = this.storeItems || [];
    const totalCount = items.length;
    const itemsPerPage = this.storeItemsPerPage || 6;
    const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
    let currentPage = this.storeCurrentPage || 0;

    if (currentPage >= totalPages) currentPage = totalPages - 1;
    if (currentPage < 0) currentPage = 0;
    this.storeCurrentPage = currentPage;

    const startIdx = currentPage * itemsPerPage;
    const pageItems = items.slice(startIdx, startIdx + itemsPerPage);

    if (totalCount === 0) {
      gridEl.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }

    if (emptyEl) emptyEl.classList.add('hidden');

    gridEl.style.opacity = '0';
    setTimeout(() => {
      gridEl.innerHTML = '';
      pageItems.forEach(item => {
        const card = (item.title || item.description || item.tag)
          ? this.createForumCard(item)
          : this.createStoreCard(item);
        gridEl.appendChild(card);
      });
      gridEl.style.opacity = '1';
    }, 120);
  }

  createStoreCard(item) {
    const card = document.createElement('div');
    card.className = 'bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/80 hover:border-slate-700 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col group h-full';

    const defaultImg = 'assets/bg.png';
    const imageUrl = item.image_url || item.image || defaultImg;
    const itemName = item.name || item.title || `Item #${item.id || 'N/A'}`;
    const itemPrice = item.price != null ? Number(item.price).toFixed(2) : 'N/A';

    card.innerHTML = `
      <div class="h-32 w-full relative overflow-hidden bg-slate-950 shrink-0">
        <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src="${imageUrl}" alt="${itemName}" onerror="this.src='${defaultImg}'">
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent"></div>
      </div>
      <div class="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 class="text-sm font-bold text-white font-nexon line-clamp-2 leading-snug">${itemName}</h3>
          <p class="text-[11px] text-slate-400 font-ekkamaivibe mt-2 leading-snug">ID: ${item.id || 'N/A'}</p>
        </div>
        <div class="mt-4 flex items-center justify-between text-xs text-slate-300 font-semibold font-nexon">
          <span class="text-emerald-300">฿ ${itemPrice}</span>
          <span class="text-slate-500">Hot item</span>
        </div>
      </div>
    `;

    return card;
  }

  async fetchForumData() {
    const loadingEl = document.getElementById('forum-loading');
    const emptyEl = document.getElementById('forum-empty');
    const gridEl = document.getElementById('forum-grid');

    if (loadingEl) loadingEl.classList.remove('hidden');
    if (emptyEl) emptyEl.classList.add('hidden');
    if (gridEl) gridEl.innerHTML = '';

    try {
      const endpoint = `${appConfig.apiDomain}/api/forum`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json();

      this.forumPosts = Array.isArray(data) ? data : [];
      this.forumCurrentPage = 0;
      this.forumItemsPerPage = 6;
      this.bindForumEvents();
      this.renderForumPage();
    } catch (error) {
      console.error('Failed to fetch forum data:', error);
      this.forumPosts = [];
      if (emptyEl) {
        emptyEl.innerText = 'Failed to load forum data. Please check your API server connection.';
        emptyEl.classList.remove('hidden');
      }
    } finally {
      if (loadingEl) loadingEl.classList.add('hidden');
    }
  }

  bindForumEvents() {
    if (this.forumEventsBound) return;
    this.forumEventsBound = true;

    const prevBtn = document.getElementById('forum-prev-page');
    const nextBtn = document.getElementById('forum-next-page');
    const container = document.getElementById('forum-container');
    const modalClose = document.getElementById('forum-modal-close');
    const modal = document.getElementById('forum-modal');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.forumCurrentPage > 0) {
          this.forumCurrentPage--;
          this.renderForumPage();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil((this.forumPosts?.length || 0) / (this.forumItemsPerPage || 6)) || 1;
        if (this.forumCurrentPage < totalPages - 1) {
          this.forumCurrentPage++;
          this.renderForumPage();
        }
      });
    }

    if (container) {
      let isWheelThrottled = false;
      container.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (isWheelThrottled) return;
        const totalPages = Math.ceil((this.forumPosts?.length || 0) / (this.forumItemsPerPage || 6)) || 1;

        if (e.deltaY > 0) {
          // Scroll Down -> Next 6 items
          if (this.forumCurrentPage < totalPages - 1) {
            isWheelThrottled = true;
            this.forumCurrentPage++;
            this.renderForumPage();
            setTimeout(() => { isWheelThrottled = false; }, 250);
          }
        } else if (e.deltaY < 0) {
          // Scroll Up -> Prev 6 items
          if (this.forumCurrentPage > 0) {
            isWheelThrottled = true;
            this.forumCurrentPage--;
            this.renderForumPage();
            setTimeout(() => { isWheelThrottled = false; }, 250);
          }
        }
      }, { passive: false });
    }

    if (modalClose && modal) {
      modalClose.addEventListener('click', () => {
        modal.classList.add('hidden');
      });

      // Close modal on backdrop click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
        }
      });
    }
  }

  renderForumPage() {
    const gridEl = document.getElementById('forum-grid');
    const pageIndicator = document.getElementById('forum-page-indicator');
    const totalCountEl = document.getElementById('forum-total-count');
    const prevBtn = document.getElementById('forum-prev-page');
    const nextBtn = document.getElementById('forum-next-page');
    const emptyEl = document.getElementById('forum-empty');

    if (!gridEl) return;

    const posts = this.forumPosts || [];
    const totalItems = posts.length;
    const itemsPerPage = this.forumItemsPerPage || 6;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    if (this.forumCurrentPage >= totalPages) this.forumCurrentPage = totalPages - 1;
    if (this.forumCurrentPage < 0) this.forumCurrentPage = 0;

    const currentPage = this.forumCurrentPage;
    const startIdx = currentPage * itemsPerPage;
    const pagePosts = posts.slice(startIdx, startIdx + itemsPerPage);

    if (pageIndicator) pageIndicator.innerText = `Page ${currentPage + 1} / ${totalPages}`;
    if (totalCountEl) totalCountEl.innerText = `${totalItems} post${totalItems !== 1 ? 's' : ''} total`;
    if (prevBtn) prevBtn.disabled = (currentPage === 0);
    if (nextBtn) nextBtn.disabled = (currentPage >= totalPages - 1);

    if (totalItems === 0) {
      gridEl.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    } else if (emptyEl) {
      emptyEl.classList.add('hidden');
    }

    // Grid animation: fade out and in
    gridEl.style.opacity = '0';

    setTimeout(() => {
      gridEl.innerHTML = '';
      pagePosts.forEach(post => {
        const card = this.createForumCard(post);
        gridEl.appendChild(card);
      });
      gridEl.style.opacity = '1';
    }, 120);
  }

  // Helper: Extract first image URL from post.image_url or inside markdown description
  getForumImageUrl(post) {
    if (post.image_url && post.image_url.trim()) {
      return post.image_url.trim();
    }
    if (post.description) {
      // Check standard markdown image: ![alt](url)
      const mdImgMatch = post.description.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/i);
      if (mdImgMatch && mdImgMatch[1]) {
        return mdImgMatch[1];
      }
      // Check HTML img tag: <img src="url" ...>
      const htmlImgMatch = post.description.match(/<img[^>]+src=["'](https?:\/\/[^"'>]+)["']/i);
      if (htmlImgMatch && htmlImgMatch[1]) {
        return htmlImgMatch[1];
      }
    }
    return 'assets/bg.png';
  }

  createForumCard(post) {
    const card = document.createElement('div');
    card.className = 'forum-card no-drag bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/80 hover:border-slate-700 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col group h-full select-none';
    card.style.webkitAppRegion = 'no-drag';

    // Image Header with fallback and markdown image extraction
    const defaultImg = 'assets/bg.png';
    const imageUrl = this.getForumImageUrl(post);

    // Tag background colors
    const tagColors = {
      'Game Releases': 'custom-accent-bg',
      'Community': 'bg-emerald-600',
      'Competitions': 'bg-amber-600',
      'The Buzz': 'bg-sky-600'
    };
    const tagClass = tagColors[post.tag] || 'custom-accent-bg';

    // Clean preview description by stripping markdown tags
    const cleanSnippet = (post.description || '')
      .replace(/\{#[a-fA-F0-9]{3,6}\}/g, '')
      .replace(/\{#\}/g, '')
      .replace(/[#*`~>-]/g, '')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Format date
    let dateStr = '';
    if (post.created_at) {
      try {
        const d = new Date(post.created_at);
        dateStr = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch (e) {
        dateStr = post.created_at;
      }
    }

    card.innerHTML = `
      <div class="h-24 w-full relative overflow-hidden bg-slate-950 shrink-0 pointer-events-none">
        <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src="${imageUrl}" alt="${post.title || ''}" onerror="this.src='${defaultImg}'">
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
        <span class="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider text-white ${tagClass} shadow-md">${post.tag || 'Notice'}</span>
      </div>
      <div class="p-3 flex-1 flex flex-col justify-between overflow-hidden pointer-events-none">
        <div>
          <h3 class="text-xs font-bold text-white font-nexon line-clamp-1 group-hover:custom-accent-text transition-colors leading-snug">${post.title || ''}</h3>
          <p class="text-[11px] text-slate-400 font-ekkamaivibe line-clamp-2 mt-1 leading-snug">${cleanSnippet}</p>
        </div>
        <div class="text-[10px] text-slate-500 font-ekkamaivibe mt-2 text-right">
          ${dateStr}
        </div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openForumModal(post);
    });

    return card;
  }

  openForumModal(post) {
    const modal = document.getElementById('forum-modal');
    const modalImg = document.getElementById('forum-modal-img');
    const modalTag = document.getElementById('forum-modal-tag');
    const modalDate = document.getElementById('forum-modal-date');
    const modalTitle = document.getElementById('forum-modal-title');
    const modalBody = document.getElementById('forum-modal-body');

    if (!modal) return;

    const imageUrl = this.getForumImageUrl(post);

    if (modalImg) {
      modalImg.src = imageUrl;
      modalImg.onerror = () => { modalImg.src = 'assets/bg.png'; };
    }
    if (modalTag) modalTag.innerText = post.tag || 'Notice';
    if (modalDate) {
      let dStr = '';
      if (post.created_at) {
        try {
          const d = new Date(post.created_at);
          dStr = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (e) {
          dStr = post.created_at;
        }
      }
      modalDate.innerText = dStr;
    }
    if (modalTitle) modalTitle.innerText = post.title || '';
    if (modalBody) {
      modalBody.innerHTML = this.parseMarkdownToHTML(post.description || '');
    }

    modal.classList.remove('hidden');
  }

  parseMarkdownToHTML(markdown) {
    if (!markdown) return '';

    let html = markdown;

    // Escape HTML entities to prevent XSS except our allowed markup
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Minecraft Custom Color Codes: {#HEX}text{#} -> <span style="color:#HEX">text</span>
    html = html.replace(/\{#([a-fA-F0-9]{3,6})\}(.*?)\{#\}/g, (match, color, text) => {
      return `<span style="color: #${color}; font-weight: 600;">${text}</span>`;
    });

    // Code blocks ```lang ... ```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre class="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto my-2"><code>${code.trim()}</code></pre>`;
    });

    // Inline code `code`
    html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-xs font-mono custom-accent-text">$1</code>');

    // YouTube / Image links: [![alt](img_url)](youtube_url)
    html = html.replace(/\[!\[(.*?)\]\((.*?)\)\]\((.*?)\)/g, (match, alt, img, link) => {
      return `<a href="${link}" target="_blank" class="block my-3 rounded-xl overflow-hidden border border-slate-800 hover:border-slate-700 transition-all relative group">
        <img src="${img}" alt="${alt}" class="w-full max-h-56 object-cover">
        <div class="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-all">
          <div class="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg">
            <svg class="w-6 h-6 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      </a>`;
    });

    // Standard Markdown Images: ![alt](url)
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="w-full max-h-64 object-cover rounded-xl border border-slate-800 my-3">');

    // Standard Links: [text](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="custom-accent-text underline font-semibold hover:opacity-80">$1</a>');

    // Headers (# Heading)
    html = html.replace(/^#### (.*$)/gim, '<h4 class="text-xs font-bold text-white font-nexon mt-3 mb-1">$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold text-white font-nexon mt-3 mb-1.5">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-base font-extrabold text-white font-nexon mt-4 mb-2 border-b border-slate-800 pb-1">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-lg font-black text-white font-nexon mt-4 mb-2 border-b border-slate-800/80 pb-1.5">$1</h1>');

    // Horizontal rules (---)
    html = html.replace(/^---$/gim, '<hr class="border-slate-800 my-3">');

    // Task lists: - [x] or - [ ]
    html = html.replace(/^- \[x\] (.*$)/gim, '<div class="flex items-center gap-2 text-xs text-emerald-400 my-1"><span class="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-[10px]">✓</span><span class="line-through text-slate-400">$1</span></div>');
    html = html.replace(/^- \[ \] (.*$)/gim, '<div class="flex items-center gap-2 text-xs text-slate-300 my-1"><span class="w-4 h-4 rounded border border-slate-700 bg-slate-900"></span><span>$1</span></div>');

    // Unordered lists (* or -)
    html = html.replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc text-xs text-slate-300 my-0.5">$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-xs text-slate-300 my-0.5">$1</li>');

    // Blockquotes (> quote)
    html = html.replace(/^&gt; (.*$)/gim, '<blockquote class="border-l-4 border-purple-500 pl-3 py-1 bg-slate-950/60 text-xs italic text-slate-300 my-2 rounded-r-lg">$1</blockquote>');

    // Bold, Italic, Strikethrough
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="font-extrabold italic text-white">$1</strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-slate-200">$1</em>');
    html = html.replace(/~~(.*?)~~/g, '<del class="line-through text-slate-500">$1</del>');

    // Tables parsing
    if (html.includes('|')) {
      const lines = html.split('\n');
      let inTable = false;
      let tableHTML = '<div class="overflow-x-auto my-3"><table class="w-full text-xs text-left border-collapse border border-slate-800 rounded-xl overflow-hidden">';
      let newLines = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('|') && line.endsWith('|')) {
          if (!inTable) {
            inTable = true;
          }
          if (line.includes('---')) continue;

          const cells = line.split('|').slice(1, -1).map(c => c.trim());
          const isHeader = !tableHTML.includes('<tbody>') && !tableHTML.includes('</td>');

          if (isHeader) {
            tableHTML += '<thead class="bg-slate-900 border-b border-slate-800 text-slate-200 font-nexon"><tr>';
            cells.forEach(cell => { tableHTML += `<th class="p-2 border-r border-slate-800/60">${cell}</th>`; });
            tableHTML += '</tr></thead><tbody>';
          } else {
            tableHTML += '<tr class="border-b border-slate-800/60 hover:bg-slate-900/50 transition-colors">';
            cells.forEach(cell => { tableHTML += `<td class="p-2 border-r border-slate-800/60 text-slate-300">${cell}</td>`; });
            tableHTML += '</tr>';
          }
        } else {
          if (inTable) {
            inTable = false;
            tableHTML += '</tbody></table></div>';
            newLines.push(tableHTML);
            tableHTML = '<div class="overflow-x-auto my-3"><table class="w-full text-xs text-left border-collapse border border-slate-800 rounded-xl overflow-hidden">';
          }
          newLines.push(line);
        }
      }
      if (inTable) {
        tableHTML += '</tbody></table></div>';
        newLines.push(tableHTML);
      }
      html = newLines.join('\n');
    }

    // Convert line breaks
    html = html.replace(/\n\n/g, '<div class="h-2"></div>');
    html = html.replace(/\n/g, '<br>');

    return html;
  }
}

const appUI = new AppUI();
