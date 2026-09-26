<script>
var PTData = {
  COL_W: { monthly: 60, quarterly: 44, yearly: 34 },

  getProjects: function() {
    return (DB.projects || []).slice();
  },

  getHealth: function(p) {
    var pid = String(p.id);
    var tot = 0, crit = 0;
    (DB.project_wbs || []).forEach(function(w) {
      if (String(w.project_id) !== pid || num(w.is_group)) return;
      tot++;
      if (num(w.is_critical) === 1) crit++;
    });
    return { count: tot, critical: crit, pct: tot > 0 ? (crit / tot) * 100 : 0 };
  },

  getProgress: function(p) {
    var pid = String(p.id);
    var volTot = 0, volDone = 0;
    (DB.project_wbs || []).forEach(function(w) {
      if (String(w.project_id) === pid && !num(w.is_group)) volTot += num(w.volume_rab);
    });
    (DB.progress || []).forEach(function(pr) {
      if (String(pr.project_id) === pid) volDone += num(pr.volume);
    });
    return volTot > 0 ? Math.min(100, (volDone / volTot) * 100) : 0;
  },

  range: function(projs) {
    var min = null, max = null;
    projs.forEach(function(p) {
      if (p.tgl_mulai) {
        var d = new Date(p.tgl_mulai + 'T00:00:00');
        if (!isNaN(d) && (!min || d < min)) min = d;
      }
      if (p.tgl_selesai) {
        var d2 = new Date(p.tgl_selesai + 'T00:00:00');
        if (!isNaN(d2) && (!max || d2 > max)) max = d2;
      }
    });
    if (!min) min = new Date();
    if (!max) max = new Date(Date.now() + 180 * 86400000);
    min = new Date(min); min.setMonth(min.getMonth() - 1);
    max = new Date(max); max.setMonth(max.getMonth() + 1);
    return { start: min, finish: max };
  },

  cols: function(range, zoom) {
    var out = [];
    var cur = new Date(range.start);
    var end = range.finish;
    var cw = this.COL_W[zoom] || 60;
    if (zoom === 'yearly') {
      cur.setMonth(0, 1);
      while (cur <= end) {
        out.push({ date: new Date(cur), label: String(cur.getFullYear()), sublabel: '', width: cw * 12 });
        cur.setFullYear(cur.getFullYear() + 1);
      }
    } else if (zoom === 'quarterly') {
      cur.setMonth(Math.floor(cur.getMonth() / 3) * 3, 1);
      while (cur <= end) {
        var q = Math.floor(cur.getMonth() / 3) + 1;
        out.push({ date: new Date(cur), label: 'Q' + q, sublabel: String(cur.getFullYear()).slice(2), width: cw * 3 });
        cur.setMonth(cur.getMonth() + 3);
      }
    } else {
      cur.setDate(1);
      while (cur <= end) {
        out.push({ date: new Date(cur), label: cur.toLocaleDateString('id-ID', { month: 'short' }), sublabel: String(cur.getFullYear()).slice(2), width: cw });
        cur.setMonth(cur.getMonth() + 1);
      }
    }
    return out;
  },

  dateToX: function(d, cols, zoom) {
    if (!d) return 0;
    var dt = d instanceof Date ? d : new Date(d + 'T00:00:00');
    if (isNaN(dt.getTime())) return 0;
    var x = 0;
    for (var i = 0; i < cols.length; i++) {
      var c = cols[i];
      var ce = new Date(c.date);
      if (zoom === 'yearly') ce.setFullYear(ce.getFullYear() + 1);
      else if (zoom === 'quarterly') ce.setMonth(ce.getMonth() + 3);
      else ce.setMonth(ce.getMonth() + 1);
      if (dt < c.date) return x;
      if (dt < ce) return x + ((dt - c.date) / (ce - c.date)) * c.width;
      x += c.width;
    }
    return x;
  },

  totalW: function(cols) {
    var s = 0;
    cols.forEach(function(c) { s += c.width; });
    return s;
  }
};
window.PTData = PTData;
console.log('[PT_Data] loaded.');
</script>
