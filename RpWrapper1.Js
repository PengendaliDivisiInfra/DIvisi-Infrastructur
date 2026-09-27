<script>
ReportDialog._part1 = function(title) {
  var p = getActiveProject() || {};
  var today = new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });
  var css = this._reportCSS();
  var h = '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>' + esc(title) + '</title><style>' + css + '</style></head><body>';
  h += '<div class="rpt-header">';
  h += '<div class="rpt-logo">MK</div>';
  h += '<div class="rpt-header-center"><h1>' + esc(title) + '</h1><p class="rpt-subtitle">' + esc((p.kode || '') + ' - ' + (p.nama || '')) + '</p></div>';
  h += '<div class="rpt-date">' + today + '</div>';
  h += '</div>';
  h += '<div class="rpt-meta">';
  h += '<div><span class="k">Lokasi:</span> ' + esc(p.lokasi || '-') + '</div>';
  h += '<div><span class="k">Owner:</span> ' + esc(p.owner || '-') + '</div>';
  h += '<div><span class="k">Nilai:</span> ' + fmtRp(p.nilai_kontrak) + '</div>';
  h += '<div><span class="k">Periode:</span> ' + esc(p.tgl_mulai || '-') + ' s/d ' + esc(p.tgl_selesai || '-') + '</div>';
  h += '</div>';
  h += '<div class="rpt-body">';
  return h;
};
console.log('[RpWrapper1] loaded.');
</script>
