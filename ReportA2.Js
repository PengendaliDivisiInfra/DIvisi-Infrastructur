<script>
Rep.executive=function(p){
var w=[],g=[],cc=0;
(DB.project_wbs||[]).forEach(function(x){
if(String(x.project_id)!==String(p.id))return;
if(num(x.is_group))g.push(x);else{w.push(x);if(num(x.is_critical)===1)cc++;}
});
var h='<h2>Ringkasan</h2><table><tr><th>Item</th><th>Nilai</th></tr>';
h+='<tr><td>Total WBS</td><td>'+w.length+'</td></tr>';
h+='<tr><td>Grup</td><td>'+g.length+'</td></tr>';
h+='<tr><td>Kritis</td><td>'+cc+'</td></tr>';
h+='<tr><td>Resources</td><td>'+(DB.master_resources||[]).length+'</td></tr>';
h+='<tr><td>AHSP</td><td>'+(DB.ahsp_headers||[]).length+'</td></tr>';
h+='<tr><td>Nilai Kontrak</td><td>'+fmtRp(p.nilai_kontrak)+'</td></tr>';
h+='<tr><td>Durasi</td><td>'+num(p.durasi_hari)+' hari</td></tr>';
return h+'</table>';
};
Rep.wbs=function(p){
var list=(DB.project_wbs||[]).filter(function(x){return String(x.project_id)===String(p.id);}).sort(function(a,b){return num(a.urut)-num(b.urut);});
var h='<h2>WBS / BQ</h2><table><tr><th>Kode</th><th>Uraian</th><th>Sat</th><th>Vol RAB</th><th>Vol RAP</th><th>Dur</th></tr>';
list.forEach(function(x){h+='<tr><td>'+(x.kode_wbs||'')+'</td><td>'+(x.uraian||'')+'</td><td>'+(x.satuan||'')+'</td><td>'+fmtNum(x.volume_rab,2)+'</td><td>'+fmtNum(x.volume_rap,2)+'</td><td>'+num(x.durasi_hari)+'</td></tr>';});
return h+'</table>';
};
console.log('[ReportA2] OK');
</script>
