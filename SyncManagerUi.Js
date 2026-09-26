<script>
SyncManager.showBanner = function(sv, dirty) {
  this.hideBanner();
  var c = dirty ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#16a34a,#0f8a3f)';
  var icon = dirty ? '⚠️' : '📥';
  var msg = dirty ? 'Server v' + sv + ' — Anda punya perubahan belum Push' : 'Server v' + sv + ' — data baru dari user lain';
  var btn = dirty ? 'Push dulu' : 'Pull sekarang';

  var el = document.createElement('div');
  el.id = 'syncBanner';
  el.style.cssText = 'position:fixed;top:90px;left:50%;transform:translateX(-50%);z-index:300;background:' + c + ';color:#fff;padding:12px 18px;border-radius:10px;box-shadow:0 12px 30px rgba(0,0,0,.6);font-size:13px;font-weight:600;display:flex;align-items:center;gap:14px;max-width:90vw;flex-wrap:wrap';
  el.innerHTML = '<span>' + icon + '</span><span>' + msg + '</span>' +
    '<button id="syncAccept" style="padding:6px 12px;font-size:11.5px;font-weight:700;background:rgba(255,255,255,.25);border:1px solid rgba(255,255,255,.4);border-radius:6px;color:#fff;cursor:pointer">' + btn + '</button>' +
    '<button id="syncLater" style="padding:6px 12px;font-size:11.5px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);border-radius:6px;color:#fff;cursor:pointer">Nanti</button>';
  document.body.appendChild(el);

  var s = this;
  document.getElementById('syncAccept').onclick = function() {
    if (dirty) {
      s.hideBanner();
      if (typeof pushToSheet === 'function') {
        pushToSheet().then(function() {
          SyncManager._lastVer = APP_STATE.lastSyncVersion || 0;
        });
      }
    } else {
      s.accept();
    }
  };
  document.getElementById('syncLater').onclick = function() { s.dismiss(); };
};

setTimeout(function(){ SyncManager.init(); }, 2000);
console.log('[SyncUi] loaded.');
</script>
