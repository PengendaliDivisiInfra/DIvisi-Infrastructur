<script>
ReportDialog._part2 = function() {
  var h = '</div>';
  h += '<div class="rpt-footer">';
  h += '<div class="rpt-print-btn">Klik Ctrl+P untuk cetak / Save as PDF</div>';
  h += '<div style="display:flex;justify-content:space-between;margin-top:40px">';
  h += '<div style="text-align:center"><div>Disusun oleh,</div><div style="margin-top:60px;border-top:1px solid #333;padding-top:4px;min-width:180px">Quantity Surveyor</div></div>';
  h += '<div style="text-align:center"><div>Disetujui oleh,</div><div style="margin-top:60px;border-top:1px solid #333;padding-top:4px;min-width:180px">Project Manager</div></div>';
  h += '</div></div>';
  h += '<scr' + 'ipt>setTimeout(function(){window.print();},400);</scr' + 'ipt>';
  h += '</body></html>';
  return h;
};
console.log('[RpWrapper2] loaded.');
</script>
