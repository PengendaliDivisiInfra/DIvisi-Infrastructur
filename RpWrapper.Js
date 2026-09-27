<script>
ReportDialog._wrapHTML = function(title, bodyHtml) {
  var p = getActiveProject() || {};
  var today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  var css = this._reportCSS();
  var h = '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>' + esc(title) + '</title><style>' + css + '</style></head><body>';
  h += '<div class="rpt-header"><div class="rpt-logo">MK</div><div class="rpt-header-center"><h1>' + esc(title) + '</h1><p class="rpt-subtitle">Proyek: ' + esc((p.kode || '') + ' - ' + (p.nama || '')) + '</p></div><div class="rpt-date">' + today + '</div></div>';
  h += '<div class="rpt-meta"><div><span class="k">Lokasi:</span> ' + esc(p.lokasi || '-') + '</div><div><span class="k">Owner:</span> ' + esc(p.owner || '-') + '</div><div><span class="k">Nilai:</span> ' + fmtRp(p.nilai_kontrak) + '</div><div><span class="k">Periode:</span> ' + esc(p.tgl_mulai || '-') + ' s/d ' + esc(p.tgl_selesai || '-') + '</div></div>';
  h += '<div class="rpt-body">' + bodyHtml + '</div>';
  h += '<div class="rpt-footer"><div class="rpt-print-btn">Klik Ctrl+P untuk cetak / Save as PDF</div><div style="display:flex;justify-content:space-between;margin-top:40px"><div style="text-align:center"><div>Disusun oleh,</div><div style="margin-top:60px;border-top:1px solid #333;padding-top:4px;min-width:180px">Quantity Surveyor</div></div><div style="text-align:center"><div>Disetujui oleh,</div><div style="margin-top:60px;border-top:1px solid #333;padding-top:4px;min-width:180px">Project Manager</div></div></div></div>';
  h += '<scr' + 'ipt>setTimeout(function(){window.print();},400);</scr' + 'ipt></body></html>';
  return h;
};
console.log('[RpWrapper] loaded.');
</script>
