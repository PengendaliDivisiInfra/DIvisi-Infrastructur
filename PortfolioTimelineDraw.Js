<script>
var PTDraw = {
  axis: function(cv, cols) {
    var dpr = window.devicePixelRatio || 1;
    var w = PTData.totalW(cols);
    var h = 44;
    cv.width = w * dpr; cv.height = h * dpr;
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    var ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#0e1a30'; ctx.fillRect(0, 0, w, h);
    var x = 0;
    cols.forEach(function(c) {
      ctx.strokeStyle = 'rgba(47,129,247,0.2)';
      ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); ctx.stroke();
      ctx.fillStyle = '#e6edf7'; ctx.font = 'bold 11px "Segoe UI",sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(c.label, x + c.width / 2, h / 2 - (c.sublabel ? 6 : 0));
      if (c.sublabel) {
        ctx.fillStyle = '#8fa3c4'; ctx.font = '9.5px "Segoe UI",sans-serif';
        ctx.fillText(c.sublabel, x + c.width / 2, h / 2 + 8);
      }
      x += c.width;
    });
    ctx.strokeStyle = '#24365c';
    ctx.beginPath(); ctx.moveTo(0, h - 0.5); ctx.lineTo(w, h - 0.5); ctx.stroke();
  },

  bars: function(cv, rows, cols, zoom) {
    var dpr = window.devicePixelRatio || 1;
    var rowH = 40, barH = 20, blH = 10;
    var w = PTData.totalW(cols);
    var h = Math.max(rowH * rows.length, rowH);
    cv.width = w * dpr; cv.height = h * dpr;
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    var ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, w, h);

    var x = 0;
    cols.forEach(function(c) {
      ctx.strokeStyle = 'rgba(36,54,92,0.4)';
      ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); ctx.stroke();
      x += c.width;
    });

    rows.forEach(function(r, i) {
      var ry = i * rowH;
      var by = ry + (rowH - barH) / 2;
      var bly = ry + (rowH - blH) / 2;
      if (i % 2 === 1) { ctx.fillStyle = 'rgba(255,255,255,0.012)'; ctx.fillRect(0, ry, w, rowH); }

      // Baseline (bulan berjalan)
      var bx1 = PTData.dateToX(r.start, cols, zoom);
      var bx2 = PTData.dateToX(r.finish, cols, zoom);
      var bw = Math.max(4, bx2 - bx1);
      ctx.fillStyle = 'rgba(148,163,184,0.30)';
      ctx.fillRect(bx1, bly, bw, blH);

      // Actual
      var grad = ctx.createLinearGradient(bx1, by, bx1 + bw, by);
      if (r.critical > 0) { grad.addColorStop(0, '#dc2626'); grad.addColorStop(1, '#b91c1c'); }
      else { grad.addColorStop(0, '#2f81f7'); grad.addColorStop(1, '#1abc9c'); }
      ctx.fillStyle = grad;
      ctx.fillRect(bx1, by, bw, barH);

      // Progress overlay
      if (r.progress > 0) {
        ctx.fillStyle = 'rgba(34,197,94,0.75)';
        ctx.fillRect(bx1, by, bw * r.progress / 100, barH);
      }

      // Today line
      var tx = PTData.dateToX(new Date(), cols, zoom);
      if (tx > 0 && tx < w) {
        ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(tx, 0); ctx.lineTo(tx, h); ctx.stroke();
        ctx.setLineDash([]); ctx.lineWidth = 1;
      }
    });

    ctx.strokeStyle = 'rgba(36,54,92,0.4)';
    for (var k = 0; k <= rows.length; k++) {
      ctx.beginPath(); ctx.moveTo(0, k * rowH + 0.5); ctx.lineTo(w, k * rowH + 0.5); ctx.stroke();
    }
  }
};
window.PTDraw = PTDraw;
console.log('[PT_Draw] loaded.');
</script>
