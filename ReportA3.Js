<script>
Rep.resource=function(p){
var list=DB.master_resources||[];
var h='<h2>Resource Summary</h2><p>Total: '+list.length+'</p>';
h+='<table><tr><th>Kode</th><th>Nama</th><th>Jenis</th><th>Satuan</th><th>Harga RAB</th></tr>';
list.forEach(function(r){h+='<tr><td>'+(r.kode||'')+'</td><td>'+(r.nama||'')+'</td><td>'+(r.jenis||'')+'</td><td>'+(r.satuan||'')+'</td><td>'+fmtRp(r.harga_rab)+'</td></tr>';});
return h+'</table>';
};
Rep.schedule=function(p){
var list=(DB.project_wbs||[]).filter(function(x){return String(x.project_id)===String(p.id)&&!num(x.is_group);});
var h='<h2>Jadwal CPM</h2><table><tr><th>Kode</th><th>Uraian</th><th>Mulai</th><th>Selesai</th><th>Float</th><th>Kritis</th></tr>';
list.forEach(function(x){h+='<tr><td>'+(x.kode_wbs||'')+'</td><td>'+(x.uraian||'')+'</td><td>'+(x.tgl_mulai_rencana||'')+'</td><td>'+(x.tgl_selesai_rencana||'')+'</td><td>'+num(x.total_float||x.float_total)+'</td><td>'+(num(x.is_critical)===1?'Ya':'')+'</td></tr>';});
return h+'</table>';
};
Rep.baseline=function(p){return '<h2>Baseline</h2><p>Fitur dalam pengembangan.</p>';};
console.log('[ReportA3] OK');
</script>
