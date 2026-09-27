<script>
ReportDialog.generate = function() {
  closeModal();
  var proj = getActiveProject();
  if (!proj) { toast('Proyek tidak ditemukan', 'warn'); return; }
  var tplId = this.state.template;
  var fn = window['ReportTemplate_' + tplId];
  if (typeof fn !== 'function') { toast('Template ' + tplId + ' belum siap', 'warn'); return; }
  var body = '';
  try { body = fn(proj); } catch(e) { toast('Error: ' + e.message, 'error'); return; }
  var titles = {
    executive: 'Executive Summary Report',
    wbs: 'WBS / BQ Report',
    resource: 'Resource Summary Report',
    schedule: 'Schedule Summary Report (CPM)',
    baseline: 'Baseline Comparison Report'
  };
  var title = titles[tplId] || 'Project Report';
  var full = this._wrapHTML(title, body);
  var w = window.open('', '_blank');
  if (!w) { toast('Pop-up diblokir', 'warn'); return; }
  w.document.open();
  w.document.write(full);
  w.document.close();
  toast('Laporan siap. Ctrl+P untuk Save as PDF.');
};
console.log('[RpGenerate] loaded.');
</script>
