<script>
var History = {
  MAX: 20,
  stack: [],
  idx: -1,
  _suppress: false,
  _inited: false,

  init: function() {
    if (this._inited) return;
    this._inited = true;
    var s = this;

    // Hook markDirty → push snapshot 'Edit'
    var origDirty = window.markDirty;
    if (typeof origDirty === 'function' && !origDirty._hsWrapped) {
      window.markDirty = function() {
        origDirty.apply(this, arguments);
        if (!s._suppress) s.push('Edit');
      };
      window.markDirty._hsWrapped = true;
    }

    // Hook pullFromSheet → push Initial setelah pull selesai
    var origPull = window.pullFromSheet;
    if (typeof origPull === 'function' && !origPull._hsWrapped) {
      window.pullFromSheet = function() {
        var p = origPull.apply(this, arguments);
        if (p && typeof p.then === 'function') {
          return p.then(function(r) {
            setTimeout(function() {
              if (s.stack.length === 0) {
                s.push('Initial');
                console.log('[History] 📸 Initial snapshot (from pull)');
              }
            }, 300);
            return r;
          });
        }
        return p;
      };
      window.pullFromSheet._hsWrapped = true;
    }

    // Fallback 5s: push Initial kalau belum ada
    setTimeout(function() {
      if (s.stack.length === 0) {
        s.push('Initial');
        console.log('[History] 📸 Initial snapshot (fallback)');
      }
    }, 5000);

    console.log('[History] ✅ Init OK, MAX=' + this.MAX);
  },

  snap: function(label) {
    return {
      ts: Date.now(),
      label: label || 'Edit',
      db: JSON.parse(JSON.stringify(DB)),
      settings: JSON.parse(JSON.stringify(SETTINGS)),
      activeProjectId: APP_STATE.activeProjectId
    };
  },

  push: function(label) {
    if (this.idx < this.stack.length - 1) {
      this.stack = this.stack.slice(0, this.idx + 1);
    }
    this.stack.push(this.snap(label));
    if (this.stack.length > this.MAX) this.stack.shift();
    this.idx = this.stack.length - 1;
    if (typeof this.updateUI === 'function') this.updateUI();
    console.log('[History] push:' + label + ' | idx=' + this.idx + ' | total=' + this.stack.length);
  },

  restore: function(s) {
    this._suppress = true;
    DB = s.db;
    SETTINGS = Object.assign(SETTINGS, s.settings || {});
    APP_STATE.activeProjectId = s.activeProjectId;
    APP_STATE.isDirty = true;
    window.DB = DB;
    window.SETTINGS = SETTINGS;
    var tab = APP_STATE.activeTab || 'dashboard';
    if (typeof onTabChanged === 'function') onTabChanged(tab);
    if (typeof populateProjectSelect === 'function') populateProjectSelect();
    var self = this;
    setTimeout(function() { self._suppress = false; }, 300);
  },

  undo: function() {
    if (this.idx <= 0) { toast('Tidak ada yang bisa di-undo', 'warn'); return; }
    this.idx--;
    this.restore(this.stack[this.idx]);
    toast('↶ Undo: ' + this.stack[this.idx].label);
    if (typeof this.updateUI === 'function') this.updateUI();
  },

  redo: function() {
    if (this.idx >= this.stack.length - 1) { toast('Tidak ada yang bisa di-redo', 'warn'); return; }
    this.idx++;
    this.restore(this.stack[this.idx]);
    toast('↷ Redo: ' + this.stack[this.idx].label);
    if (typeof this.updateUI === 'function') this.updateUI();
  },

  goto: function(i) {
    if (i < 0 || i >= this.stack.length) return;
    this.idx = i;
    this.restore(this.stack[i]);
    toast('↺ Kembali ke: ' + this.stack[i].label);
    if (typeof this.updateUI === 'function') this.updateUI();
  }
};
window.History = History;

// BOOTSTRAP
History.init();
console.log('[HistoryCore] loaded.');
</script>
