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

      // Reset user session on application launch (Manual Log in each start)
      this.currentUser = null;
      localStorage.removeItem('launcher_user');
      this.updateUserDisplay();
      this.switchView('view-auth');

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
    }
  }

  initAutoUpdater() {
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
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
        if (updateModal && !updateModal.classList.contains('hidden')) {
          if (updateProgressWrap) updateProgressWrap.classList.remove('hidden');
          if (updateProgressBar) updateProgressBar.style.width = `${data.percent}%`;
          if (updateProgressText) updateProgressText.innerText = `${data.percent}%`;
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
          updateModal.classList.remove('hidden');
        }
      });

      ipcRenderer.on('updater-message', (event, data) => {
        if (data.status === 'downloaded') {
          if (updateModal) {
            if (updateTitle) updateTitle.innerText = i18n.t('updateReadyTitle');
            if (updateDesc) {
              updateDesc.innerHTML = i18n.t('updateModalDesc', { version: `<strong class="custom-accent-text font-bold">${data.version || ''}</strong>` });
            }
            if (updateProgressWrap) updateProgressWrap.classList.add('hidden');
            if (updateActions) updateActions.classList.remove('hidden');
            updateModal.classList.remove('hidden');
          }
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

          this.clearAlert();
          this.currentUser = {
            name: finalName,
            uuid: finalUUID,
            accessToken: finalToken,
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

          this.clearAlert();
          this.currentUser = {
            name: finalName,
            uuid: finalUUID,
            accessToken: finalToken,
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
    if (langSelect) langSelect.value = i18n.getLanguage();
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
        mainSidebar.className = 'w-20 min-w-[80px] max-w-[80px] bg-[#0c101c]/90 backdrop-blur-md px-3 pt-6 pb-6 flex flex-col z-20 h-full relative transition-all duration-300';
      }
      if (sidebarAuth) sidebarAuth.classList.add('hidden');
      if (sidebarApp) sidebarApp.classList.remove('hidden');

      // Duplicate logo config to app logo badge
      this.applyLogoIcon(BUILD_CONFIG.logoIcon, 'app-logo-text', 'app-logo-img');

      if (userNameEl) userNameEl.innerText = this.currentUser.name;
      if (userAvatarEl) {
        // Load Minecraft skin head avatar using mc-heads API
        userAvatarEl.src = `https://mc-heads.net/avatar/${encodeURIComponent(this.currentUser.name)}/64`;
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
        mainSidebar.className = 'w-1/3 min-w-[320px] max-w-[340px] bg-[#0c101c]/80 backdrop-blur-md px-8 pt-8 pb-8 flex flex-col z-20 h-full relative transition-all duration-300';
      }
      if (sidebarAuth) sidebarAuth.classList.remove('hidden');
      if (sidebarApp) sidebarApp.classList.add('hidden');

      if (userNameEl) userNameEl.innerText = 'Player';
      if (userAvatarEl) userAvatarEl.src = 'https://mc-heads.net/avatar/steve/64';
    }
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
          if (playerCountEl) playerCountEl.innerText = `${data.players || 0}`;
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
          if (cardPlayerCountEl) cardPlayerCountEl.innerText = i18n.t('offline');
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

  simulateLaunchGame() {
    const btn = document.getElementById('btn-launch-game');
    const progressBar = document.getElementById('launch-progress-bar');
    const iconPlay = document.getElementById('launch-btn-icon-play');
    const iconSpinner = document.getElementById('launch-btn-icon-spinner');
    const textLabel = document.getElementById('launch-btn-text');
    const statusTextLabel = document.getElementById('launch-status-text');

    if (!btn || btn.disabled) return;

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
        accessToken: this.currentUser ? this.currentUser.accessToken : null
      };

      const progressListener = (event, data) => {
        const percent = data.percent || 0;
        if (progressBar) progressBar.style.width = `${percent}%`;
        
        // Detailed text shown above button
        if (statusTextLabel) statusTextLabel.innerText = data.text || '';
        
        // Clean short text inside button
        if (textLabel) {
          if (data.status === 'launched') {
            textLabel.innerText = 'กำลังเปิดเกม...';
          } else if (data.status === 'error') {
            textLabel.innerText = 'เกิดข้อผิดพลาด';
          } else {
            textLabel.innerText = `กำลังดาวน์โหลด ${percent}%`;
          }
        }

        if (data.status === 'launched' || data.status === 'error') {
          ipcRenderer.removeListener('launch-progress', progressListener);

          setTimeout(() => {
            btn.disabled = false;
            if (progressBar) progressBar.style.width = '0%';
            if (iconPlay) iconPlay.classList.remove('hidden');
            if (iconSpinner) iconSpinner.classList.add('hidden');
            if (textLabel) textLabel.innerText = i18n.t('playNow');
            if (statusTextLabel) statusTextLabel.innerText = '';
          }, 3500);
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
        if (statusTextLabel) statusTextLabel.innerText = '🗑️ กำลังลบโฟลเดอร์เกม...';

        const { ipcRenderer } = window.require('electron');
        ipcRenderer.invoke('delete-namespace-folder').then((result) => {
          if (result && result.success) {
            if (statusTextLabel) statusTextLabel.innerText = '✅ ลบเรียบร้อยแล้ว — กดเริ่มเกมเพื่อติดตั้งใหม่';
          } else {
            if (statusTextLabel) statusTextLabel.innerText = `❌ ลบไม่สำเร็จ: ${result?.error || 'unknown error'}`;
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
  }
}

const appUI = new AppUI();
