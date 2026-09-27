<script>
ReportDialog._reportCSS2 = function() {
  var c = '';
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
  c += 'table th { background: #1f4e79 !important; -webkit-print-color-adjust: exact; }';
  c += 'table tr.total-row td { background: #1f4e79 !important; color: #fff !important; -webkit-print-color-adjust: exact; }';
  c += '@page { size: A4 portrait; margin: 12mm; } }';
  return c;
};
setTimeout(function() {
  var orig = ReportDialog._reportCSS;
  ReportDialog._reportCSS = function() { return orig.call(this) + this._reportCSS2(); };
}, 100);
console.log('[RpCss2] loaded.');
</script>
