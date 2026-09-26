<script>
var TaskInspector = {
  open: function(taskId) {
    var t = findById(DB.project_wbs, taskId);
    if (!t) { toast('Task tidak ditemukan', 'warn'); return; }
    var h = this.build(t);
    openModal('📋 ' + (t.kode_wbs || 'Task') + ' — Detail', h, null);
    var f = document.querySelector('.modal-foot');
    if (f) f.style.display = 'none';
  },
  getProg: function(id) {
    var s = 0;
    (DB.progress || []).forEach(function(p) {
      if (String(p.wbs_id) === String(id)) s += num(p.volume);
    });
    return s;
  },
  row: function(k, v, cls) {
    return '<div class="ti-k">' + k + '</div><div class="ti-v ' + (cls || '') + '">' + v + '</div>';
  },
  build: function(t) {
    var crit = num(t.is_critical) === 1;
    var isGrp = num(t.is_group) === 1;
    var manual = String(t.schedule_mode || 'auto') === 'manual';
    var dur = num(t.durasi_hari);
    var volR = num(t.volume_rab);
    var volP = num(t.volume_rap);
    var done = this.getProg(t.id);
    var pct = volR > 0 ? (done / volR) * 100 : 0;
    var flt = num(t.total_float || t.float_total);
    var h = '';

    h += '<div class="ti-section"><div class="ti-section-title">📌 Informasi Umum</div><div class="ti-kv">';
    h += this.row('Kode WBS', esc(t.kode_wbs || '-'));
    h += this.row('Uraian', esc(t.uraian || '-'));
    h += this.row('Satuan', esc(t.satuan || '-'));
    if (t.sta) h += this.row('STA', esc(t.sta));
    h += this.row('Volume RAB', fmtNum(volR, 2));
    h += this.row('Volume RAP', fmtNum(volP, 2));
    h += this.row('Durasi', dur + ' hari');
    h += this.row('Mode', manual ? '🔒 Manual' : '⚙️ Auto');
    if (t.work_contour) h += this.row('Contour', esc(t.work_contour));
    h += '</div></div>';

    h += '<div class="ti-section"><div class="ti-section-title">📅 Jadwal (CPM)</div><div class="ti-kv">';
    h += this.row('Early Start', esc(t.early_start || t.tgl_mulai_rencana || '-'));
    h += this.row('Early Finish', esc(t.early_finish || t.tgl_selesai_rencana || '-'));
    h += this.row('Late Start', esc(t.late_start || '-'));
    h += this.row('Late Finish', esc(t.late_finish || '-'));
    h += this.row('Total Float', flt + ' hari' + (flt <= 0 ? ' 🔥' : ''), crit ? 'crit' : '');
    h += '</div></div>';

    if (t.constraint_type || t.constraint_date) {
      h += '<div class="ti-section"><div class="ti-section-title">⚠️ Constraint</div><div class="ti-kv">';
      h += this.row('Tipe', esc(t.constraint_type || '-'));
      h += this.row('Tanggal', esc(t.constraint_date || '-'));
      h += '</div></div>';
    }

    h += '<div class="ti-section"><div class="ti-section-title">📊 Progress</div><div class="ti-kv">';
    h += this.row('Terpasang', fmtNum(done, 2));
    h += this.row('Persentase', fmtNum(pct, 1) + '%', pct >= 100 ? 'crit' : '');
    h += '</div>';
    h += '<div style="margin-top:8px;height:6px;background:#24365c;border-radius:3px;overflow:hidden">';
    h += '<div style="height:100%;width:' + Math.min(100, pct) + '%;background:linear-gradient(90deg,#22c55e,#16a34a)"></div>';
    h += '</div></div>';

    h += '<div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end">';
    if (typeof MultiUser === 'undefined' || MultiUser.canEdit()) {
      h += '<button class="btn btn-primary" onclick="TaskInspector.edit(\'' + esc(t.id) + '\')">✏️ Edit Task</button>';
    }
    h += '<button class="btn" onclick="closeModal()">Tutup</button>';
    h += '</div>';

    return h;
  },
  edit: function(id) {
    closeModal();
    if (typeof openWbsModal === 'function') openWbsModal(id);
    else toast('Editor WBS belum siap', 'warn');
  }
};
window.TaskInspector = TaskInspector;
console.log('[TiCore] Module loaded.');
</script>
