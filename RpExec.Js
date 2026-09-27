<script>
function ReportTemplate_executive(p) {
  var pid = String(p.id), w = [], g = [], cc = 0, pc = 0, ad = 0;
  (DB.project_wbs || []).forEach(function(x) {
    if (String(x.project_id) !== pid) return;
    if (num(x.is_group)) g.push(x);
    else { w.push(x); if (num(x.is_critical) === 1) cc++; }
  });
  (DB.progress || []).forEach(function(x) { if (String(x.project_id) === pid) pc++; });
  (DB.project_ahsp_details || []).forEach(function(x) { if (String(x.project_id) === pid) ad++; });
  var h = '<h2 class="sec">KPI Proyek</h2><div class="kpi-grid">';
  h += '<div class="kpi-card"><div class="lbl">WBS</div><div class="val">' + w.length + '</div><div class="sub">' + g.length + ' grup</div></div>';
  h += '<div class="kpi-card"><div class="lbl">Kritis</div><div class="val">' + cc + '</div></div>';
  h += '<div class="kpi-card"><div class="lbl">Nilai</div><div class="val">' + fmtRp(p.nilai_kontrak) + '</div></div>';
  h += '<div class="kpi-card"><div class="lbl">Progress</div><div class="val">' + pc + '</div></div></div>';
  h += '<h2 class="sec">Timeline</h2><table><thead><tr><th>Parameter</th><th>Nilai</th></tr></thead><tbody>';
  h += '<tr><td>Mulai</td><td>' + esc(p.tgl_mulai || '-') + '</td></tr>';
  h += '<tr><td>Selesai</td><td>' + esc(p.tgl_selesai || '-') + '</td></tr>';
  h += '<tr><td>Durasi</td><td>' + num(p.durasi_hari) + ' hari / ' + num(p.durasi_kerja) + ' kerja / ' + num(p.durasi_minggu) + ' minggu</td></tr></tbody></table>';
  h += '<h2 class="sec">Master Data</h2><table><thead><tr><th>Kategori</th><th class="num">Jumlah</th></tr></thead><tbody>';
  h += '<tr><td>Resources</td><td class="num">' + (DB.master_resources || []).length + '</td></tr>';
  h += '<tr><td>AHSP</td><td class="num">' + (DB.ahsp_headers || []).length + '</td></tr>';
  h += '<tr><td>Detail AHSP</td><td class="num">' + ad + '</td></tr></tbody></table>';
  return h;
}
console.log('[RpExec] loaded.');
</script>
