<script>
/* =====================================================================
   AppJs.html — CORE APPLICATION MODULE
   Fondasi utama: state, routing, helpers, dan inisialisasi.
   ===================================================================== */

/* =====================================================================
   BAGIAN 1 — GLOBAL STATE & KONSTANTA APLIKASI
   ===================================================================== */
var DB = {
  master_resources: [],
  ahsp_headers: [],
  ahsp_details_master: [],
  projects: [],
  project_ahsp_details: [],
  project_wbs: [],
  progress: [],
  working_calendars: [],
  holidays: [],
  project_users: [],
  change_log: [],
  sessions: []
};

var SETTINGS = {
  overhead_default: 0,
  ppn_default: 11,
  activeProjectId: null
};

var APP_STATE = {
  activeTab: 'dashboard',
  isDirty: false,
  lastSyncVersion: 0,
  clientId: null,
  user: null,          // { username, nama, role, project_ids }
  sessionToken: null,
  history: [],          // riwayat undo/redo
  historyIndex: -1
};

/* =====================================================================
   BAGIAN 2 — HELPER UTILITY (angka, format, DOM)
   ===================================================================== */

/** Parse ke number dengan aman */
function num(v){
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return isFinite(n) ? n : 0;
}

/** Format angka ke Rupiah */
function fmtRp(v){
  const n = num(v);
  return 'Rp ' + n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

/** Format angka biasa dengan pemisah ribuan */
function fmtNum(v, dec){
  const n = num(v);
  return n.toLocaleString('id-ID', {
    minimumFractionDigits: dec || 0,
    maximumFractionDigits: dec || 0
  });
}

/** Format tanggal ISO ke tampilan lokal */
function fmtDate(iso){
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
  } catch(e){ return iso; }
}

/** Escape HTML */
function esc(s){
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Buat element dengan cepat */
function el(tag, attrs, children){
  const e = document.createElement(tag);
  if (attrs) {
    Object.keys(attrs).forEach(k => {
      if (k === 'className') e.className = attrs[k];
      else if (k === 'style') e.style.cssText = attrs[k];
      else if (k.startsWith('on') && typeof attrs[k] === 'function') {
        e.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      } else if (k === 'innerHTML') e.innerHTML = attrs[k];
      else if (k === 'textContent') e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
  }
  if (children) {
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (typeof c === 'string' || typeof c === 'number') {
        e.appendChild(document.createTextNode(c));
      } else if (c instanceof HTMLElement) {
        e.appendChild(c);
      }
    });
  }
  return e;
}

/** Cari item di DB berdasarkan id */
function findById(arr, id){
  if (!arr || !id) return null;
  return arr.find(x => String(x.id) === String(id)) || null;
}

/** Ambil proyek aktif */
function getActiveProject(){
  return findById(DB.projects, APP_STATE.activeProjectId);
}

/* =====================================================================
   BAGIAN 3 — ROUTING TAB
   ===================================================================== */

/**
 * Ganti tab aktif.
 * @param {string} tabId — data-tab dari elemen .tab
 */
function switchTab(tabId){
  // Update kelas aktif di nav
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabId);
  });

  // Tampilkan section yang sesuai
  document.querySelectorAll('.section').forEach(s => {
    s.classList.toggle('active', s.id === 'sec-' + tabId);
  });

  APP_STATE.activeTab = tabId;

  // Trigger render ulang khusus per tab
  if (typeof onTabChanged === 'function') {
    onTabChanged(tabId);
  }
}

/** Callback saat tab berubah — bisa di-override modul lain */
function onTabChanged(tabId){
  switch(tabId){
    case 'dashboard':
      if (typeof renderDashboard === 'function') renderDashboard();
      break;
    case 'executive':
      if (typeof renderExecutive === 'function') renderExecutive();
      break;
    case 'resources':
      if (typeof renderResources === 'function') renderResources();
      break;
    case 'ahsp':
      if (typeof renderAhsp === 'function') renderAhsp();
      break;
    case 'wbs':
      if (typeof renderWbs === 'function') renderWbs();
      break;
    case 'schedule':
      if (typeof renderSchedule === 'function') renderSchedule();
      break;
    case 'calendar':
      if (typeof renderCalendars === 'function') renderCalendars();
      break;
    case 'holidays':
      if (typeof renderHolidays === 'function') renderHolidays();
      break;
    case 'analysis':
      if (typeof renderAnalysis === 'function') renderAnalysis();
      break;
    case 'progress':
      if (typeof renderProgress === 'function') renderProgress();
      break;
    case 'recon':
      if (typeof renderRecon === 'function') renderRecon();
      break;
    case 'lembar':
      if (typeof renderLembar === 'function') renderLembar();
      break;
    case 'projects':
      if (typeof renderProjects === 'function') renderProjects();
      break;
    case 'settings':
      if (typeof renderSettings === 'function') renderSettings();
      break;
  }
}

/* =====================================================================
   BAGIAN 4 — TOAST & MODAL HELPERS
   ===================================================================== */

/** Tampilkan toast notification */
function toast(msg, type){
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast show';
  if (type === 'error') t.style.borderLeftColor = 'var(--danger)';
  else if (type === 'warn') t.style.borderLeftColor = 'var(--warn)';
  else t.style.borderLeftColor = 'var(--ok)';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => { t.classList.remove('show'); }, 3200);
}

/** Buka modal */
function openModal(title, bodyHtml, onSubmit){
  document.getElementById('mTitle').textContent = title;
  document.getElementById('mBody').innerHTML = bodyHtml;
  document.getElementById('overlay').classList.add('show');
  window._modalSubmit = onSubmit || null;
}

/** Tutup modal */
function closeModal(){
  document.getElementById('overlay').classList.remove('show');
  window._modalSubmit = null;
}

/* =====================================================================
   BAGIAN 5 — SYNCHRONIZATION (PUSH / PULL)
   ===================================================================== */

/** Inisialisasi clientId unik */
function initClientId(){
  let cid = localStorage.getItem('mk_client_id');
  if (!cid) {
    cid = 'client_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem('mk_client_id', cid);
  }
  APP_STATE.clientId = cid;
  const el = document.getElementById('clientIdLabel');
  if (el) el.textContent = cid;
}

/**
 * Panggil backend Apps Script via google.script.run.
 * @param {string} action
 * @param {object} payload
 * @returns {Promise<object>}
 */
function callApi(action, payload){
  return new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler(res => {
        try {
          const data = typeof res === 'string' ? JSON.parse(res) : res;
          resolve(data);
        } catch(e) {
          reject(new Error('Response tidak valid: ' + e.message));
        }
      })
      .withFailureHandler(err => reject(err))
      .doPostApi(action, payload || {});
  });
}

/** Pull data dari Sheet */
async function pullFromSheet(){
  if (typeof showLoading === 'function') showLoading('Menarik data dari Sheet...');
  try {
    const res = await callApi('pull', {});
    if (!res.ok) throw new Error(res.message || 'Gagal pull');

    DB = res.db || DB;
    SETTINGS = Object.assign(SETTINGS, res.settings || {});
    APP_STATE.lastSyncVersion = res.dbVersion || 0;
    APP_STATE.isDirty = false;

    updateSyncIndicator('ok');
    updateDbVersionLabel();

    // Render ulang tab aktif
        onTabChanged(APP_STATE.activeTab);
    toast('✅ Data berhasil ditarik dari Sheet');

    /* ── DEBUG: log state DB setelah pull selesai ── */
    console.log('════════ PULL SUCCESS — DB STATE ════════');
    console.log('Projects           :', (DB.projects || []).length);
    console.log('Master Resources   :', (DB.master_resources || []).length);
    console.log('AHSP Headers       :', (DB.ahsp_headers || []).length);
    console.log('Project WBS        :', (DB.project_wbs || []).length);
    console.log('Project AHSP Detail:', (DB.project_ahsp_details || []).length);
    console.log('Progress           :', (DB.progress || []).length);
    console.log('Working Calendars  :', (DB.working_calendars || []).length);
    console.log('Holidays           :', (DB.holidays || []).length);
    console.log('Project Users      :', (DB.project_users || []).length);
    console.log('Sample project[0]  :', (DB.projects || [])[0]);
    console.log('══════════════════════════════════════════');

  } catch(err) {
    updateSyncIndicator('err');
    toast('❌ Pull gagal: ' + err.message, 'error');
  } finally {
    if (typeof hideLoading === 'function') hideLoading();
  }
}

/** Push data ke Sheet */
async function pushToSheet(){
  if (typeof showLoading === 'function') showLoading('Mengirim data ke Sheet...');
  try {
    const res = await callApi('push', {
      db: DB,
      settings: SETTINGS,
      baseVersion: APP_STATE.lastSyncVersion,
      clientId: APP_STATE.clientId
    });

    if (!res.ok) {
      if (res.code === 'CONFLICT') {
        toast('⚠️ Konflik versi: ' + res.message, 'warn');
      } else if (res.code === 'LOCKED') {
        toast('🔒 ' + res.message, 'warn');
      } else {
        throw new Error(res.message || 'Gagal push');
      }
      return;
    }

    APP_STATE.lastSyncVersion = res.dbVersion || 0;
    APP_STATE.isDirty = false;
    updateSyncIndicator('ok');
    updateDbVersionLabel();
    toast('✅ ' + (res.message || 'Data tersimpan ke Sheet'));
  } catch(err) {
    updateSyncIndicator('err');
    toast('❌ Push gagal: ' + err.message, 'error');
  } finally {
    if (typeof hideLoading === 'function') hideLoading();
  }
}

/** Update indikator live sync */
function updateSyncIndicator(status){
  const el = document.getElementById('liveIndicator');
  if (!el) return;
  el.classList.remove('is-ok', 'is-warn', 'is-err', 'is-syncing');
  if (status === 'ok') el.classList.add('is-ok');
  else if (status === 'warn') el.classList.add('is-warn');
  else if (status === 'err') el.classList.add('is-err');
  else if (status === 'syncing') el.classList.add('is-syncing');

  const txt = el.querySelector('.live-text');
  if (txt) {
    txt.textContent = status === 'ok' ? 'Live' :
                      status === 'warn' ? 'Pending' :
                      status === 'err' ? 'Offline' : 'Sync...';
  }
}

/** Tandai ada perubahan lokal */
function markDirty(){
  APP_STATE.isDirty = true;
  updateSyncIndicator('warn');
}

/** Update label versi DB */
function updateDbVersionLabel(){
  const el = document.getElementById('dbVersionLabel');
  if (el) el.textContent = 'v' + APP_STATE.lastSyncVersion;
}

/* =====================================================================
   BAGIAN 6 — INISIALISASI APLIKASI
   ===================================================================== */

/** Entry point utama — dipanggil saat DOM siap */
async function appInit(){
  console.log('[AppJs] Inisialisasi aplikasi...');

  // 1. Set clientId
  initClientId();

  // 2. Cek session / login
  const token = localStorage.getItem('mk_session_token');
  if (token) {
    APP_STATE.sessionToken = token;
    try {
      const res = await callApi('getSession', { token: token });
      if (res.ok && res.user) {
        APP_STATE.user = res.user;
        onLoginSuccess(res.user);
      } else {
        // Session expired
        localStorage.removeItem('mk_session_token');
        showLoginScreen();
      }
    } catch(e) {
      showLoginScreen();
    }
  } else {
    showLoginScreen();
  }
}

/** Callback setelah login sukses */
function onLoginSuccess(user){
  APP_STATE.user = user;

  // Sembunyikan login, tampilkan app
  const loginEl = document.getElementById('loginOverlay');
  if (loginEl) loginEl.style.display = 'none';

  // Render user badge
  renderUserBadge(user);

  // Pull data
  pullFromSheet().then(() => {
    // Update dropdown proyek aktif
    populateProjectSelect();
    // Set proyek default
    const projects = DB.projects || [];
    if (projects.length > 0 && !APP_STATE.activeProjectId) {
      APP_STATE.activeProjectId = projects[0].id;
    }
    // Render dashboard awal
    switchTab('dashboard');
  });
}

/** Render badge user di topbar */
function renderUserBadge(user){
  const container = document.querySelector('.topbar-right');
  if (!container) return;

  // Hapus badge lama kalau ada
  const old = container.querySelector('.user-badge');
  if (old) old.remove();

  const badge = el('div', { className: 'user-badge' }, [
    el('span', { className: 'user-icon', textContent: '👤' }),
    el('span', { className: 'user-name', textContent: user.nama || user.username }),
    el('span', { className: 'user-role', textContent: user.role || 'user' }),
    el('button', {
      className: 'user-logout',
      title: 'Logout',
      textContent: '⏻',
      onclick: () => doLogout()
    })
  ]);

  container.appendChild(badge);
}

/** Logout */
async function doLogout(){
  if (!confirm('Yakin ingin logout?')) return;
  try {
    await callApi('logout', { token: APP_STATE.sessionToken });
  } catch(e) { /* ignore */ }
  localStorage.removeItem('mk_session_token');
  APP_STATE.user = null;
  APP_STATE.sessionToken = null;
  location.reload();
}

/** Tampilkan layar login */
function showLoginScreen(){
  const loginEl = document.getElementById('loginOverlay');
  if (loginEl) loginEl.style.display = 'flex';
}

/** Isi dropdown proyek aktif */
function populateProjectSelect(){
  const sel = document.getElementById('activeProject');
  if (!sel) return;
  sel.innerHTML = '';
  (DB.projects || []).forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = (p.kode || '') + ' — ' + (p.nama || '');
    if (p.id === APP_STATE.activeProjectId) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', function(){
    APP_STATE.activeProjectId = this.value;
    onTabChanged(APP_STATE.activeTab);
  });
}

/* =====================================================================
   BAGIAN 7 — EVENT BINDING GLOBAL
   ===================================================================== */

function bindGlobalEvents(){
  // Tab navigation
  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => switchTab(t.dataset.tab));
  });

  // Mobile menu
  const mobBtn = document.getElementById('mobileMenuBtn');
  if (mobBtn) {
    mobBtn.addEventListener('click', () => {
      document.getElementById('mainTabs').classList.toggle('open');
    });
  }

  // Modal close
  const mClose = document.getElementById('mClose');
  if (mClose) mClose.addEventListener('click', closeModal);
  const mCancel = document.getElementById('mCancel');
  if (mCancel) mCancel.addEventListener('click', closeModal);

  // Modal submit
  const mSubmit = document.getElementById('mSubmit');
  if (mSubmit) {
    mSubmit.addEventListener('click', () => {
      if (typeof window._modalSubmit === 'function') {
        window._modalSubmit();
      }
    });
  }

  // Overlay click to close
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  // Settings buttons
  const btnPush = document.getElementById('btnPush');
  if (btnPush) btnPush.addEventListener('click', pushToSheet);
  const btnPull = document.getElementById('btnPull');
  if (btnPull) btnPull.addEventListener('click', pullFromSheet);

  // Proyek aktif
  const selProj = document.getElementById('activeProject');
  if (selProj) {
    selProj.addEventListener('change', function(){
      APP_STATE.activeProjectId = this.value;
      onTabChanged(APP_STATE.activeTab);
    });
  }

  // Live indicator click → pull
  const liveInd = document.getElementById('liveIndicator');
  if (liveInd) {
    liveInd.addEventListener('click', pullFromSheet);
  }
}

/* =====================================================================
   BAGIAN 8 — BOOTSTRAP
   ===================================================================== */

// Jalankan saat DOM siap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    bindGlobalEvents();
    appInit();
  });
} else {
  bindGlobalEvents();
  appInit();
}

// Expose ke window untuk modul lain
window.DB = DB;
window.SETTINGS = SETTINGS;
window.APP_STATE = APP_STATE;
window.num = num;
window.fmtRp = fmtRp;
window.fmtNum = fmtNum;
window.fmtDate = fmtDate;
window.esc = esc;
window.el = el;
window.findById = findById;
window.getActiveProject = getActiveProject;
window.switchTab = switchTab;
window.toast = toast;
window.openModal = openModal;
window.closeModal = closeModal;
window.callApi = callApi;
window.pullFromSheet = pullFromSheet;
window.pushToSheet = pushToSheet;
window.markDirty = markDirty;
window.updateSyncIndicator = updateSyncIndicator;

/* ── DEBUG: Expose DB ke parent window (bypass sandbox) ── */
try {
  if (window.parent && window.parent !== window) {
    window.parent._MK_DEBUG = {
      getDB: function(){ return DB; },
      getState: function(){ return APP_STATE; },
      dump: function(){
        console.log('DB dump:', JSON.stringify(DB, null, 2));
        return DB;
      }
    };
    console.log('[AppJs] ✅ Debug bridge installed at window.parent._MK_DEBUG');
  }
} catch(e) {
  console.warn('[AppJs] Cannot install debug bridge:', e.message);
}

console.log('[AppJs] Module loaded.');

</script>
