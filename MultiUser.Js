<script>
/* =====================================================================
   MultiUserJs.html — LOGIN + SESSION + RBAC v4 FINAL
   FIX:
   - v4.1: Auto-filter project selector setelah pull selesai
   - v4.2: Logout INSTAN tanpa reload → langsung guest view
   ===================================================================== */
var MultiUser = {
  SESSION_KEY: 'mk_session_token',

  ROLE_CONFIG: {
    superadmin: {
      label: 'Superadmin',
      tabs: ['executive','dashboard','resources','ahsp','wbs','schedule','calendar','holidays','analysis','progress','recon','lembar','projects','settings'],
      canEdit: true, canManageUsers: true, canManageProjects: true, projectScope: 'all'
    },
    admin: {
      label: 'Admin',
      tabs: ['executive','dashboard','resources','ahsp','wbs','schedule','calendar','holidays','analysis','progress','recon','lembar','projects','settings'],
      canEdit: true, canManageUsers: true, canManageProjects: true, projectScope: 'all'
    },
    user: {
      label: 'User',
      tabs: ['executive','dashboard','resources','ahsp','wbs','schedule','calendar','holidays','analysis','progress','recon','lembar'],
      canEdit: true, canManageUsers: false, canManageProjects: false, projectScope: 'assigned'
    },
    owner: {
      label: 'Owner',
      tabs: ['executive','dashboard','wbs','schedule','calendar','holidays','analysis','progress','recon','lembar'],
      canEdit: false, canManageUsers: false, canManageProjects: false, projectScope: 'all'
    }
  },

  EDIT_BTN_IDS: [
    'btnAddRes','btnAddAhsp','btnAddWbs','btnAddWbsGroup','btnAddProg',
    'btnAddCalendar','btnAddHoliday','btnAddProj','btnAddUser',
    'btnProgressWizard','btnImportBQ','btnRunCPM','btnRunCPMWBS',
    'btnSaveKoef','btnSyncAlat','btnSaveSet','btnReset','btnSeed',
    'btnPush','btnImport'
  ],

  GUEST_USER: {
    username: '__guest__',
    nama: 'Tamu',
    role: 'owner',
    project_ids: '*'
  },

  /* ═══════════════════════════════════════════════════════════
     LOGIN OVERLAY
     ═══════════════════════════════════════════════════════════ */
  ensureOverlay: function() {
    if (document.getElementById('loginOverlay')) return;
    var html = '';
    html += '<div class="login-overlay" id="loginOverlay" style="display:none">';
    html +=   '<div class="login-card">';
    html +=     '<div class="login-brand">';
    html +=       '<div class="login-logo">MK</div>';
    html +=       '<div>';
    html +=         '<div class="login-title">Manajemen Konstruksi v1</div>';
    html +=         '<div class="login-sub">Login untuk mengedit data</div>';
    html +=       '</div>';
    html +=     '</div>';
    html +=     '<div class="login-body">';
    html +=       '<div class="login-field"><label>Username</label>';
    html +=         '<input type="text" id="loginUser" autocomplete="username" placeholder="Masukkan username" /></div>';
    html +=       '<div class="login-field"><label>PIN</label>';
    html +=         '<input type="password" id="loginPin" autocomplete="current-password" placeholder="Masukkan PIN" maxlength="20" /></div>';
    html +=       '<div class="login-error" id="loginError"></div>';
    html +=       '<button class="login-btn" id="loginBtn">Masuk</button>';
    html +=       '<button class="btn" id="loginCancel" style="width:100%;justify-content:center;margin-top:8px">Batal (Lanjut sebagai Tamu)</button>';
    html +=       '<div class="login-hint">Hubungi admin jika lupa PIN</div>';
    html +=     '</div>';
    html +=   '</div>';
    html += '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
  },

  showLoginForm: function() {
    this.ensureOverlay();
    var ov = document.getElementById('loginOverlay');
    if (!ov) return;
    ov.style.display = 'flex';
    var u = document.getElementById('loginUser');
    var p = document.getElementById('loginPin');
    var err = document.getElementById('loginError');
    if (u) u.value = '';
    if (p) p.value = '';
    if (err) { err.style.display = 'none'; err.textContent = ''; }
    var btn = document.getElementById('loginBtn');
    if (btn) { btn.disabled = false; btn.textContent = 'Masuk'; }
    var cancel = document.getElementById('loginCancel');
    if (cancel) cancel.onclick = function() { MultiUser.hideLoginScreen(); };
    this.bindLoginEvents();
    setTimeout(function() { if (u) u.focus(); }, 100);
  },

  hideLoginScreen: function() {
    var ov = document.getElementById('loginOverlay');
    if (ov) ov.style.display = 'none';
  },

  bindLoginEvents: function() {
    var self = this;
    var btn = document.getElementById('loginBtn');
    var u = document.getElementById('loginUser');
    var p = document.getElementById('loginPin');
    if (btn && !btn._muBound) { btn._muBound = true; btn.onclick = function() { self.attemptLogin(); }; }
    if (u && !u._muBound) { u._muBound = true; u.onkeydown = function(e) { if (e.key === 'Enter') { var pp = document.getElementById('loginPin'); if (pp) pp.focus(); } }; }
    if (p && !p._muBound) { p._muBound = true; p.onkeydown = function(e) { if (e.key === 'Enter') self.attemptLogin(); }; }
  },

  attemptLogin: async function() {
    var u = document.getElementById('loginUser');
    var p = document.getElementById('loginPin');
    var btn = document.getElementById('loginBtn');
    var err = document.getElementById('loginError');
    var username = String((u || {}).value || '').trim().toLowerCase();
    var pin = String((p || {}).value || '').trim();
    if (!username || !pin) { this.showError('Username & PIN wajib diisi'); return; }
    if (btn) { btn.disabled = true; btn.textContent = 'Memproses...'; }
    if (err) { err.style.display = 'none'; }
    try {
      var res = await callApi('login', { username: username, pin: pin });
      if (!res || !res.ok) {
        this.showError((res && res.message) || 'Login gagal');
        if (btn) { btn.disabled = false; btn.textContent = 'Masuk'; }
        return;
      }
      if (res.session && res.session.token) {
        localStorage.setItem(this.SESSION_KEY, res.session.token);
        APP_STATE.sessionToken = res.session.token;
      }
      APP_STATE.user = res.user;
      console.log('[MultiUser] Login success:', res.user.username, '/', res.user.role);
      this.hideLoginScreen();
      toast('Selamat datang, ' + (res.user.nama || res.user.username));
      this.renderBadge(res.user);
      if (typeof onLoginSuccess === 'function') onLoginSuccess(res.user);
      var self = this;
      setTimeout(function() { self.applyRBAC(); }, 700);
    } catch (e) {
      this.showError('Error: ' + (e.message || e));
      if (btn) { btn.disabled = false; btn.textContent = 'Masuk'; }
    }
  },

  showError: function(msg) {
    var err = document.getElementById('loginError');
    if (!err) return;
    err.textContent = msg;
    err.style.display = 'block';
  },

  /* ═══════════════════════════════════════════════════════════
     ENTER AS GUEST (default view) — INSTAN, tanpa reload
     ═══════════════════════════════════════════════════════════ */
  enterAsGuest: function() {
    var guest = Object.assign({}, this.GUEST_USER);
    APP_STATE.user = guest;
    APP_STATE.sessionToken = null;
    this.hideLoginScreen();
    console.log('[MultiUser] Entered as GUEST (role: owner, read-only)');
    this.renderBadge(guest);

    var self = this;
    var hasData = DB.projects && DB.projects.length > 0;

    if (hasData) {
      // Data sudah ada → langsung apply RBAC
      setTimeout(function() { self.applyRBAC(); }, 100);
    } else {
      // First load → pull dulu
      if (typeof pullFromSheet === 'function') {
        pullFromSheet().then(function() {
          setTimeout(function() { self.applyRBAC(); }, 200);
        });
      } else {
        setTimeout(function() { self.applyRBAC(); }, 300);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     LOGOUT — INSTAN tanpa reload → langsung reset ke guest
     ═══════════════════════════════════════════════════════════ */
  logout: async function() {
    if (!confirm('Logout dari akun ini?\n\nAnda akan kembali ke tampilan Tamu (read-only).')) return;

    var token = localStorage.getItem(this.SESSION_KEY);
    if (token) { try { await callApi('logout', { token: token }); } catch (e) {} }

    // Clear semua state
    localStorage.removeItem(this.SESSION_KEY);
    APP_STATE.user = null;
    APP_STATE.sessionToken = null;
    APP_STATE.activeProjectId = null;
    APP_STATE.activeTab = 'dashboard';

    // Reset UI tanpa reload
    toast('Logout berhasil. Mode Tamu aktif.', 'warn');
    this.enterAsGuest();
  },

  /* ═══════════════════════════════════════════════════════════
     RBAC HELPERS
     ═══════════════════════════════════════════════════════════ */
  getConfig: function() {
    var role = (APP_STATE.user && APP_STATE.user.role || '').toLowerCase();
    return this.ROLE_CONFIG[role] || this.ROLE_CONFIG.owner;
  },
  canAccessTab: function(tabId) { return this.getConfig().tabs.indexOf(tabId) >= 0; },
  canEdit: function() { return this.getConfig().canEdit; },
  isGuest: function() {
    var u = APP_STATE.user || {};
    return !u.username || u.username === '__guest__';
  },

  canAccessProject: function(projectId) {
    var cfg = this.getConfig();
    if (cfg.projectScope === 'all') return true;
    var u = APP_STATE.user || {};
    var raw = String(u.project_ids || '').trim();
    if (raw === '*') return true;

    var allowed = Array.isArray(u.project_ids)
      ? u.project_ids.map(String)
      : raw.split(',').map(function(s) { return s.trim(); }).filter(Boolean);

    // 1) Match langsung by internal id
    if (allowed.indexOf(String(projectId)) >= 0) return true;

    // 2) Match tidak langsung by KODE proyek
    var proj = findById(DB.projects, projectId);
    if (proj && proj.kode) {
      if (allowed.indexOf(String(proj.kode)) >= 0) return true;
      // 3) Case-insensitive fallback
      var lower = allowed.map(function(x) { return x.toLowerCase(); });
      if (lower.indexOf(String(proj.kode).toLowerCase()) >= 0) return true;
    }

    return false;
  },

  getAllowedProjects: function() {
    var self = this;
    return (DB.projects || []).filter(function(p) { return self.canAccessProject(p.id); });
  },

  /* ═══════════════════════════════════════════════════════════
     APPLY RBAC
     ═══════════════════════════════════════════════════════════ */
  applyRBAC: function() {
    if (!APP_STATE.user) return;
    var cfg = this.getConfig();
    var role = (APP_STATE.user.role || '').toLowerCase();
    var isGuest = this.isGuest();

    console.log('[RBAC] role=' + role + ' | guest=' + isGuest +
                ' | tabs=' + cfg.tabs.length + ' | edit=' + cfg.canEdit +
                ' | scope=' + cfg.projectScope);

    this.applyBodyClass(role, isGuest);
    this.applyTabVisibility(cfg);
    this.applyEditButtons(cfg);
    this.applyProjectSelector();
    this.applyUsersSection(cfg);
    this.applyReadOnlyBanner(cfg, isGuest);
    this.redirectIfCurrentTabHidden(cfg);
    this.wrapRenderFunctions();

    // ── FIX MASALAH 1: Re-apply project selector setelah pull selesai ──
    // Retry beberapa kali untuk handle race condition
    var self = this;
    [300, 800, 1500, 3000].forEach(function(ms) {
      setTimeout(function() {
        if (APP_STATE.user) self.applyProjectSelector();
      }, ms);
    });
  },

  applyBodyClass: function(role, isGuest) {
    document.body.classList.remove('role-superadmin', 'role-admin', 'role-user', 'role-owner');
    document.body.classList.add('role-' + role);
    if (isGuest) document.body.classList.add('is-guest');
    else document.body.classList.remove('is-guest');
  },

  applyTabVisibility: function(cfg) {
    document.querySelectorAll('.tab').forEach(function(tab) {
      var tabId = tab.dataset.tab;
      var allowed = cfg.tabs.indexOf(tabId) >= 0;
      tab.style.display = allowed ? '' : 'none';
    });
  },

  applyEditButtons: function(cfg) {
    if (cfg.canEdit) {
      this.EDIT_BTN_IDS.forEach(function(id) {
        var el = document.getElementById(id);
        if (el && el.getAttribute('data-rbac-hidden') === '1') {
          el.style.display = '';
          el.removeAttribute('data-rbac-hidden');
        }
      });
      return;
    }
    this.EDIT_BTN_IDS.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) { el.style.display = 'none'; el.setAttribute('data-rbac-hidden', '1'); }
    });
  },

  applyProjectSelector: function() {
    var sel = document.getElementById('activeProject');
    if (!sel) return;
    // Skip kalau data belum di-pull (hindari warning palsu)
    if (!DB.projects || !DB.projects.length) return;
    var allowed = this.getAllowedProjects();
    var current = APP_STATE.activeProjectId;

    var allowedIds = allowed.map(function(p) { return String(p.id); });

    // ── Filter ketat untuk role `user` (projectScope: assigned) ──
    // Simpan state selected yang lama kalau masih valid
    var prevSelected = sel.value;
    var keepId = (allowedIds.indexOf(String(current)) >= 0) ? String(current)
               : (allowedIds.indexOf(String(prevSelected)) >= 0) ? String(prevSelected)
               : (allowed.length ? allowed[0].id : null);

    sel.innerHTML = '';
    if (!allowed.length) {
      var opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '(tidak ada proyek yang dapat diakses)';
      sel.appendChild(opt);
      APP_STATE.activeProjectId = null;
      console.warn('[RBAC] No allowed projects. User project_ids:',
                   APP_STATE.user && APP_STATE.user.project_ids);
      return;
    }
    allowed.forEach(function(p) {
      var o = document.createElement('option');
      o.value = p.id;
      o.textContent = (p.kode || '') + ' — ' + (p.nama || '');
      if (String(p.id) === String(keepId)) o.selected = true;
      sel.appendChild(o);
    });

    APP_STATE.activeProjectId = keepId;
    sel.value = keepId;
  },

  applyUsersSection: function(cfg) {
    if (cfg.canManageUsers) {
      var tbl = document.getElementById('tblUsers');
      if (tbl) {
        var p2 = tbl.closest('.panel');
        if (p2 && p2.getAttribute('data-rbac-hidden') === '1') {
          p2.style.display = '';
          p2.removeAttribute('data-rbac-hidden');
        }
      }
      return;
    }
    var t2 = document.getElementById('tblUsers');
    if (!t2) return;
    var panel2 = t2.closest('.panel');
    if (panel2) {
      panel2.style.display = 'none';
      panel2.setAttribute('data-rbac-hidden', '1');
    }
    var btn = document.getElementById('btnAddUser');
    if (btn) { btn.style.display = 'none'; btn.setAttribute('data-rbac-hidden', '1'); }
  },

  applyReadOnlyBanner: function(cfg, isGuest) {
    var old = document.querySelector('.rbac-banner');
    if (old) old.remove();
    if (cfg.canEdit) return;

    var main = document.querySelector('main');
    if (!main) return;
    var banner = document.createElement('div');
    banner.className = 'rbac-banner';
    banner.style.cssText = 'margin:14px 22px 0;padding:11px 14px;background:rgba(47,129,247,0.10);border-left:4px solid #2f81f7;border-radius:8px;font-size:12.5px;line-height:1.5;color:#e6edf7;display:flex;gap:10px;align-items:flex-start';
    var label = isGuest
      ? 'Anda menjelajah sebagai <b>Tamu</b> (read-only). Klik <b>🔑 Login</b> di kanan atas untuk mengedit.'
      : 'Anda login sebagai <b>' + esc(APP_STATE.user.nama || APP_STATE.user.username) + '</b> (role <b>' + esc(cfg.label) + '</b>). Semua aksi tambah/edit/hapus dinonaktifkan.';
    banner.innerHTML = '<span style="font-size:16px">ℹ️</span><div><b>Mode Read-Only</b> — ' + label + '</div>';
    main.insertAdjacentHTML('afterbegin', banner);
  },

  redirectIfCurrentTabHidden: function(cfg) {
    var activeTab = APP_STATE.activeTab || 'dashboard';
    if (cfg.tabs.indexOf(activeTab) < 0 && typeof switchTab === 'function') {
      switchTab('dashboard');
    }
  },

  wrapRenderFunctions: function() {
    if (this._wrapped) return;
    var self = this;
    var fns = ['renderProjects','renderResources','renderAhsp','renderWbs','renderSettings','renderSchedule','renderExecutive','renderDashboard'];
    fns.forEach(function(name) {
      var orig = window[name];
      if (typeof orig === 'function' && !orig._rbacWrapped) {
        window[name] = function() {
          var r = orig.apply(this, arguments);
          setTimeout(function() { self.quickReapply(); }, 0);
          return r;
        };
        window[name]._rbacWrapped = true;
      }
    });
    this._wrapped = true;
  },

  quickReapply: function() {
    if (!APP_STATE.user) return;
    var cfg = this.getConfig();
    this.applyEditButtons(cfg);
    this.applyUsersSection(cfg);
  },

  /* ═══════════════════════════════════════════════════════════
     RENDER USER BADGE
     ═══════════════════════════════════════════════════════════ */
  renderBadge: function(user) {
    user = user || APP_STATE.user;
    var container = document.querySelector('.topbar-right');
    if (!container) return;
    var old = container.querySelector('.user-badge');
    if (old) old.remove();

    var isGuest = !user || !user.username || user.username === '__guest__';
    var badge = document.createElement('div');
    badge.className = 'user-badge';
    badge.style.cssText = 'display:inline-flex;align-items:center;gap:8px;padding:5px 10px 5px 12px;background:linear-gradient(135deg,' +
      (isGuest ? 'rgba(148,163,184,.15),rgba(100,116,139,.06)' : 'rgba(168,85,247,.12),rgba(124,58,237,.06)') +
      ');border:1px solid ' + (isGuest ? 'rgba(148,163,184,.35)' : 'rgba(168,85,247,.3)') +
      ';border-radius:20px;font-size:12px;font-weight:600;color:#e6edf7;white-space:nowrap';

    if (isGuest) {
      badge.innerHTML =
        '<span class="user-icon" style="font-size:14px">👤</span>' +
        '<span class="user-name" style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Tamu</span>' +
        '<span class="user-role" style="padding:2px 8px;border-radius:10px;background:rgba(148,163,184,.25);color:#cbd5e1;font-size:9.5px;font-weight:800;letter-spacing:.4px">GUEST</span>' +
        '<button title="Login sebagai Admin/User" ' +
        'style="background:linear-gradient(135deg,#2f81f7,#1f6fe0);border:none;color:#fff;cursor:pointer;font-size:11px;font-weight:700;padding:4px 10px;border-radius:5px;margin-left:4px" ' +
        'onclick="MultiUser.showLoginForm()">🔑 Login</button>';
    } else {
      badge.innerHTML =
        '<span class="user-icon" style="font-size:14px">👤</span>' +
        '<span class="user-name" style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(user.nama || user.username) + '</span>' +
        '<span class="user-role" style="padding:2px 8px;border-radius:10px;background:rgba(168,85,247,.25);color:#d8b4fe;font-size:9.5px;font-weight:800;letter-spacing:.4px;text-transform:uppercase">' + esc(user.role || 'user') + '</span>' +
        '<button title="Logout" ' +
        'style="background:transparent;border:none;color:#8fa3c4;cursor:pointer;font-size:14px;padding:2px 4px;border-radius:4px" ' +
        'onclick="MultiUser.logout()">⏻</button>';
    }

    container.appendChild(badge);
  }
};

window.MultiUser = MultiUser;

/* ═══════════════════════════════════════════════════════════
   OVERRIDE AppJs FUNCTIONS
   ═══════════════════════════════════════════════════════════ */

window.showLoginScreen = function() {
  MultiUser.enterAsGuest();
};

window.renderUserBadge = function(user) {
  MultiUser.renderBadge(user);
};

window.doLogout = async function() {
  await MultiUser.logout();
};

/* ═══════════════════════════════════════════════════════════
   FIX MASALAH 1: Wrap pullFromSheet → re-apply selector setelah pull selesai
   ═══════════════════════════════════════════════════════════ */
(function() {
  var origPull = window.pullFromSheet;
  if (typeof origPull === 'function') {
    window.pullFromSheet = function() {
      var promise = origPull.apply(this, arguments);
      if (promise && typeof promise.then === 'function') {
        return promise.then(function(result) {
          setTimeout(function() {
            if (APP_STATE.user) MultiUser.applyProjectSelector();
          }, 50);
          return result;
        });
      }
      return promise;
    };
    console.log('[MultiUser] pullFromSheet wrapped — auto re-filter project selector');
  } else {
    setTimeout(function() {
      var o2 = window.pullFromSheet;
      if (typeof o2 === 'function' && !o2._muWrapped) {
        window.pullFromSheet = function() {
          var p = o2.apply(this, arguments);
          if (p && typeof p.then === 'function') {
            return p.then(function(r) {
              setTimeout(function() {
                if (APP_STATE.user) MultiUser.applyProjectSelector();
              }, 50);
              return r;
            });
          }
          return p;
        };
        window.pullFromSheet._muWrapped = true;
      }
    }, 200);
  }
})();

/* ═══════════════════════════════════════════════════════════
   Wrap onLoginSuccess untuk apply RBAC setelah pull selesai
   ═══════════════════════════════════════════════════════════ */
(function() {
  var orig = window.onLoginSuccess;
  if (typeof orig === 'function') {
    window.onLoginSuccess = function(user) {
      orig.call(this, user);
      setTimeout(function() { MultiUser.applyRBAC(); }, 700);
    };
    console.log('[MultiUser] onLoginSuccess wrapped');
  } else {
    setTimeout(function() {
      var o2 = window.onLoginSuccess;
      if (typeof o2 === 'function' && !o2._muWrapped) {
        window.onLoginSuccess = function(user) {
          o2.call(this, user);
          setTimeout(function() { MultiUser.applyRBAC(); }, 700);
        };
        window.onLoginSuccess._muWrapped = true;
      }
    }, 200);
  }
})();

console.log('[MultiUserJs] Module loaded — RBAC v4 FINAL (guest default + auto-filter + instan logout).');
</script>
