<script>
var Autosave = {
  KEY: 'mk_draft_v1',
  INTERVAL: 30000,
  _timer: null,
  _lastHash: '',
  init: function() {
    if (this._inited) return;
    this._inited = true;
    this.tick();
    var s = this;
    this._timer = setInterval(function(){ s.tick(); }, this.INTERVAL);
    window.addEventListener('beforeunload', function(){ s.saveNow(); });
    document.addEventListener('visibilitychange', function(){
      if (document.hidden) s.saveNow();
    });
    console.log('[Autosave] Started (30s interval).');
  },
  hash: function() {
    try {
      var m = (DB.project_wbs || []).length + '|' +
              (DB.progress || []).length + '|' +
              (DB.master_resources || []).length + '|' +
              (DB.projects || []).length + '|' +
              (APP_STATE.isDirty ? '1' : '0');
      return m;
    } catch(e) { return ''; }
  },
  tick: function() {
    var h = this.hash();
    if (h && h !== this._lastHash) {
      this._lastHash = h;
      if (APP_STATE.isDirty) this.saveNow();
    }
  },
  saveNow: function() {
    if (!APP_STATE.isDirty) return false;
    try {
      var draft = {
        ts: new Date().toISOString(),
        user: APP_STATE.user ? APP_STATE.user.username : 'guest',
        db: DB,
        settings: SETTINGS,
        activeProjectId: APP_STATE.activeProjectId
      };
      localStorage.setItem(this.KEY, JSON.stringify(draft));
      this.updateUI(draft.ts);
      return true;
    } catch(e) {
      console.warn('[Autosave] Save failed:', e.message);
      return false;
    }
  }
};
window.Autosave = Autosave;
console.log('[AutosaveCore] Module loaded.');
</script>
