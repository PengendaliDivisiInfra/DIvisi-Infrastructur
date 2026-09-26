<script>
var Autosave = {
  KEY: 'mk_draft_v1',
  DEBOUNCE: 5000,
  _timer: null,
  _inited: false,

  init: function() {
    if (this._inited) return;
    this._inited = true;

    // Hook markDirty → auto-save 5s setelah perubahan terakhir
    var s = this;
    var origDirty = window.markDirty;
    if (typeof origDirty === 'function' && !origDirty._asWrapped) {
      window.markDirty = function() {
        origDirty.apply(this, arguments);
        s.scheduleSave();
      };
      window.markDirty._asWrapped = true;
    }

    window.addEventListener('beforeunload', function(){ s.saveNow(); });
    document.addEventListener('visibilitychange', function(){
      if (document.hidden) s.saveNow();
    });

    console.log('[Autosave] ✅ Init OK. Debounce 5s, hooks installed.');
  },

  scheduleSave: function() {
    clearTimeout(this._timer);
    var s = this;
    this._timer = setTimeout(function(){ s.saveNow(); }, this.DEBOUNCE);
    console.log('[Autosave] ⏳ Save scheduled in 5s...');
  },

  saveNow: function() {
    if (!APP_STATE || !APP_STATE.isDirty) {
      console.log('[Autosave] Skip (not dirty)');
      return false;
    }
    try {
      var draft = {
        ts: new Date().toISOString(),
        user: APP_STATE.user ? APP_STATE.user.username : 'guest',
        db: DB,
        settings: SETTINGS,
        activeProjectId: APP_STATE.activeProjectId
      };
      localStorage.setItem(this.KEY, JSON.stringify(draft));
      if (typeof this.updateUI === 'function') this.updateUI(draft.ts);
      console.log('[Autosave] 💾 Saved at', draft.ts);
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
