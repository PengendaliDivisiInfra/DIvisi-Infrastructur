<script>
History.updateUI = function() {
  var u = document.getElementById('btnUndo');
  var r = document.getElementById('btnRedo');
  if (u) { u.disabled = this.idx <= 0; u.style.opacity = this.idx <= 0 ? '.4' : '1'; }
  if (r) { r.disabled = this.idx >= this.stack.length - 1; r.style.opacity = this.idx >= this.stack.length - 1 ? '.4' : '1'; }
};

History.renderMenu = function() {
  var m = document.getElementById('historyMenu');
  if (!m) return;
  m.innerHTML = '';
  if (!this.stack.length) {
    m.innerHTML = '<div class="hist-empty">Belum ada riwayat</div>';
    return;
  }
  var s = this;
  var html = '<div class="hist-title">Riwayat Edit (' + this.stack.length + ')</div>';
  for (var i = this.stack.length - 1; i >= 0; i--) {
    var h = this.stack[i];
    var d = new Date(h.ts);
    var tm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
    var cls = 'hist-item' + (i === this.idx ? ' is-current' : '');
    html += '<div class="' + cls + '" data-idx="' + i + '">';
    html += '<span>' + (i === this.idx ? '▶ ' : '') + h.label + '</span>';
    html += '<span class="ts">' + tm + '</span>';
    html += '</div>';
  }
  m.innerHTML = html;
  m.querySelectorAll('.hist-item').forEach(function(el) {
    el.addEventListener('click', function() {
      s.goto(parseInt(this.dataset.idx, 10));
      m.classList.remove('show');
    });
  });
};

History.bindUI = function() {
  var s = this;
  var u = document.getElementById('btnUndo');
  if (u && !u._hsBound) { u._hsBound = true; u.onclick = function() { s.undo(); }; }

  var r = document.getElementById('btnRedo');
  if (r && !r._hsBound) { r._hsBound = true; r.onclick = function() { s.redo(); }; }

  var hb = document.getElementById('btnHistory');
  var menu = document.getElementById('historyMenu');
  if (hb && menu && !hb._hsBound) {
    hb._hsBound = true;
    hb.onclick = function(e) {
      e.stopPropagation();
      var isOpen = menu.classList.contains('show');
      if (isOpen) menu.classList.remove('show');
      else { s.renderMenu(); menu.classList.add('show'); }
    };
    document.addEventListener('click', function(ev) {
      if (!menu.contains(ev.target) && ev.target !== hb) menu.classList.remove('show');
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    var c = e.ctrlKey || e.metaKey;
    var k = String(e.key || '').toLowerCase();
    var t = (e.target || {}).tagName;
    if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
    if (c && !e.shiftKey && k === 'z') { e.preventDefault(); s.undo(); return; }
    if (c && e.shiftKey && k === 'z') { e.preventDefault(); s.redo(); return; }
    if (c && !e.shiftKey && k === 'y') { e.preventDefault(); s.redo(); }
  });
};

History.updateUI();

setTimeout(function() {
  History.bindUI();
  console.log('[History] UI bound, buttons ready.');
}, 1500);

console.log('[HistoryUi] loaded.');
</script>
