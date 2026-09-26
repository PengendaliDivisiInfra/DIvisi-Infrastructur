<script>
var SyncManager = {
  INTERVAL: 60000,
  _timer: null,
  _snap: {},          // { project_id: version }
  _dismiss: 0,
  _inited: false,
  _baselineVer: 0,

  init: function() {
    if (this._inited) return;
    this._inited = true;
    this._baselineVer = APP_STATE.lastSyncVersion || 0;
    var s = this;
    this._timer = setInterval(function(){ s.check(); }, this.INTERVAL);
    setTimeout(function(){ s.snapshot(); }, 3000);
    console.log('[Sync] Started. Baseline v' + this._baselineVer);
  },

  // Snapshot versi per-proyek saat ini
  snapshot: async function() {
    try {
      var r = await callApi('checkProjectVersions', {
        clientVersion: 0
      });
      if (r && r.ok && r.versions) {
        this._snap = {};
        var s = this;
        Object.keys(r.versions).forEach(function(pid) {
          s._snap[pid] = r.versions[pid].version;
        });
        console.log('[Sync] Snapshot captured for ' + Object.keys(this._snap).length + ' projects');
      }
    } catch(e) { console.warn('[Sync] Snapshot fail:', e.message); }
  },

  check: async function() {
    try {
      var r = await callApi('checkProjectVersions', {
        clientVersion: APP_STATE.lastSyncVersion || 0
      });
      if (!r || !r.ok) return;

      // Fast path: server bilang tidak ada perubahan
      if (r.unchanged) return;

      var versions = r.versions || {};
      var activeProject = APP_STATE.activeProjectId;
      var activeChanged = false;
      var otherChanged = [];

      var s = this;
      Object.keys(versions).forEach(function(pid) {
        var v = versions[pid].version;
        var prev = s._snap[pid];
        if (prev !== undefined && prev === v) return;   // tidak berubah
        if (prev === undefined) return;                 // proyek baru, skip

        // Ada perubahan — cek apakah user punya akses
        if (typeof MultiUser !== 'undefined' && MultiUser.canAccessProject(pid)) {
          if (pid === activeProject) activeChanged = true;
          else otherChanged.push(pid);
        }
      });

      // Update snapshot
      Object.keys(versions).forEach(function(pid) {
        s._snap[pid] = versions[pid].version;
      });

      if (activeChanged) {
        // Banner besar — proyek aktif berubah
        if (Date.now() < this._dismiss) return;
        this.showBanner(r.dbVersion, APP_STATE.isDirty, [activeProject]);
      } else if (otherChanged.length > 0) {
        // Toast kecil — proyek lain yang user punya akses
        toast('📥 ' + otherChanged.length + ' proyek lain di-update', 'warn');
      }
      // Kalau tidak ada yang user punya akses → silent

    } catch(e) {
      console.warn('[Sync] Check fail:', e.message);
    }
  },

  accept: function() {
    this.hideBanner();
    var s = this;
    if (typeof pullFromSheet === 'function') {
      pullFromSheet().then(function() {
        s.snapshot();   // refresh snapshot setelah pull
      });
    }
  },

  dismiss: function() {
    this.hideBanner();
    this._dismiss = Date.now() + 600000;   // 10 menit snooze
  },

  hideBanner: function() {
    var el = document.getElementById('syncBanner');
    if (el) el.remove();
  }
};
window.SyncManager = SyncManager;
console.log('[SyncCore] loaded.');
</script>
