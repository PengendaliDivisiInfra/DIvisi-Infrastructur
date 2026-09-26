<script>
var PT = {
  state: { zoom: 'monthly' },

  ensurePanel: function() {
    if (document.getElementById('ptPanel')) return;
    var sec = document.getElementById('sec-executive');
    if (!sec) return;
    var p = document.createElement('div');
    p.className = 'panel';
    p.id = 'ptPanel';
    sec.appendChild(p);
  },

  render: function() {
    this.ensurePanel();
    var wrap = document.getElementById('ptPanel');
    if (!wrap) return;

    var projs = PTData.getProjects();
    if (!projs.length) {
      wrap.innerHTML = '<div class="panel-head"><div><h2>Portfolio Timeline</h2><p>Belum ada proyek</p></div></div>' +
        '<div style="padding:40px;text-align:center;color:#8fa3c4;font-style:italic">Tambahkan proyek di tab Proyek.</div>';
      return;
    }

    var range = PTData.range(projs);
    var cols = PTData.cols(range, this.state.zoom);
    var rows = projs.map(function(p) {
      var h = PTData.getHealth(p);
      return {
        proj: p,
        start: p.tgl_mulai,
        finish: p.tgl_selesai,
        critical: h.critical,
        count: h.count,
        progress: PTData.getProgress(p)
      };
    });

    var tableW = 280;
    var h = '';
    h += '<div class="panel-head">';
    h += '<div><h2>Portfolio Timeline</h2><p>Timeline seluruh proyek dalam portofolio</p></div>';
    h += '<div class="row" style="align-items:center;gap:6px">';
    ['monthly', 'quarterly', 'yearly'].forEach(function(z) {
      var lbl = z === 'monthly' ? 'Bulan' : z === 'quarterly' ? 'Kuartal' : 'Tahun';
      var active = PT.state.zoom === z;
      h += '<button class="btn btn-sm ' + (active ? 'btn-primary' : '') + '" data-ptz="' + z + '">' + lbl + '</button>';
    });
    h += '</div></div>';

    h += '<div style="display:grid;grid-template-columns:' + tableW + 'px 1fr;gap:0;border:1px solid #24365c;border-radius:8px;overflow:hidden;background:#0c1729">';

    // Header kiri
    h += '<div style="background:#1f4e79;color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;padding:12px 14px;display:flex;align-items:center">Proyek</div>';
    // Header kanan
    h += '<div style="background:#0e1a30;overflow:hidden" id="ptAxisWrap"><canvas id="ptAxis"></canvas></div>';

    // Body kiri + kanan
    h += '<div id="ptSide" style="background:#0c1729;border-right:1px solid #24365c">';
    rows.forEach(function(r, i) {
      var cls = i % 2 === 1 ? 'background:rgba(255,255,255,0.012)' : '';
      h += '<div class="pt-side-row" data-project-id="' + esc(r.proj.id) + '" data-idx="' + i + '" style="height:40px;padding:4px 14px;border-bottom:1px solid rgba(36,54,92,.5);display:flex;flex-direction:column;justify-content:center;cursor:pointer;box-sizing:border-box;' + cls + '">';
      h += '<div style="font-family:Consolas,monospace;font-size:11px;font-weight:800;color:#7cb3ff">' + esc(r.proj.kode || '') + '</div>';
      h += '<div style="font-size:11px;color:#e6edf7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(r.proj.nama || '') + '</div>';
      h += '</div>';
    });
    h += '</div>';

    h += '<div id="ptBarsWrap" style="overflow:auto;background:#0b1220;max-height:60vh"><canvas id="ptBars"></canvas></div>';
    h += '</div>';

    h += '<div style="margin-top:12px;font-size:11px;color:#8fa3c4;line-height:1.6">';
    h += 'Batang <b style="color:#2f81f7">biru</b> = proyek normal, <b style="color:#dc2626">merah</b> = punya task kritis, <b style="color:#4ade80">hijau</b> = overlay progress. ';
    h += 'Garis <b style="color:#f59e0b">kuning</b> = hari ini. Klik baris untuk buka proyek.';
    h += '</div>';

    wrap.innerHTML = h;

    // Draw canvas
    PTDraw.axis(document.getElementById('ptAxis'), cols);
    PTDraw.bars(document.getElementById('ptBars'), rows, cols, this.state.zoom);

    // Sync scroll
    var bw = document.getElementById('ptBarsWrap');
    var aw = document.getElementById('ptAxisWrap');
    if (bw && aw) bw.addEventListener('scroll', function() { aw.scrollLeft = bw.scrollLeft; });

    // Zoom buttons
    wrap.querySelectorAll('[data-ptz]').forEach(function(b) {
      b.addEventListener('click', function() {
        PT.state.zoom = this.dataset.ptz;
        PT.render();
      });
    });

    // Klik baris
    wrap.querySelectorAll('.pt-side-row').forEach(function(row) {
      row.addEventListener('click', function() {
        var pid = this.dataset.projectId;
        if (typeof MultiUser !== 'undefined' && !MultiUser.canAccessProject(pid)) {
          toast('Tidak punya akses ke proyek ini', 'warn');
          return;
        }
        APP_STATE.activeProjectId = pid;
        if (typeof populateProjectSelect === 'function') populateProjectSelect();
        var sel = document.getElementById('activeProject');
        if (sel) sel.value = pid;
        toast('Proyek aktif: ' + (findById(DB.projects, pid) || {}).nama);
      });
    });
  },

  hook: function() {
    if (this._hooked) return;
    this._hooked = true;
    var orig = window.renderExecutive;
    if (typeof orig !== 'function') return;
    window.renderExecutive = function() {
      var r = orig.apply(this, arguments);
      setTimeout(function() { PT.render(); }, 100);
      return r;
    };
    console.log('[PT_UI] Hook on renderExecutive.');
  }
};
window.PT = PT;

setTimeout(function() { PT.hook(); }, 1200);
console.log('[PT_UI] loaded.');
</script>
