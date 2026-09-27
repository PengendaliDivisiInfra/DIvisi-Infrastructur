<script>
var Rep={T:[['executive','Executive'],['wbs','WBS / BQ'],['resource','Resource'],['schedule','Schedule'],['baseline','Baseline']],
open:function(){
if(!APP_STATE.activeProjectId){toast('Pilih proyek','warn');return;}
var h='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:6px">';
this.T.forEach(function(t){h+='<button class="btn" data-t="'+t[0]+'" style="padding:12px">'+t[1]+'</button>';});
h+='</div>';
openModal('Template',h,null);
var f=document.querySelector('.modal-foot');if(f)f.style.display='none';
document.querySelectorAll('[data-t]').forEach(function(b){b.onclick=function(){closeModal();Rep.run(this.dataset.t);};});
},
run:function(t){
var p=getActiveProject(),body=this[t](p);
var h='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+t+'</title><style>body{font-family:Arial;padding:14px;font-size:11px}table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #888;padding:4px}th{background:#1f4e79;color:#fff}h2{color:#1f4e79;border-bottom:2px solid #1f4e79}</style></head><body>';
h+='<h1 style="text-align:center;color:#1f4e79">'+(p.kode||'')+' - '+(p.nama||'')+'</h1>'+body;
h+='<p style="text-align:center;font-size:9px;color:#666;margin-top:20px">Ctrl+P cetak</p></body></html>';
var w=window.open('','_blank');
if(!w){toast('Pop-up diblokir','warn');return;}
w.document.open();w.document.write(h);w.document.close();
}};
window.Rep=Rep;
console.log('[ReportA1] OK');
</script>
