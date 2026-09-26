<script>
var SyncManager = {
  INTERVAL: 60000,
  _timer: null,
  _lastVer: -1,
  _dismiss: 0,
  _inited: false,
  init: function() {
    if (this._inited) return;
    this._inited = true;
    this._lastVer = APP_STATE.lastSyncVersion || 0;
    var s = this;
    this._timer = setInterval(function(){ s.check(); }, this.INTERVAL);
    console.log('[Sync] Started. Baseline v' + this._lastVer);
  },
  check: async function() {
    try {
      var r = await callApi('softStatus', {});
      if (!r || !r.ok) return;
      var sv = r.dbVersion || 0;
      if (sv > this._lastVer) {
        console.log('[Sync] Server v' + sv + ' > client v' + this._lastVer);
        this.onUpdate(sv);
      }
    } catch(e) { console.warn('[Sync] Check fail:', e.message); }
  },
  onUpdate: function(sv) {
    if (Date.now() < this._dismiss) return;
    this.showBanner(sv, APP_STATE.isDirty);
  },
  accept: function() {
    this.hideBanner();
    if (typeof pullFromSheet === 'function') {
      pullFromSheet().then(function() {
        SyncManager._lastVer = APP_STATE.lastSyncVersion || 0;
      });
    }
  },
  dismiss: function() {
    this.hideBanner();
    this._dismiss = Date.now() + 300000;
  },
  hideBanner: function() {
    var el = document.getElementById('syncBanner');
    if (el) el.remove();
  }
};
window.SyncManager = SyncManager;
console.log('[SyncCore] loaded.');
</script>
