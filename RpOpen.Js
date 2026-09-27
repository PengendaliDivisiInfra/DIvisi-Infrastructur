<script>
ReportDialog.open = function() {
  if (!APP_STATE.activeProjectId) { toast('Pilih proyek aktif', 'warn'); return; }
  var h = this._buildDialogHTML();
  openModal('Buat Laporan Profesional', h, null);
  var m = document.querySelector('#overlay .modal');
  if (m) m.classList.add('modal-wide');
  var f = document.querySelector('.modal-foot');
  if (f) f.style.display = 'none';
  this._bindDialog();
};
console.log('[RpOpen] loaded.');
</script>
