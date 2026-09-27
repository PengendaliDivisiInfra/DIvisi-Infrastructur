<script>
ReportDialog._buildDialogHTML = function() {
  var p = getActiveProject() || {};
  var h = '';
  h += '<div style="margin-bottom:16px;padding:10px 14px;background:rgba(47,129,247,.06);border-radius:8px;border:1px solid rgba(47,129,247,.2)">';
  h += '<div style="font-size:10px;color:#8fa3c4;text-transform:uppercase;font-weight:700">Proyek Aktif</div>';
  h += '<div style="font-size:14px;font-weight:700;color:#e6edf7;margin-top:2px">' + esc((p.kode || '') + ' - ' + (p.nama || '')) + '</div>';
  h += '</div>';
  h += '<div class="rpt-template-grid">';
  var s = this;
  this.TEMPLATES.forEach(function(t) {
    var sel = s.state.template === t.id ? ' is-selected' : '';
    h += '<div class="rpt-tpl-card' + sel + '" data-tpl="' + t.id + '">';
    h += '<div class="rpt-tpl-name">' + esc(t.name) + '</div>';
    h += '<div class="rpt-tpl-desc">' + esc(t.desc) + '</div>';
    h += '</div>';
  });
  h += '</div>';
  h += '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">';
  h += '<button class="btn" id="rptCancelBtn">Batal</button>';
  h += '<button class="btn btn-primary" id="rptGenerateBtn">Buat Laporan</button>';
  h += '</div>';
  return h;
};
ReportDialog._bindDialog = function() {
  var s = this;
  document.querySelectorAll('.rpt-tpl-card').forEach(function(c) {
    c.onclick = function() {
      document.querySelectorAll('.rpt-tpl-card').forEach(function(x) { x.classList.remove('is-selected'); });
      this.classList.add('is-selected');
      s.state.template = this.dataset.tpl;
    };
  });
  var cb = document.getElementById('rptCancelBtn');
  if (cb) cb.onclick = function() { closeModal(); };
  var gb = document.getElementById('rptGenerateBtn');
  if (gb) gb.onclick = function() { s.generate(); };
};
console.log('[RpDialog] loaded.');
</script>
