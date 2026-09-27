<script>
ReportDialog._reportCSS = function() {
  var c = '';
  c += '* { box-sizing: border-box; margin: 0; padding: 0; }';
  c += 'body { font-family: Arial, sans-serif; color: #1a1a1a; background: #f5f5f5; padding: 20px; font-size: 11px; line-height: 1.5; }';
  c += '.rpt-header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 14px; border-bottom: 3px double #1f4e79; margin-bottom: 12px; }';
  c += '.rpt-logo { width: 50px; height: 50px; border-radius: 10px; background: #2f81f7; color: #fff; font-weight: 800; display: grid; place-items: center; font-size: 18px; }';
  c += '.rpt-header-center { flex: 1; text-align: center; padding: 0 12px; }';
  c += '.rpt-header h1 { font-size: 16px; font-weight: 800; color: #1f4e79; }';
  c += '.rpt-subtitle { font-size: 11px; color: #444; margin-top: 3px; }';
  c += '.rpt-date { font-size: 11px; color: #666; }';
  c += '.rpt-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; padding: 10px 12px; background: #eef3fa; border-radius: 6px; margin-bottom: 14px; font-size: 11px; }';
  c += '.rpt-meta .k { font-weight: 700; color: #1f4e79; }';
  c += '.rpt-body { background: #fff; padding: 16px; border-radius: 6px; }';
  c += 'h2.sec { font-size: 13px; font-weight: 800; color: #1f4e79; margin: 16px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #1f4e79; }';
  c += 'h2.sec:first-child { margin-top: 0; }';
  c += 'table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 10.5px; }';
  c += 'table th { background: #1f4e79; color: #fff; padding: 7px 8px; text-align: left; font-weight: 700; font-size: 10px; text-transform: uppercase; border: 1px solid #1f4e79; }';
  c += 'table td { padding: 6px 8px; border: 1px solid #ccd; vertical-align: top; }';
  c += 'table tbody tr:nth-child(even) { background: #f8fafc; }';
  c += 'table td.num, table th.num { text-align: right; }';
  c += 'table td.ctr, table th.ctr { text-align: center; }';
  c += 'table tr.total-row td { background: #1f4e79; color: #fff; font-weight: 800; }';
  c += 'table tr.summary-row td { background: #eef3fa; font-weight: 700; }';
  return c;
};
console.log('[RpCss1] loaded.');
</script>
