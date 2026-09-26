<script>
/* =====================================================================
   ReportExecutiveJs.html - Template Executive Summary
   ===================================================================== */
function ReportTemplate_executive(proj) {
  var pid = String(proj.id);
  var wbsAll = [];
  var wbsGrp = [];
  (DB.project_wbs || []).forEach(function(w) {
    if (String(w.project_id) !== pid) return;
    if (num(w.is_group)) wbsGrp.push(w);
    else wbsAll.push(w);
  });

  var resCount = (DB.master_resources || []).length;
  var ahspCount = (DB.ahsp_headers || []).length;

  var progCount = 0;
  (DB.progress || []).forEach(function(p) {
    if (String(p.project_id) === pid) progCount++;
  });

  var criticalCount = 0;
  wbsAll.forEach(function(w) { if (num(w.is_critical) === 1) criticalCount++; });

  var ahspDet = 0;
  (DB.project_ahsp_details || []).forEach(function(d) {
    if (String(d.project_id) === pid) ahspDet++;
  });

  var h = '';

  // KPI Grid
  h += '<h2 class="sec">Ringkasan KPI Proyek</h2>';
  h += '<div class="kpi-grid">';
  h += '<div class="kpi-card"><div class="lbl">Total Item WBS</div><div class="val">' + wbsAll.length + '</div><div class="sub">' + wbsGrp.length + ' grup</div></div>';
  h += '<div class="kpi-card"><div class="lbl">Item Kritis</div><div class="val">' + criticalCount + '</div><div class="sub">Total float = 0</div></div>';
  h += '<div class="kpi-card"><div class="lbl">Nilai Kontrak</div><div class="val">' + fmtRp(proj.nilai_kontrak) + '</div><div class="sub">' + (proj.status || '-') + '</div></div>';
  h += '<div class="kpi-card"><div class="lbl">Progress Entries</div><div class="val">' + progCount + '</div><div class="sub">Minggu terinput</div></div>';
  h += '</div>';

  // Timeline
  h += '<h2 class="sec">Timeline Proyek</h2>';
  h += '<table><thead><tr><th>Parameter</th><th>Nilai</th></tr></thead><tbody>';
  h += '<tr><td>Tanggal Mulai</td><td>' + esc(proj.tgl_mulai || '-') + '</td></tr>';
  h += '<tr><td>Tanggal Selesai</td><td>' + esc(proj.tgl_selesai || '-') + '</td></tr>';
  h += '<tr><td>Durasi (hari kalender)</td><td>' + num(proj.durasi_hari) + ' hari</td></tr>';
  h += '<tr><td>Durasi (hari kerja)</td><td>' + num(proj.durasi_kerja) + ' hari</td></tr>';
  h += '<tr><td>Durasi (minggu)</td><td>' + num(proj.durasi_minggu) + ' minggu</td></tr>';
  h += '</tbody></table>';

  // Master Data
  h += '<h2 class="sec">Master Data</h2>';
  h += '<table><thead><tr><th>Kategori</th><th class="num">Jumlah</th></tr></thead><tbody>';
  h += '<tr><td>Master Resources</td><td class="num">' + resCount + '</td></tr>';
  h += '<tr><td>Template AHSP</td><td class="num">' + ahspCount + '</td></tr>';
  h += '<tr><td>Detail AHSP per Proyek</td><td class="num">' + ahspDet + '</td></tr>';
  h += '</tbody></table>';

  // Health
  var health = wbsAll.length ? (criticalCount / wbsAll.length) * 100 : 0;
  var healthClass = health < 20 ? 'ok' : (health < 40 ? 'warn' : 'bad');
  var healthLabel = health < 20 ? 'Sehat' : (health < 40 ? 'Perlu Perhatian' : 'Kritis');
  h += '<h2 class="sec">Status Kesehatan Proyek</h2>';
  h += '<table><thead><tr><th>Indikator</th><th class="ctr">Status</th><th>Keterangan</th></tr></thead><tbody>';
  h += '<tr><td>Jalur Kritis</td><td class="ctr"><span class="badge ' + healthClass + '">' + healthLabel + '</span></td>';
  h += '<td>' + criticalCount + ' dari ' + wbsAll.length + ' item (' + fmtNum(health, 1) + '%)</td></tr>';
  h += '</tbody></table>';

  return h;
}

console.log('[ReportExecutiveJs] Template loaded.');
</script>
