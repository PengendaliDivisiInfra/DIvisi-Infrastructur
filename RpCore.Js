<script>
var ReportDialog = {
  TEMPLATES: [
    { id: 'executive', name: 'Executive Summary', desc: 'Ringkasan KPI proyek' },
    { id: 'wbs', name: 'WBS / BQ Report', desc: 'Daftar item pekerjaan' },
    { id: 'resource', name: 'Resource Summary', desc: 'Kebutuhan sumber daya' },
    { id: 'schedule', name: 'Schedule CPM Report', desc: 'Jadwal dan float' },
    { id: 'baseline', name: 'Baseline Compare', desc: 'Variance jadwal' }
  ],
  state: { template: 'executive' }
};
window.ReportDialog = ReportDialog;
console.log('[RpCore] loaded.');
</script>
