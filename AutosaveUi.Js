<script>
Autosave.updateUI = function(ts) {
  var el = document.getElementById('autosaveStatus');
  if (!el) {
    var tb = document.querySelector('.topbar-right');
    if (!tb) return;
    el = document.createElement('span');
    el.id = 'autosaveStatus';
    el.title = 'Draft tersimpan otomatis';
    el.style.cssText = 'font-size:11px;color:#8fa3c4;padding:4px 10px;border-radius:6px;background:rgba(47,129,247,.08);border:1px solid #24365c;white-space:nowrap;font-weight:600;transition:.15s';
    tb.insertBefore(el, tb.firstChild);
  }
  var d = new Date(ts);
  var hm = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  el.textContent = '💾 Draft ' + hm;
  el.style.opacity = '1';
  clearTimeout(el._fade);
  el._fade = setTimeout(function(){ el.style.opacity = '0.5'; }, 3000);
};

Autosave.clearDraft = function() {
  localStorage.removeItem(this.KEY);
  var el = document.getElementById('autosaveStatus');
  if (el) el.remove();
};

Autosave.checkDraft = function() {
  var raw = localStorage.getItem(this.KEY);
  if (!raw) return;
  try {
    var d = JSON.parse(raw);
    if (!d.ts || !d.db) return;
    var age = (Date.now() - new Date(d.ts).getTime()) / 60000;
    if (age > 1440) { localStorage.removeItem(this.KEY); return; }
    setTimeout(function(){ Autosave.promptRestore(d); }, 2500);
  } catch(e) {}
};

Autosave.promptRestore = function(draft) {
  if (!confirm('Ada draft tersimpan dari ' + new Date(draft.ts).toLocaleString('id-ID') +
               '.\n\nPulihkan draft ini?\n\n(Data di Sheet tidak berubah)')) return;
  try {
    DB = draft.db;
    SETTINGS = Object.assign(SETTINGS, draft.settings || {});
    APP_STATE.activeProjectId = draft.activeProjectId;
    APP_STATE.isDirty = true;
    if (typeof onTabChanged === 'function') onTabChanged(APP_STATE.activeTab);
    if (typeof populateProjectSelect === 'function') populateProjectSelect();
    toast('✅ Draft dipulihkan. Klik Push untuk simpan permanen.');
    console.log('[Autosave] Draft restored from', draft.ts);
  } catch(e) { console.error('[Autosave] Restore failed:', e); }
};

// Wrap pushToSheet → clear draft setelah sukses
setTimeout(function() {
  var orig = window.pushToSheet;
  if (typeof orig === 'function' && !orig._asWrapped) {
    window.pushToSheet = function() {
      var p = orig.apply(this, arguments);
      if (p && typeof p.then === 'function') {
        return p.then(function(r){
          if (APP_STATE.isDirty === false) Autosave.clearDraft();
          return r;
        });
      }
      return p;
    };
    window.pushToSheet._asWrapped = true;
  }
}, 500);

// BOOTSTRAP
setTimeout(function(){
  Autosave.init();
  setTimeout(function(){ Autosave.checkDraft(); }, 3000);
}, 1000);

console.log('[AutosaveUi] Module loaded.');
</script>
