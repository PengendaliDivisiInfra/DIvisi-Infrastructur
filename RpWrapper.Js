<script>
ReportDialog._wrapHTML = function(title, bodyHtml) {
  return this._part1(title) + bodyHtml + this._part2();
};
console.log('[RpWrapper] loaded.');
</script>
