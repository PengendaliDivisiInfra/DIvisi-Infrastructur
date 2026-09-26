<script>
/* =====================================================================
   SHEET SYNC FIX — DIAGNOSTIC TOOLS
   Membantu debug masalah koneksi ke Apps Script
   ===================================================================== */
(function(){
  if (window._sheetSyncFixInstalled) return;
  window._sheetSyncFixInstalled = true;

  function _log(label, value, ok){
    var icon = ok === true ? '✅' : ok === false ? '❌' : 'ℹ';
    var color = ok === false ? 'color:#ef4444;font-weight:bold' : '';
    console.log('%c' + icon + ' ' + label + ': ' + value, color);
  }

  function diagnose(){
    console.log('%c══════ SHEET SYNC DIAGNOSTIC ══════',
      'color:#2f81f7;font-weight:bold;font-size:13px');

    // Environment check
    _log('Mode', (typeof google !== 'undefined' && google.script) ? 'Apps Script (Native)' : 'Web App');
    _log('SET.sheetUrl', (typeof SET !== 'undefined' && SET.sheetUrl) ? SET.sheetUrl : '(mode native - tidak perlu URL)');
    _log('STATE.dbVersion', (typeof STATE !== 'undefined' && STATE.dbVersion != null) ? 'v' + STATE.dbVersion : '—');
    _log('SyncManager.CLIENT_ID', (typeof SyncManager !== 'undefined') ? SyncManager.CLIENT_ID : '—');
    _log('DB loaded', (typeof DB !== 'undefined' && DB) ? 'YA' : 'TIDAK', typeof DB !== 'undefined');
    _log('Projects count', (typeof DB !== 'undefined' && DB.projects) ? DB.projects.length : '—');
    _log('WBS count', (typeof DB !== 'undefined' && DB.project_wbs) ? DB.project_wbs.length : '—');

    console.log('%c══════════════════════════════════════',
      'color:#2f81f7;font-weight:bold');
  }

  function testRoundtrip(){
    console.log('%c[Test] Menguji roundtrip ke server…', 'color:#f59e0b;font-weight:bold');
    if (typeof sheetRequest !== 'function'){
      console.error('❌ sheetRequest tidak tersedia');
      return;
    }
    sheetRequest('softStatus', {})
      .then(function(r){
        if (r && r.ok){
          console.log('%c✅ Server merespons dengan baik:', 'color:#22c55e;font-weight:bold', r);
        } else {
          console.warn('⚠ Respons tidak biasa:', r);
        }
      })
      .catch(function(e){
        console.error('❌ Gagal:', e.message, e);
      });
  }

  window.SheetSyncFix = {
    diagnose: diagnose,
    test: testRoundtrip
  };

  // Auto-run diagnostic sekali saat startup
  setTimeout(diagnose, 2000);

  console.log('%c[SheetSyncFix.js] ✅ Diagnostic tools installed',
    'color:#22c55e;font-weight:bold');
  console.log('%c💡 Tips: Panggil SheetSyncFix.diagnose() atau SheetSyncFix.test() di Console untuk debug.',
    'color:#a855f7;font-style:italic');
})();
</script>
