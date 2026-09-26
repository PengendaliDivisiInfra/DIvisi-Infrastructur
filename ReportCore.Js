<script>
/* =====================================================================
   ReportCoreJs.html - Report Dialog Core
   Frontend-only: no Apps Script call, use DB from memory
   ===================================================================== */
var ReportDialog = {

  TEMPLATES: [
    { id: 'executive', name: '[EXEC] Executive Summary', desc: 'Ringkasan KPI portofolio dan proyek aktif' },
    { id: 'wbs',       name: '[WBS] WBS / BQ Report',     desc: 'Daftar item pekerjaan dengan volume RAB dan RAP' },
    { id: 'resource',  name: '[RES] Resource Summary',    desc: 'Agregasi kebutuhan upah, bahan, dan alat' },
    { id: 'schedule',  name: '[SCHED] Schedule Summary',  desc: 'Jadwal CPM: durasi, ES, EF, float, jalur kritis' },
    { id: 'baseline',  name: '[BASE] Baseline Compare',   desc: 'Perbandingan jadwal terhadap baseline (variance)' }
  ],

  state: { template: 'executive' },

  /* ============= OPEN DIALOG ============= */
  open: function() {
    if (!APP_STATE.activeProjectId) {
      toast('Pilih proyek aktif terlebih dahulu', 'warn');
      return;
    }
    var html = this._buildDialogHTML();
    openModal('Buat Laporan Profesional', html, null);

    var modal = document.querySelector('#overlay .modal');
    if (modal) modal.classList.add('modal-wide');

    var foot = document.querySelector('.modal-foot');
    if (foot) foot.style.display = 'none';

    this._bindDialog();
  },

  _buildDialogHTML: function() {
    var proj = getActiveProject() || {};
    var h = '';

    h += '<div style="padding:4px 0 16px;font-size:12.5px;color:#8fa3c4;line-height:1.6">';
    h += 'Pilih template laporan. Laporan terbuka di tab baru, siap dicetak ke PDF.';
    h += '</div>';

    h += '<div style="margin-bottom:16px;padding:10px 14px;background:rgba(47,129,247,.06);border-radius:8px;border:1px solid rgba(47,129,247,.20)">';
    h += '<div style="font-size:10px;color:#8fa3c4;text-transform:uppercase;letter-spacing:.5px;font-weight:700">Proyek Aktif</div>';
    h += '<div style="font-size:14px;font-weight:700;color:#e6edf7;margin-top:2px">' + esc((proj.kode || '') + ' - ' + (proj.nama || '')) + '</div>';
    h += '<div style="font-size:11px;color:#8fa3c4;margin-top:2px">' + esc(proj.lokasi || '-') + '</div>';
    h += '</div>';

    h += '<div class="rpt-template-grid">';
    var self = this;
    this.TEMPLATES.forEach(function(t) {
      var isSel = self.state.template === t.id;
      h += '<div class="rpt-tpl-card' + (isSel ? ' is-selected' : '') + '" data-tpl="' + t.id + '">';
      h += '<div class="rpt-tpl-name">' + esc(t.name) + '</div>';
      h += '<div class="rpt-tpl-desc">' + esc(t.desc) + '</div>';
      h += '</div>';
    });
    h += '</div>';

    h += '<div class="report-opt-group" style="margin-top:14px">';
    h += '<b>Tips:</b> Laporan terbuka di tab baru. Klik <b>Cetak</b> atau tekan <b>Ctrl+P</b>, lalu pilih <b>Save as PDF</b>.';
    h += '</div>';

    h += '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">';
    h += '<button class="btn" id="rptCancelBtn">Batal</button>';
    h += '<button class="btn btn-primary" id="rptGenerateBtn">Buat Laporan</button>';
    h += '</div>';

    return h;
  },

  _bindDialog: function() {
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

  /* ============= GENERATE ============= */
  generate: function() {
    closeModal();

    var proj = getActiveProject();
    if (!proj) { toast('Proyek tidak ditemukan', 'warn'); return; }

    var tplId = this.state.template;
    var fn = window['ReportTemplate_' + tplId];

    if (typeof fn !== 'function') {
      toast('Template "' + tplId + '" belum siap', 'warn');
      console.warn('[ReportDialog] Function ReportTemplate_' + tplId + ' not found');
      return;
    }

    var bodyHtml = '';
    try {
      bodyHtml = fn(proj);
    } catch(e) {
      toast('Error generate: ' + e.message, 'error');
      console.error('[ReportDialog] Template error:', e);
      return;
    }

    var titles = {
      executive: 'Executive Summary Report',
      wbs: 'WBS / Bill of Quantity Report',
      resource: 'Resource Summary Report',
      schedule: 'Schedule Summary Report (CPM)',
      baseline: 'Baseline Comparison Report'
    };
    var title = titles[tplId] || 'Project Report';
    var fullHtml = this._wrapHTML(title, bodyHtml);

    var w = window.open('', '_blank');
    if (!w) {
      toast('Pop-up diblokir. Izinkan pop-up untuk situs ini.', 'warn');
      return;
    }
    w.document.open();
    w.document.write(fullHtml);
    w.document.close();

    toast('Laporan siap. Gunakan Ctrl+P untuk Save as PDF.');
  },

  /* ============= HTML WRAPPER ============= */
  _wrapHTML: function(title, bodyHtml) {
    var proj = getActiveProject() || {};
    var today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

    var h = '';
    h += '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">';
    h += '<title>' + esc(title) + '</title>';
    h += '<style>' + this._reportCSS() + '</style>';
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

  _reportCSS: function() {
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
  }
};

window.ReportDialog = ReportDialog;
console.log('[ReportCoreJs] Module loaded.');
</script>
