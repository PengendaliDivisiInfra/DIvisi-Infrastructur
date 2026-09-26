<script>
/* =====================================================================
   ReportingJs.html - PROFESSIONAL REPORT GENERATOR (ASCII-only)
   5 Template: Executive, WBS, Resource, Schedule, Baseline
   ===================================================================== */
var Reporting = {

  state: { template: 'executive' },

  TEMPLATES: [
    { id: 'executive', name: '[EXEC] Executive Summary', desc: 'Ringkasan KPI portofolio dan proyek aktif' },
    { id: 'wbs',       name: '[WBS] WBS / BQ Report', desc: 'Daftar item pekerjaan dengan volume RAB dan RAP' },
    { id: 'resource',  name: '[RES] Resource Summary', desc: 'Agregasi kebutuhan upah, bahan, dan alat' },
    { id: 'schedule',  name: '[SCHED] Schedule Summary', desc: 'Jadwal CPM: durasi, ES, EF, float, jalur kritis' },
    { id: 'baseline',  name: '[BASE] Baseline Compare', desc: 'Perbandingan jadwal terhadap baseline' }
  ],

  /* =============================================================
     OPEN DIALOG
     ============================================================= */
  open: function() {
    if (!APP_STATE.activeProjectId) {
      toast('Pilih proyek aktif terlebih dahulu', 'warn');
      return;
    }
    var html = this.buildDialogHTML();
    openModal('Buat Laporan Profesional', html, null);
    var modal = document.querySelector('#overlay .modal');
    if (modal) modal.classList.add('modal-wide');
    var foot = document.querySelector('.modal-foot');
    if (foot) foot.style.display = 'none';
    this.bindDialogEvents();
  },

  buildDialogHTML: function() {
    var proj = getActiveProject() || {};
    var html = '';
    html += '<div style="padding:4px 0 16px;font-size:12.5px;color:#8fa3c4;line-height:1.6">';
    html += 'Pilih template laporan. Laporan terbuka di tab baru, siap dicetak ke PDF.';
    html += '</div>';
    html += '<div style="margin-bottom:16px;padding:10px 14px;background:rgba(47,129,247,.06);border-radius:8px;border:1px solid rgba(47,129,247,.20)">';
    html += '<div style="font-size:10px;color:#8fa3c4;text-transform:uppercase;letter-spacing:.5px;font-weight:700">Proyek Aktif</div>';
    html += '<div style="font-size:14px;font-weight:700;color:#e6edf7;margin-top:2px">' + esc((proj.kode || '') + ' - ' + (proj.nama || '')) + '</div>';
    html += '<div style="font-size:11px;color:#8fa3c4;margin-top:2px">' + esc(proj.lokasi || '-') + '</div>';
    html += '</div>';
    html += '<div class="rpt-template-grid">';
    var self = this;
    this.TEMPLATES.forEach(function(t) {
      var isSel = self.state.template === t.id;
      html += '<div class="rpt-tpl-card' + (isSel ? ' is-selected' : '') + '" data-tpl="' + t.id + '">';
      html += '<div class="rpt-tpl-name">' + esc(t.name) + '</div>';
      html += '<div class="rpt-tpl-desc">' + esc(t.desc) + '</div>';
      html += '</div>';
    });
    html += '</div>';
    html += '<div class="report-opt-group" style="margin-top:14px">';
    html += '<b>Tips:</b> Laporan terbuka di tab baru. Klik <b>Cetak</b> atau tekan <b>Ctrl+P</b>, lalu pilih <b>Save as PDF</b>.';
    html += '</div>';
    html += '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">';
    html += '<button class="btn" id="rptCancelBtn">Batal</button>';
    html += '<button class="btn btn-primary" id="rptGenerateBtn">Buat Laporan</button>';
    html += '</div>';
    return html;
  },

  bindDialogEvents: function() {
    var self = this;
    document.querySelectorAll('.rpt-tpl-card').forEach(function(card) {
      card.onclick = function() {
        document.querySelectorAll('.rpt-tpl-card').forEach(function(c) {
          c.classList.remove('is-selected');
        });
        this.classList.add('is-selected');
        self.state.template = this.dataset.tpl;
      };
    });
    var cancelBtn = document.getElementById('rptCancelBtn');
    if (cancelBtn) cancelBtn.onclick = function() { closeModal(); };
    var genBtn = document.getElementById('rptGenerateBtn');
    if (genBtn) genBtn.onclick = function() { self.generate(); };
  },

  /* =============================================================
     GENERATE
     ============================================================= */
  generate: function() {
    closeModal();
    var proj = getActiveProject();
    if (!proj) { toast('Proyek tidak ditemukan', 'warn'); return; }
    var html = '';
    var tpl = this.state.template;
    if (tpl === 'executive') html = this.reportExecutive(proj);
    else if (tpl === 'wbs') html = this.reportWBS(proj);
    else if (tpl === 'resource') html = this.reportResource(proj);
    else if (tpl === 'schedule') html = this.reportSchedule(proj);
    else if (tpl === 'baseline') html = this.reportBaseline(proj);
    var w = window.open('', '_blank');
    if (!w) {
      toast('Pop-up diblokir. Izinkan pop-up untuk situs ini.', 'warn');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    toast('Laporan siap. Gunakan Ctrl+P untuk Save as PDF.');
  },

  /* =============================================================
     HTML WRAPPER
     ============================================================= */
  wrapHTML: function(title, bodyHtml) {
    var proj = getActiveProject() || {};
    var today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    var h = '';
    h += '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">';
    h += '<title>' + esc(title) + '</title>';
    h += '<style>' + this.reportCSS() + '</style>';
    h += '</head><body>';
    h += '<div class="rpt-header">';
    h += '<div class="rpt-logo">MK</div>';
    h += '<div class="rpt-header-center">';
    h += '<h1>' + esc(title) + '</h1>';
    h += '<p class="rpt-subtitle">Proyek: ' + esc((proj.kode || '') + ' - ' + (proj.nama || '')) + '</p>';
    h += '</div>';
    h += '<div class="rpt-date">' + today + '</div>';
    h += '</div>';
    h += '<div class="rpt-meta">';
    h += '<div><span class="k">Lokasi:</span> ' + esc(proj.lokasi || '-') + '</div>';
    h += '<div><span class="k">Owner:</span> ' + esc(proj.owner || '-') + '</div>';
    h += '<div><span class="k">Nilai Kontrak:</span> ' + fmtRp(proj.nilai_kontrak) + '</div>';
    h += '<div><span class="k">Periode:</span> ' + esc(proj.tgl_mulai || '-') + ' s/d ' + esc(proj.tgl_selesai || '-') + '</div>';
    h += '</div>';
    h += '<div class="rpt-body">' + bodyHtml + '</div>';
    h += '<div class="rpt-footer">';
    h += '<div class="rpt-print-btn">Klik Ctrl+P untuk cetak / Save as PDF</div>';
    h += '<div style="display:flex;justify-content:space-between;margin-top:40px">';
    h += '<div style="text-align:center"><div>Disusun oleh,</div><div style="margin-top:60px;border-top:1px solid #333;padding-top:4px;min-width:180px">Quantity Surveyor</div></div>';
    h += '<div style="text-align:center"><div>Disetujui oleh,</div><div style="margin-top:60px;border-top:1px solid #333;padding-top:4px;min-width:180px">Project Manager</div></div>';
    h += '</div>';
    h += '</div>';
    h += '<scr' + 'ipt>setTimeout(function(){window.print();},400);</scr' + 'ipt>';
    h += '</body></html>';
    return h;
  },

  reportCSS: function() {
    var c = '';
    c += '* { box-sizing: border-box; margin: 0; padding: 0; }';
    c += 'body { font-family: "Segoe UI", Arial, sans-serif; color: #1a1a1a; background: #f5f5f5; padding: 20px; font-size: 11px; line-height: 1.5; }';
    c += '.rpt-header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 14px; border-bottom: 3px double #1f4e79; margin-bottom: 12px; }';
    c += '.rpt-logo { width: 50px; height: 50px; border-radius: 10px; background: #2f81f7; color: #fff; font-weight: 800; display: grid; place-items: center; font-size: 18px; }';
    c += '.rpt-header-center { flex: 1; text-align: center; padding: 0 12px; }';
    c += '.rpt-header h1 { font-size: 16px; font-weight: 800; color: #1f4e79; letter-spacing: .4px; }';
    c += '.rpt-subtitle { font-size: 11px; color: #444; margin-top: 3px; }';
    c += '.rpt-date { font-size: 11px; color: #666; }';
    c += '.rpt-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; padding: 10px 12px; background: #eef3fa; border-radius: 6px; margin-bottom: 14px; font-size: 11px; }';
    c += '.rpt-meta .k { font-weight: 700; color: #1f4e79; }';
    c += '.rpt-body { background: #fff; padding: 16px; border-radius: 6px; }';
    c += 'h2.sec { font-size: 13px; font-weight: 800; color: #1f4e79; margin: 16px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #1f4e79; }';
    c += 'h2.sec:first-child { margin-top: 0; }';
    c += 'table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 10.5px; }';
    c += 'table th { background: #1f4e79; color: #fff; padding: 7px 8px; text-align: left; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: .3px; border: 1px solid #1f4e79; }';
    c += 'table td { padding: 6px 8px; border: 1px solid #ccd; vertical-align: top; }';
    c += 'table tbody tr:nth-child(even) { background: #f8fafc; }';
    c += 'table td.num, table th.num { text-align: right; }';
    c += 'table td.ctr, table th.ctr { text-align: center; }';
    c += 'table tr.total-row td { background: #1f4e79; color: #fff; font-weight: 800; border-color: #1f4e79; }';
    c += 'table tr.summary-row td { background: #eef3fa; font-weight: 700; }';
    c += '.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }';
    c += '.kpi-card { padding: 12px 14px; background: #f0f4f8; border-radius: 8px; border-left: 4px solid #2f81f7; }';
    c += '.kpi-card .lbl { font-size: 9.5px; color: #666; text-transform: uppercase; letter-spacing: .5px; font-weight: 700; }';
    c += '.kpi-card .val { font-size: 17px; font-weight: 800; color: #1f4e79; margin-top: 4px; }';
    c += '.kpi-card .sub { font-size: 10px; color: #888; margin-top: 2px; }';
    c += '.badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9.5px; font-weight: 700; }';
    c += '.badge.ok { background: #d1fae5; color: #065f46; }';
    c += '.badge.warn { background: #fef3c7; color: #92400e; }';
    c += '.badge.bad { background: #fee2e2; color: #991b1b; }';
    c += '.badge.info { background: #dbeafe; color: #1e40af; }';
    c += '.rpt-footer { margin-top: 20px; padding-top: 12px; border-top: 1px dashed #ccc; font-size: 10.5px; color: #666; }';
    c += '.rpt-print-btn { text-align: center; padding: 10px; background: #eef3fa; border-radius: 6px; margin-bottom: 16px; font-weight: 700; }';
    c += '@media print { body { background: #fff; padding: 0; } .rpt-print-btn { display: none; } .rpt-body { padding: 0; }';
    c += 'table th { background: #1f4e79 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }';
    c += 'table tr.total-row td { background: #1f4e79 !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }';
    c += 'table tr.summary-row td { background: #eef3fa !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }';
    c += '.kpi-card, .badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }';
    c += '@page { size: A4 portrait; margin: 12mm; } }';
    return c;
  },

  /* =============================================================
     TEMPLATE 1 - EXECUTIVE SUMMARY
     ============================================================= */
  reportExecutive: function(proj) {
    var pid = String(proj.id);
    var wbsAll = (DB.project_wbs || []).filter(function(w) { return String(w.project_id) === pid && !num(w.is_group); });
    var wbsGrp = (DB.project_wbs || []).filter(function(w) { return String(w.project_id) === pid && num(w.is_group); });
    var resCount = (DB.master_resources || []).length;
    var ahspCount = (DB.ahsp_headers || []).length;
    var progCount = (DB.progress || []).filter(function(p) { return String(p.project_id) === pid; }).length;
    var criticalCount = wbsAll.filter(function(w) { return num(w.is_critical) === 1; }).length;
    var html = '';
    html += '<h2 class="sec">Ringkasan KPI Proyek</h2>';
    html += '<div class="kpi-grid">';
    html += '<div class="kpi-card"><div class="lbl">Total Item WBS</div><div class="val">' + wbsAll.length + '</div><div class="sub">' + wbsGrp.length + ' grup</div></div>';
    html += '<div class="kpi-card"><div class="lbl">Item Kritis</div><div class="val">' + criticalCount + '</div><div class="sub">Total float = 0</div></div>';
    html += '<div class="kpi-card"><div class="lbl">Nilai Kontrak</div><div class="val">' + fmtRp(proj.nilai_kontrak) + '</div><div class="sub">' + (proj.status || '-') + '</div></div>';
    html += '<div class="kpi-card"><div class="lbl">Progress Entries</div><div class="val">' + progCount + '</div><div class="sub">Minggu terinput</div></div>';
    html += '</div>';
    html += '<h2 class="sec">Timeline Proyek</h2>';
    html += '<table><thead><tr><th>Parameter</th><th>Nilai</th></tr></thead><tbody>';
    html += '<tr><td>Tanggal Mulai</td><td>' + esc(proj.tgl_mulai || '-') + '</td></tr>';
    html += '<tr><td>Tanggal Selesai</td><td>' + esc(proj.tgl_selesai || '-') + '</td></tr>';
    html += '<tr><td>Durasi (hari kalender)</td><td>' + num(proj.durasi_hari) + ' hari</td></tr>';
    html += '<tr><td>Durasi (hari kerja)</td><td>' + num(proj.durasi_kerja) + ' hari</td></tr>';
    html += '<tr><td>Durasi (minggu)</td><td>' + num(proj.durasi_minggu) + ' minggu</td></tr>';
    html += '</tbody></table>';
    html += '<h2 class="sec">Master Data</h2>';
    html += '<table><thead><tr><th>Kategori</th><th class="num">Jumlah</th></tr></thead><tbody>';
    html += '<tr><td>Master Resources</td><td class="num">' + resCount + '</td></tr>';
    html += '<tr><td>Template AHSP</td><td class="num">' + ahspCount + '</td></tr>';
    var ahspDet = (DB.project_ahsp_details || []).filter(function(d) { return String(d.project_id) === pid; }).length;
    html += '<tr><td>Detail AHSP per Proyek</td><td class="num">' + ahspDet + '</td></tr>';
    html += '</tbody></table>';
    var health = wbsAll.length ? (criticalCount / wbsAll.length) * 100 : 0;
    var healthClass = health < 20 ? 'ok' : (health < 40 ? 'warn' : 'bad');
    var healthLabel = health < 20 ? 'Sehat' : (health < 40 ? 'Perlu Perhatian' : 'Kritis');
    html += '<h2 class="sec">Status Kesehatan Proyek</h2>';
    html += '<table><thead><tr><th>Indikator</th><th class="ctr">Status</th><th>Keterangan</th></tr></thead><tbody>';
    html += '<tr><td>Jalur Kritis</td><td class="ctr"><span class="badge ' + healthClass + '">' + healthLabel + '</span></td>';
    html += '<td>' + criticalCount + ' dari ' + wbsAll.length + ' item (' + fmtNum(health, 1) + '%)</td></tr>';
    html += '</tbody></table>';
    return this.wrapHTML('Executive Summary Report', html);
  },

  /* =============================================================
     TEMPLATE 2 - WBS / BQ
     ============================================================= */
  reportWBS: function(proj) {
    var pid = String(proj.id);
    var wbs = (DB.project_wbs || [])
      .filter(function(w) { return String(w.project_id) === pid; })
      .sort(function(a, b) { return num(a.urut) - num(b.urut); });
    var html = '';
    html += '<h2 class="sec">Bill of Quantity (BQ)</h2>';
    html += '<table><thead><tr>';
    html += '<th style="width:30px">No</th>';
    html += '<th style="width:70px">Kode</th>';
    html += '<th>Uraian Pekerjaan</th>';
    html += '<th style="width:50px" class="ctr">Sat</th>';
    html += '<th style="width:70px" class="num">Vol RAB</th>';
    html += '<th style="width:70px" class="num">Vol RAP</th>';
    html += '<th style="width:50px" class="num">Dur</th>';
    html += '<th style="width:75px" class="ctr">Mulai</th>';
    html += '<th style="width:75px" class="ctr">Selesai</th>';
    html += '<th style="width:40px" class="ctr">Kritis</th>';
    html += '</tr></thead><tbody>';
    var no = 0;
    wbs.forEach(function(w) {
      var isGrp = num(w.is_group) === 1;
      if (isGrp) {
        html += '<tr class="summary-row">';
        html += '<td colspan="3"><b>' + esc(w.kode_wbs || '') + ' - ' + esc(w.uraian || '') + '</b></td>';
        html += '<td colspan="7"></td>';
        html += '</tr>';
      } else {
        no++;
        html += '<tr>';
        html += '<td class="ctr">' + no + '</td>';
        html += '<td>' + esc(w.kode_wbs || '') + '</td>';
        html += '<td>' + esc(w.uraian || '') + '</td>';
        html += '<td class="ctr">' + esc(w.satuan || '') + '</td>';
        html += '<td class="num">' + fmtNum(w.volume_rab, 2) + '</td>';
        html += '<td class="num">' + fmtNum(w.volume_rap, 2) + '</td>';
        html += '<td class="num">' + (num(w.durasi_hari) || '-') + '</td>';
        html += '<td class="ctr">' + esc(w.tgl_mulai_rencana || '-') + '</td>';
        html += '<td class="ctr">' + esc(w.tgl_selesai_rencana || '-') + '</td>';
        html += '<td class="ctr">' + (num(w.is_critical) === 1 ? 'KRITIS' : '') + '</td>';
        html += '</tr>';
      }
    });
    html += '</tbody></table>';
    var totalRAB = wbs.filter(function(w) { return !num(w.is_group); }).reduce(function(s, w) { return s + num(w.volume_rab); }, 0);
    var totalRAP = wbs.filter(function(w) { return !num(w.is_group); }).reduce(function(s, w) { return s + num(w.volume_rap); }, 0);
    html += '<h2 class="sec">Rekapitulasi</h2>';
    html += '<table><thead><tr><th>Parameter</th><th class="num">Total</th></tr></thead><tbody>';
    html += '<tr><td>Total Item WBS</td><td class="num">' + no + ' item</td></tr>';
    html += '<tr><td>Total Volume RAB</td><td class="num">' + fmtNum(totalRAB, 2) + '</td></tr>';
    html += '<tr><td>Total Volume RAP</td><td class="num">' + fmtNum(totalRAP, 2) + '</td></tr>';
    html += '<tr class="total-row"><td>Deviasi Volume</td><td class="num">' + fmtNum(totalRAP - totalRAB, 2) + '</td></tr>';
    html += '</tbody></table>';
    return this.wrapHTML('WBS / Bill of Quantity Report', html);
  },

  /* =============================================================
     TEMPLATE 3 - RESOURCE SUMMARY
     ============================================================= */
  reportResource: function(proj) {
    var pid = String(proj.id);
    var wbsByAhsp = {};
    (DB.project_wbs || []).forEach(function(w) {
      if (String(w.project_id) !== pid) return;
      if (num(w.is_group)) return;
      if (!w.ahsp_id) return;
      var k = String(w.ahsp_id);
      if (!wbsByAhsp[k]) wbsByAhsp[k] = 0;
      wbsByAhsp[k] += num(w.volume_rab);
    });
    var resAgg = {};
    Object.keys(wbsByAhsp).forEach(function(ahspId) {
      var volAhsp = wbsByAhsp[ahspId];
      (DB.project_ahsp_details || []).forEach(function(d) {
        if (String(d.project_id) !== pid) return;
        if (String(d.ahsp_id) !== ahspId) return;
        var k = String(d.resource_id);
        if (!resAgg[k]) resAgg[k] = { qty: 0, biaya: 0 };
        var koef = num(d.koefisien_master);
        var harga = num(d.harga_rab);
        resAgg[k].qty += volAhsp * koef;
        resAgg[k].biaya += volAhsp * koef * harga;
      });
    });
    var sorted = Object.keys(resAgg).map(function(rid) {
      var r = findById(DB.master_resources, rid) || {};
      return { res: r, data: resAgg[rid] };
    }).sort(function(a, b) { return b.data.biaya - a.data.biaya; });
    var html = '';
    html += '<h2 class="sec">Agregasi Kebutuhan Sumber Daya</h2>';
    if (!sorted.length) {
      html += '<p style="color:#666;font-style:italic;padding:20px;text-align:center">Tidak ada data resource untuk proyek ini.</p>';
      return this.wrapHTML('Resource Summary Report', html);
    }
    var byJenis = { upah: [], bahan: [], alat: [] };
    sorted.forEach(function(o) {
      var j = String(o.res.jenis || '').toLowerCase();
      if (!byJenis[j]) byJenis[j] = [];
      byJenis[j].push(o);
    });
    var jenisLabels = { upah: 'Upah', bahan: 'Bahan', alat: 'Alat' };
    var jenisKeys = ['upah', 'bahan', 'alat'];
    jenisKeys.forEach(function(jenis) {
      var list = byJenis[jenis];
      if (!list || !list.length) return;
      html += '<h2 class="sec">' + jenisLabels[jenis] + ' (' + list.length + ' item)</h2>';
      html += '<table><thead><tr>';
      html += '<th style="width:70px">Kode</th>';
      html += '<th>Nama Resource</th>';
      html += '<th style="width:60px" class="ctr">Satuan</th>';
      html += '<th style="width:100px" class="num">Total Qty</th>';
      html += '<th style="width:110px" class="num">Harga RAB</th>';
      html += '<th style="width:130px" class="num">Total Biaya</th>';
      html += '</tr></thead><tbody>';
      var subTotal = 0;
      list.forEach(function(o) {
        subTotal += o.data.biaya;
        html += '<tr>';
        html += '<td>' + esc(o.res.kode || '-') + '</td>';
        html += '<td>' + esc(o.res.nama || '-') + '</td>';
        html += '<td class="ctr">' + esc(o.res.satuan || '-') + '</td>';
        html += '<td class="num">' + fmtNum(o.data.qty, 2) + '</td>';
        html += '<td class="num">' + fmtRp(o.res.harga_rab) + '</td>';
        html += '<td class="num">' + fmtRp(o.data.biaya) + '</td>';
        html += '</tr>';
      });
      html += '<tr class="total-row"><td colspan="5" style="text-align:right">Subtotal ' + jenisLabels[jenis] + '</td>';
      html += '<td class="num">' + fmtRp(subTotal) + '</td></tr>';
      html += '</tbody></table>';
    });
    var grand = sorted.reduce(function(s, o) { return s + o.data.biaya; }, 0);
    html += '<h2 class="sec">Total Keseluruhan</h2>';
    html += '<table><thead><tr><th>Parameter</th><th class="num">Nilai</th></tr></thead><tbody>';
    html += '<tr><td>Total Upah</td><td class="num">' + fmtRp(byJenis.upah.reduce(function(s, o) { return s + o.data.biaya; }, 0)) + '</td></tr>';
    html += '<tr><td>Total Bahan</td><td class="num">' + fmtRp(byJenis.bahan.reduce(function(s, o) { return s + o.data.biaya; }, 0)) + '</td></tr>';
    html += '<tr><td>Total Alat</td><td class="num">' + fmtRp(byJenis.alat.reduce(function(s, o) { return s + o.data.biaya; }, 0)) + '</td></tr>';
    html += '<tr class="total-row"><td>GRAND TOTAL</td><td class="num">' + fmtRp(grand) + '</td></tr>';
    html += '</tbody></table>';
    return this.wrapHTML('Resource Summary Report', html);
  },

  /* =============================================================
     TEMPLATE 4 - SCHEDULE SUMMARY
     ============================================================= */
  reportSchedule: function(proj) {
    var pid = String(proj.id);
    var wbs = (DB.project_wbs || [])
      .filter(function(w) { return String(w.project_id) === pid && !num(w.is_group); })
      .sort(function(a, b) { return num(a.urut) - num(b.urut); });
    var critical = wbs.filter(function(w) { return num(w.is_critical) === 1; });
    var manual = wbs.filter(function(w) { return String(w.schedule_mode || 'auto') === 'manual'; });
    var html = '';
    html += '<h2 class="sec">Ringkasan Jadwal</h2>';
    html += '<div class="kpi-grid">';
    html += '<div class="kpi-card"><div class="lbl">Total Task</div><div class="val">' + wbs.length + '</div></div>';
    html += '<div class="kpi-card"><div class="lbl">Critical Path</div><div class="val">' + critical.length + '</div><div class="sub">Total float = 0</div></div>';
    html += '<div class="kpi-card"><div class="lbl">Manual Schedule</div><div class="val">' + manual.length + '</div></div>';
    html += '<div class="kpi-card"><div class="lbl">Auto Schedule</div><div class="val">' + (wbs.length - manual.length) + '</div></div>';
    html += '</div>';
    if (critical.length) {
      html += '<h2 class="sec">Jalur Kritis (Critical Path)</h2>';
      html += '<table><thead><tr><th style="width:70px">Kode</th><th>Uraian</th><th style="width:80px" class="ctr">Mulai</th><th style="width:80px" class="ctr">Selesai</th><th style="width:60px" class="num">Durasi</th></tr></thead><tbody>';
      critical.forEach(function(w) {
        html += '<tr>';
        html += '<td><b>' + esc(w.kode_wbs || '-') + '</b></td>';
        html += '<td>' + esc(w.uraian || '-') + '</td>';
        html += '<td class="ctr">' + esc(w.tgl_mulai_rencana || '-') + '</td>';
        html += '<td class="ctr">' + esc(w.tgl_selesai_rencana || '-') + '</td>';
        html += '<td class="num">' + num(w.durasi_hari) + '</td>';
        html += '</tr>';
      });
      html += '</tbody></table>';
    }
    html += '<h2 class="sec">Detail Jadwal Semua Task</h2>';
    html += '<table><thead><tr>';
    html += '<th style="width:60px">Kode</th>';
    html += '<th>Uraian</th>';
    html += '<th style="width:50px" class="num">Dur</th>';
    html += '<th style="width:75px" class="ctr">ES</th>';
    html += '<th style="width:75px" class="ctr">EF</th>';
    html += '<th style="width:75px" class="ctr">LS</th>';
    html += '<th style="width:75px" class="ctr">LF</th>';
    html += '<th style="width:45px" class="num">Float</th>';
    html += '<th style="width:45px" class="ctr">Kritis</th>';
    html += '</tr></thead><tbody>';
    wbs.forEach(function(w) {
      html += '<tr>';
      html += '<td>' + esc(w.kode_wbs || '-') + '</td>';
      html += '<td>' + esc(w.uraian || '-') + '</td>';
      html += '<td class="num">' + num(w.durasi_hari) + '</td>';
      html += '<td class="ctr">' + esc(w.early_start || w.tgl_mulai_rencana || '-') + '</td>';
      html += '<td class="ctr">' + esc(w.early_finish || w.tgl_selesai_rencana || '-') + '</td>';
      html += '<td class="ctr">' + esc(w.late_start || '-') + '</td>';
      html += '<td class="ctr">' + esc(w.late_finish || '-') + '</td>';
      html += '<td class="num">' + num(w.total_float || w.float_total) + '</td>';
      html += '<td class="ctr">' + (num(w.is_critical) === 1 ? 'KRITIS' : '') + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    return this.wrapHTML('Schedule Summary Report (CPM)', html);
  },

  /* =============================================================
     TEMPLATE 5 - BASELINE COMPARISON
     ============================================================= */
  reportBaseline: function(proj) {
    var pid = String(proj.id);
    var wbs = (DB.project_wbs || [])
      .filter(function(w) { return String(w.project_id) === pid && !num(w.is_group); })
      .sort(function(a, b) { return num(a.urut) - num(b.urut); });
    var slots = [];
    [1, 2, 3].forEach(function(n) {
      var has = wbs.some(function(w) { return w['bl' + n + '_start'] && w['bl' + n + '_finish']; });
      if (has) slots.push(n);
    });
    var html = '';
    if (!slots.length) {
      html += '<h2 class="sec">Baseline Comparison</h2>';
      html += '<p style="padding:30px;text-align:center;color:#666;font-style:italic">Belum ada baseline tersimpan. Buka tab Master Schedule, klik Baseline Management, lalu Save BL1/BL2/BL3 terlebih dahulu.</p>';
      return this.wrapHTML('Baseline Comparison Report', html);
    }
    var activeSlot = slots[0];
    var prefix = 'bl' + activeSlot + '_';
    var late = 0, early = 0, ontime = 0, maxSlip = 0, maxTask = null;
    wbs.forEach(function(w) {
      var bs = w[prefix + 'start'];
      var bf = w[prefix + 'finish'];
      if (!bs || !bf) return;
      var cf = w.tgl_selesai_rencana || w.finish_date;
      if (!cf) return;
      var d1 = new Date(cf + 'T00:00:00');
      var d2 = new Date(bf + 'T00:00:00');
      if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return;
      var slip = Math.round((d1 - d2) / 86400000);
      if (slip > 0) { late++; if (slip > maxSlip) { maxSlip = slip; maxTask = w; } }
      else if (slip < 0) early++;
      else ontime++;
    });
    html += '<h2 class="sec">Ringkasan Variance terhadap BL' + activeSlot + '</h2>';
    html += '<div class="kpi-grid">';
    html += '<div class="kpi-card"><div class="lbl">Sesuai Baseline</div><div class="val">' + ontime + '</div></div>';
    html += '<div class="kpi-card"><div class="lbl">Lebih Cepat</div><div class="val" style="color:#065f46">' + early + '</div></div>';
    html += '<div class="kpi-card"><div class="lbl">Terlambat</div><div class="val" style="color:#991b1b">' + late + '</div><div class="sub">' + (maxTask ? 'Max +' + maxSlip + ' hari (' + (maxTask.kode_wbs || '') + ')' : '') + '</div></div>';
    html += '<div class="kpi-card"><div class="lbl">Coverage</div><div class="val">' + fmtNum((ontime + late + early) / Math.max(1, wbs.length) * 100, 0) + '%</div></div>';
    html += '</div>';
    html += '<h2 class="sec">Detail Variance per Task</h2>';
    html += '<table><thead><tr>';
    html += '<th style="width:60px">Kode</th>';
    html += '<th>Uraian</th>';
    html += '<th style="width:70px" class="ctr">BL Finish</th>';
    html += '<th style="width:70px" class="ctr">Cur Finish</th>';
    html += '<th style="width:70px" class="num">Slip</th>';
    html += '<th style="width:70px" class="ctr">Status</th>';
    html += '</tr></thead><tbody>';
    wbs.forEach(function(w) {
      var bs = w[prefix + 'start'];
      var bf = w[prefix + 'finish'];
      if (!bs || !bf) return;
      var cf = w.tgl_selesai_rencana || w.finish_date || '-';
      var slip = null;
      if (cf && cf !== '-') {
        var d1 = new Date(cf + 'T00:00:00');
        var d2 = new Date(bf + 'T00:00:00');
        if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) slip = Math.round((d1 - d2) / 86400000);
      }
      var badgeClass = 'info';
      var badgeLabel = 'Sesuai';
      var slipTxt = '0';
      if (slip !== null) {
        if (slip > 0) { badgeClass = 'bad'; badgeLabel = 'Terlambat'; slipTxt = '+' + slip; }
        else if (slip < 0) { badgeClass = 'ok'; badgeLabel = 'Cepat'; slipTxt = String(slip); }
      }
      html += '<tr>';
      html += '<td>' + esc(w.kode_wbs || '-') + '</td>';
      html += '<td>' + esc(w.uraian || '-') + '</td>';
      html += '<td class="ctr">' + esc(bf) + '</td>';
      html += '<td class="ctr">' + esc(cf) + '</td>';
      html += '<td class="num"><b>' + slipTxt + '</b></td>';
      html += '<td class="ctr"><span class="badge ' + badgeClass + '">' + badgeLabel + '</span></td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    return this.wrapHTML('Baseline Comparison Report', html);
  }
};

window.Reporting = Reporting;

function openReportDialog() {
  Reporting.open();
}

console.log('[ReportingJs] Module loaded.');
</script>
