<script>
var KeyboardShortcuts = {
  init: function() {
    if (this._b) return; this._b = true;
    var s = this;
    document.addEventListener('keydown', function(e){ s.handle(e); });
    console.log('[Kb] Ready. Alt+K for help.');
  },
  handle: function(e) {
    var c = e.ctrlKey || e.metaKey;
    var k = String(e.key || '').toLowerCase();
    var t = (e.target || {}).tagName;
    if (k === 'escape') {
      var o = document.getElementById('overlay');
      if (o && o.classList.contains('show')) { e.preventDefault(); closeModal(); }
      return;
    }
    if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
    if (c && !e.shiftKey && k === 's') { e.preventDefault(); this.doPush(); return; }
    if (c && !e.shiftKey && k === 'p') { e.preventDefault(); window.print(); return; }
    if (c && !e.shiftKey && k === 'f') { e.preventDefault(); this.doSearch(); return; }
    if (e.altKey && k === 'k') { e.preventDefault(); this.showHelp(); return; }
    if (c && !e.shiftKey && /^[1-9]$/.test(k)) { e.preventDefault(); this.gotoTab(parseInt(k,10)); }
  }
};
window.KeyboardShortcuts = KeyboardShortcuts;
console.log('[Kb1] Core loaded.');
</script>
