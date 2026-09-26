<script>
/* =====================================================================
   ProgressWizardJs.html — PROGRESS UPDATE WIZARD
   Fitur:
   - Modal dialog besar dengan grid input volume per minggu
   - Filter by: search, week range, WBS group
   - Auto-fill patterns: uniform, triangular, bell, front, back
   - Clear, CSV export, Save ke DB (progress records)
   ===================================================================== */
var ProgressWizard = {

  state: {
    open: false,
    weekStart: 1,
    weekEnd: 4,
    search: '',
    pattern: 'uniform',
    inputs: {}    // { wbs_id: { w1: val, w2: val, ... } }
  },

  /* ═══════════════════════════════════════════════════════════
     BAGIAN 1 — BUKA WIZARD
     ═══════════════════════════════════════════════════════════ */
  open: function(){
    if (!APP_STATE.activeProjectId){
      toast('Pilih proyek aktif terlebih dahulu', 'warn');
      return;
    }
    const tasks = this.getTasks();
    if (!tasks.length){
      toast('Belum ada item WBS pada proyek ini', 'warn');
      return;
    }
    this.state.open = true;
    this.state.inputs = {};
    this.render();
  },

  close: function(){
    this.state.open = false;
    const ov = document.getElementById('overlay');
    if (ov) ov.classList.remove('show');
    window._modalSubmit = null;
  },

  /* ═══════════════════════════════════════════════════════════
     BAGIAN 2 — DATA HELPERS
     ═══════════════════════════════════════════════════════════ */
  getTasks: function(){
    const pid = APP_STATE.activeProjectId;
    return (DB.project_wbs || [])
      .filter(w => String(w.project_id) === String(pid) && !num(w.is_group))
      .sort((a, b) => num(a.urut) - num(b.urut));
  },

  getProgress: function(wbsId){
    return (DB.progress || []).filter(p =>
      String(p.wbs_id) === String(wbsId) &&
      String(p.project_id) === String(APP_STATE.activeProjectId)
    );
  },

  getTotalVolume: function(wbsId){
    return this.getProgress(wbsId).reduce((s, p) => s + num(p.volume), 0);
  },

  /* ═══════════════════════════════════════════════════════════
     BAGIAN 3 — RENDER WIZARD
     ═══════════════════════════════════════════════════════════ */
  render: function(){
    const html = this.buildHTML();
    const title = document.getElementById('mTitle');
    const body = document.getElementById('mBody');
    const overlay = document.getElementById('overlay');
    if (!title || !body || !overlay) return;

    title.textContent = '📊 Progress Update Wizard';
    body.innerHTML = html;

    // Set modal wide
    const modal = overlay.querySelector('.modal');
    if (modal) modal.classList.add('modal-wide');

    overlay.classList.add('show');
    window._modalSubmit = null;   // Disable default submit

    this.bindEvents();
  },

  buildHTML: function(){
    const tasks = this.getTasks();
    const weeks = [];
    for (let w = this.state.weekStart; w <= this.state.weekEnd; w++) weeks.push(w);

    // Filter tasks by search
    let filtered = tasks;
    if (this.state.search){
      const q = this.state.search.toLowerCase();
      filtered = tasks.filter(t =>
        String(t.kode_wbs || '').toLowerCase().includes(q) ||
        String(t.uraian || '').toLowerCase().includes(q)
      );
    }

    let html = '';

    // Intro
    html += '<div class="pw-intro">';
    html += '<b>📝 Cara pakai:</b> Isi volume aktual per minggu untuk setiap item WBS. ';
    html += 'Atau klik tombol <b>Auto-Fill</b> untuk mengisi otomatis dengan pola tertentu. ';
    html += 'Klik <b>Simpan</b> untuk menyimpan ke database.';
    html += '</div>';

    // Filter bar
    html += '<div class="pw-filter-bar">';
    html += '<div class="pw-f-item"><label>Dari Minggu</label><input type="number" id="pwWFrom" min="1" max="52" value="' + this.state.weekStart + '"></div>';
    html += '<div class="pw-f-item"><label>Sampai Minggu</label><input type="number" id="pwWTo" min="1" max="52" value="' + this.state.weekEnd + '"></div>';
    html += '<div class="pw-f-item"><label>Cari WBS</label><input type="text" id="pwSearch" placeholder="Kode / uraian..." value="' + esc(this.state.search) + '"></div>';
    html += '<div class="pw-f-item"><label>Jumlah Baris</label><input type="text" readonly value="' + filtered.length + ' dari ' + tasks.length + '"></div>';
    html += '</div>';

    // Action bar
    html += '<div class="pw-action-bar">';
    html += '<button class="pw-btn pw-btn-auto" data-pattern="uniform">Uniform</button>';
    html += '<button class="pw-btn pw-btn-tri"  data-pattern="triangular">Triangular</button>';
    html += '<button class="pw-btn pw-btn-bell" data-pattern="bell">Bell</button>';
    html += '<button class="pw-btn" data-pattern="front">Front Loaded</button>';
    html += '<button class="pw-btn" data-pattern="back">Back Loaded</button>';
    html += '<button class="pw-btn pw-btn-clear" id="pwClearAll">Clear All</button>';
    html += '<button class="pw-btn pw-btn-csv" id="pwExportCSV">⬇ CSV</button>';
    html += '<span class="pw-summary" id="pwSummary"></span>';
    html += '</div>';

    // Table
    if (!filtered.length){
      html += '<div class="pw-table-wrap"><div class="pw-empty">Tidak ada WBS yang cocok dengan pencarian</div></div>';
    } else {
      html += '<div class="pw-table-wrap"><table class="pw-table">';
      html += '<thead><tr>';
      html += '<th class="pw-th-kode">Kode</th>';
      html += '<th class="pw-th-uraian">Uraian</th>';
      html += '<th class="pw-th-sat">Satuan</th>';
      html += '<th class="pw-th-vol">Vol</th>';
      html += '<th class="pw-th-vol" style="background:linear-gradient(180deg,#1a4a3a,#143a2e)">Terpasang</th>';
      weeks.forEach(w => {
        html += '<th class="pw-th-week">W' + w + '</th>';
      });
      html += '<th class="pw-th-input">Total</th>';
      html += '<th class="pw-th-pct">%</th>';
      html += '</tr></thead><tbody>';

      filtered.forEach(t => {
        const vol = num(t.volume_rab) || num(t.volume_rap);
        const done = this.getTotalVolume(t.id);
        const inputRow = this.state.inputs[t.id] || {};
        let rowTotal = 0;
        weeks.forEach(w => {
          const v = num(inputRow['w' + w]);
          rowTotal += v;
        });
        const totalWithInput = done + rowTotal;
        const pct = vol > 0 ? (totalWithInput / vol) * 100 : 0;

        html += '<tr data-wbs="' + esc(t.id) + '">';
        html += '<td class="pw-td-kode">' + esc(t.kode_wbs || '—') + '</td>';
        html += '<td class="pw-td-uraian" title="' + esc(t.uraian || '') + '">' + esc(t.uraian || '—') + '</td>';
        html += '<td class="pw-td-sat">' + esc(t.satuan || '—') + '</td>';
        html += '<td class="pw-td-vol">' + fmtNum(vol, 2) + '</td>';
        html += '<td class="pw-td-vol">' + fmtNum(done, 2) + '</td>';

        weeks.forEach(w => {
          const v = num(inputRow['w' + w]);
          html += '<td class="pw-cell"><input type="number" step="0.01" min="0" ';
          html += 'class="pw-input" data-wbs="' + esc(t.id) + '" data-week="w' + w + '" ';
          html += 'value="' + (v ? v : '') + '" placeholder="0"></td>';
        });

        html += '<td class="pw-td-input" data-role="rowTotal">' + fmtNum(rowTotal, 2) + '</td>';
        const pctCls = pct >= 100 ? 'ok' : pct > 0 ? 'warn' : '';
        html += '<td class="pw-td-pct ' + pctCls + '" data-role="pct">' + fmtNum(pct, 1) + '%</td>';
        html += '</tr>';
      });

      html += '</tbody></table></div>';
    }

    // Footer hint
    html += '<div style="margin-top:14px;padding:10px 14px;background:rgba(47,129,247,.06);border-radius:8px;font-size:11.5px;color:#8fa3c4">';
    html += '💡 <b>Tip:</b> Kolom <b>Terpasang</b> = total volume yang sudah ada di database. ';
    html += 'Kolom <b>Total</b> = terpasang + input baru. Kolom <b>%</b> = persentase terhadap volume RAB/RAP.';
    html += '</div>';

    return html;
  },

  /* ═══════════════════════════════════════════════════════════
     BAGIAN 4 — EVENT BINDING
     ═══════════════════════════════════════════════════════════ */
  bindEvents: function(){
    const self = this;

    // Week range
    const wf = document.getElementById('pwWFrom');
    if (wf) wf.addEventListener('change', function(){
      self.state.weekStart = Math.max(1, parseInt(this.value) || 1);
      self.render();
    });
    const wt = document.getElementById('pwWTo');
    if (wt) wt.addEventListener('change', function(){
      self.state.weekEnd = Math.max(self.state.weekStart, parseInt(this.value) || 1);
      self.render();
    });

    // Search
    const srch = document.getElementById('pwSearch');
    if (srch) srch.addEventListener('input', function(){
      self.state.search = this.value;
      self.render();
    });

    // Auto-fill patterns
    document.querySelectorAll('[data-pattern]').forEach(btn => {
      btn.addEventListener('click', function(){
        self.applyPattern(this.dataset.pattern);
      });
    });

    // Clear all
    const clr = document.getElementById('pwClearAll');
    if (clr) clr.addEventListener('click', () => {
      if (!confirm('Hapus semua input di form (tidak mempengaruhi data tersimpan)?')) return;
      self.state.inputs = {};
      self.render();
    });

    // Export CSV
    const csv = document.getElementById('pwExportCSV');
    if (csv) csv.addEventListener('click', () => self.exportCSV());

    // Input change (event delegation)
    const tbl = document.querySelector('.pw-table');
    if (tbl){
      tbl.addEventListener('input', function(e){
        const el = e.target;
        if (!el.classList.contains('pw-input')) return;
        const wbsId = el.dataset.wbs;
        const weekKey = el.dataset.week;
        const val = num(el.value);
        if (!self.state.inputs[wbsId]) self.state.inputs[wbsId] = {};
        if (val > 0) self.state.inputs[wbsId][weekKey] = val;
        else delete self.state.inputs[wbsId][weekKey];

        // Update row total & pct
        self.updateRowTotals(wbsId);
        self.updateSummary();
      });
    }

    // Cancel button
    const mCancel = document.getElementById('mCancel');
    if (mCancel){
      // Override onClick
      mCancel.onclick = function(e){
        e.preventDefault();
        self.close();
      };
    }

    // Submit button
    const mSubmit = document.getElementById('mSubmit');
    if (mSubmit){
      mSubmit.textContent = '💾 Simpan Progress';
      mSubmit.onclick = function(e){
        e.preventDefault();
        self.save();
      };
    }
  },

  updateRowTotals: function(wbsId){
    const row = document.querySelector('[data-wbs="' + wbsId + '"]');
    if (!row) return;
    const inputRow = this.state.inputs[wbsId] || {};
    let rowTotal = 0;
    Object.values(inputRow).forEach(v => rowTotal += num(v));

    const totalEl = row.querySelector('[data-role="rowTotal"]');
    if (totalEl) totalEl.textContent = fmtNum(rowTotal, 2);

    const task = findById(DB.project_wbs, wbsId) || {};
    const vol = num(task.volume_rab) || num(task.volume_rap);
    const done = this.getTotalVolume(wbsId);
    const pct = vol > 0 ? ((done + rowTotal) / vol) * 100 : 0;

    const pctEl = row.querySelector('[data-role="pct"]');
    if (pctEl){
      pctEl.textContent = fmtNum(pct, 1) + '%';
      pctEl.className = 'pw-td-pct ' + (pct >= 100 ? 'ok' : pct > 0 ? 'warn' : '');
    }
  },

  updateSummary: function(){
    const sumEl = document.getElementById('pwSummary');
    if (!sumEl) return;
    let totalFill = 0;
    let countRows = 0;
    Object.values(this.state.inputs).forEach(weeks => {
      Object.values(weeks).forEach(v => totalFill += num(v));
    });
    countRows = Object.keys(this.state.inputs).length;
    if (countRows > 0){
      sumEl.innerHTML = '<b>' + countRows + '</b> baris · Total isi: <b>' + fmtNum(totalFill, 2) + '</b>';
    } else {
      sumEl.innerHTML = 'Belum ada input';
    }
  },

  /* ═══════════════════════════════════════════════════════════
     BAGIAN 5 — AUTO-FILL PATTERNS
     ═══════════════════════════════════════════════════════════ */
  applyPattern: function(pattern){
    const tasks = this.getTasks();
    if (!tasks.length) return;

    // Filter yang ada di tabel
    let target = tasks;
    if (this.state.search){
      const q = this.state.search.toLowerCase();
      target = tasks.filter(t =>
        String(t.kode_wbs || '').toLowerCase().includes(q) ||
        String(t.uraian || '').toLowerCase().includes(q)
      );
    }
    if (!target.length) return;

    const weeks = [];
    for (let w = this.state.weekStart; w <= this.state.weekEnd; w++) weeks.push(w);
    if (!weeks.length) return;

    if (!confirm('Terapkan pola "' + pattern + '" untuk ' + target.length + ' baris?\n\n' +
                 'Input yang sudah ada akan ditimpa.')) return;

    this.state.inputs = {};
    target.forEach(t => {
      const vol = num(t.volume_rab) || num(t.volume_rap);
      const done = this.getTotalVolume(t.id);
      const remaining = Math.max(0, vol - done);
      if (remaining <= 0) return;

      const weights = this.patternWeights(pattern, weeks.length);
      const sumW = weights.reduce((a, b) => a + b, 0);
      if (sumW <= 0) return;

      this.state.inputs[t.id] = {};
      weeks.forEach((w, i) => {
        const v = (remaining * weights[i]) / sumW;
        if (v > 0.001){
          this.state.inputs[t.id]['w' + w] = Math.round(v * 100) / 100;
        }
      });
    });

    this.render();
    toast('✅ Pola "' + pattern + '" diterapkan');
  },

  patternWeights: function(pattern, n){
    const w = [];
    if (pattern === 'uniform'){
      for (let i = 0; i < n; i++) w.push(1);
    } else if (pattern === 'triangular'){
      // Meningkat linear dari 1 ke n
      for (let i = 0; i < n; i++) w.push(i + 1);
    } else if (pattern === 'bell'){
      // Kurva bell: peak di tengah
      const mid = (n - 1) / 2;
      for (let i = 0; i < n; i++){
        const d = Math.abs(i - mid);
        w.push(Math.max(0.1, 1 - (d / (mid || 1)) * 0.8));
      }
    } else if (pattern === 'front'){
      // Front loaded: berat di awal
      for (let i = 0; i < n; i++) w.push(Math.max(0.2, (n - i) / n));
    } else if (pattern === 'back'){
      // Back loaded: berat di akhir
      for (let i = 0; i < n; i++) w.push(Math.max(0.2, (i + 1) / n));
    }
    return w;
  },

  /* ═══════════════════════════════════════════════════════════
     BAGIAN 6 — EXPORT CSV
     ═══════════════════════════════════════════════════════════ */
  exportCSV: function(){
    const tasks = this.getTasks();
    const weeks = [];
    for (let w = this.state.weekStart; w <= this.state.weekEnd; w++) weeks.push(w);

    let csv = 'Kode;Uraian;Satuan;Volume;Terpasang;';
    weeks.forEach(w => csv += 'W' + w + ';');
    csv += 'Total Input\n';

    tasks.forEach(t => {
      const vol = num(t.volume_rab) || num(t.volume_rap);
      const done = this.getTotalVolume(t.id);
      const inputRow = this.state.inputs[t.id] || {};
      let rowTotal = 0;
      weeks.forEach(w => rowTotal += num(inputRow['w' + w]));

      csv += '"' + (t.kode_wbs || '') + '";';
      csv += '"' + (t.uraian || '').replace(/"/g, '""') + '";';
      csv += '"' + (t.satuan || '') + '";';
      csv += vol + ';' + done + ';';
      weeks.forEach(w => csv += (inputRow['w' + w] || 0) + ';');
      csv += rowTotal + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'progress_wizard_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast('📥 CSV di-export');
  },

  /* ═══════════════════════════════════════════════════════════
     BAGIAN 7 — SIMPAN KE DB
     ═══════════════════════════════════════════════════════════ */
  save: function(){
    const keys = Object.keys(this.state.inputs);
    if (!keys.length){
      toast('Belum ada input untuk disimpan', 'warn');
      return;
    }

    let count = 0;
    const now = new Date().toISOString();
    const user = APP_STATE.user ? APP_STATE.user.username : 'system';

    keys.forEach(wbsId => {
      const weeks = this.state.inputs[wbsId];
      Object.keys(weeks).forEach(weekKey => {
        const weekNum = parseInt(weekKey.replace('w', ''), 10);
        const vol = num(weeks[weekKey]);
        if (vol <= 0) return;

        // Cek duplikat
        const existing = (DB.progress || []).find(p =>
          String(p.wbs_id) === String(wbsId) &&
          String(p.project_id) === String(APP_STATE.activeProjectId) &&
          num(p.minggu) === weekNum
        );

        if (existing){
          existing.volume = num(existing.volume) + vol;
          existing.updated_at = now;
          existing.updated_by = user;
        } else {
          DB.progress.push({
            id: 'prg_' + Math.random().toString(36).slice(2, 12),
            project_id: APP_STATE.activeProjectId,
            wbs_id: wbsId,
            minggu: weekNum,
            volume: vol,
            tanggal: new Date().toISOString().slice(0, 10),
            updated_at: now,
            updated_by: user
          });
        }
        count++;
      });
    });

    if (!count){
      toast('Tidak ada data untuk disimpan', 'warn');
      return;
    }

    markDirty();
    this.close();
    if (typeof renderProgress === 'function') renderProgress();
    if (typeof renderDashboard === 'function') renderDashboard();
    toast('✅ ' + count + ' baris progress disimpan. Push ke Sheet untuk sinkron.');
  }
};

window.ProgressWizard = ProgressWizard;

console.log('[ProgressWizardJs] Module loaded.');
</script>
