<script>
var History = {
  MAX: 20,
  stack: [],
  idx: -1,
  _suppress: false,

  init: function() {
    if (this._inited) return;
    this._inited = true;
    var s = this;
    this.push('Initial');

    // Hook markDirty → auto push snapshot
    var orig = window.markDirty;
    if (typeof orig === 'function' && !orig._hsWrapped) {
      window.markDirty = function() {
        orig.apply(this, arguments);
        if (!s._suppress) s.push('Edit');
      };
      window.markDirty._hsWrapped = true;
    }
    console.log('[History] ✅ Init OK, MAX=' + this.MAX);
  },

  snap: function() {
    return {
      ts: Date.now(),
      label: arguments[0] || 'Edit',
      db: JSON.parse(JSON.stringify(DB)),
      settings: JSON.parse(JSON.stringify(SETTINGS)),
      activeProjectId: APP_STATE.activeProjectId
    };
  },

  push: function(label) {
    // Hapus semua redo di depan
    if (this.idx < this.stack.length - 1) {
      this.stack = this.stack.slice(0, this.idx + 1);
    }
    this.stack.push(this.snap(label));
    if (this.stack.length > this.MAX) {
      this.stack.shift();
    }
    this.idx = this.stack.length - 1;
    if (typeof this.updateUI === 'function') this.updateUI();
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
console.log('[HistoryCore] loaded.');
</script>
