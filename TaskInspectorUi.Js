<script>
TaskInspector.installHook = function() {
  if (this._hooked) return;
  this._hooked = true;

  var bindRows = function() {
    var rows = document.querySelectorAll('.gantt-row[data-id]');
    rows.forEach(function(row) {
      if (row._tiBound) return;
      row._tiBound = true;
      row.style.cursor = 'pointer';
      row.title = 'Double-click untuk detail';
      row.addEventListener('dblclick', function(e) {
        e.stopPropagation();
        var id = this.dataset.id;
        if (id) TaskInspector.open(id);
      });
    });
  };

  var wrap = function(name) {
    var orig = window[name];
    if (typeof orig !== 'function' || orig._tiWrapped) return;
    window[name] = function() {
      var r = orig.apply(this, arguments);
      setTimeout(bindRows, 150);
      return r;
    };
    window[name]._tiWrapped = true;
  };

  // Wrap semua fungsi yang rebuild Gantt rows
  wrap('renderSchedule');
  wrap('renderGantt');

  // Hook GanttView.render kalau ada
  if (window.GanttView && !window.GanttView._tiHooked) {
    var origGV = window.GanttView.render;
    window.GanttView.render = function() {
      origGV.call(this);
      setTimeout(bindRows, 150);
    };
    window.GanttView._tiHooked = true;
  }

  // Coba bind langsung saat ini
  bindRows();
  console.log('[TiUi] Hook installed — double-click baris Gantt untuk detail.');
};

// Bootstrap
setTimeout(function(){ TaskInspector.installHook(); }, 1500);
console.log('[TiUi] Module loaded.');
</script>
