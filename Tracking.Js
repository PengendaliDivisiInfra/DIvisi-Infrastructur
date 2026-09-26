<script>
var Tracking = {
  state: { enabled: false, showProgressLine: true, baselineSlot: 1 },
  SLOT_PREFIX: { 1: 'bl1_', 2: 'bl2_', 3: 'bl3_' },

  getBaselineDates: function(task) {
    var prefix = this.SLOT_PREFIX[this.state.baselineSlot] || 'bl1_';
    var s = task[prefix + 'start'];
    var f = task[prefix + 'finish'];
    if (s && f) return { start: s, finish: f };
    return null;
  },

  getProgressForTask: function(wbsId) {
    var pid = APP_STATE.activeProjectId;
    var total = 0;
    (DB.progress || []).forEach(function(p) {
      if (String(p.wbs_id) === String(wbsId) && String(p.project_id) === String(pid)) {
        total += num(p.volume);
      }
    });
    return total;
  },

  getProgressPct: function(task) {
    var vol = num(task.volume_rab) || num(task.volume_rap);
    if (vol <= 0) return 0;
    var done = this.getProgressForTask(task.id);
    var pct = (done / vol) * 100;
    return pct > 100 ? 100 : pct;
  },

  computeSlip: function(task) {
    var bl = this.getBaselineDates(task);
    if (!bl) return null;
    var curF = task.tgl_selesai_rencana || task.finish_date;
    if (!curF) return null;
    var d1 = new Date(curF + 'T00:00:00');
    var d2 = new Date(bl.finish + 'T00:00:00');
    if (isNaN(d1) || isNaN(d2)) return null;
    return Math.round((d1 - d2) / 86400000);
  },

  drawBars: function(canvas, tasks, cols, granularity) {
    var self = this;
    var E = GanttEngine;
    var dpr = window.devicePixelRatio || 1;
    var rowH = E.ROW_HEIGHT;
    var barH = E.BAR_HEIGHT;
    var blBarH = Math.max(6, barH * 0.55);
    var w = E.totalWidth(cols);
    var h = Math.max(rowH * tasks.length, rowH);

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, w, h);

    var gx = 0;
    cols.forEach(function(col) {
      if (col.isWeekend) {
        ctx.fillStyle = 'rgba(15,23,42,0.45)';
        ctx.fillRect(gx, 0, col.width, h);
      }
      ctx.strokeStyle = 'rgba(36,54,92,0.4)';
      ctx.beginPath();
      ctx.moveTo(gx + 0.5, 0);
      ctx.lineTo(gx + 0.5, h);
      ctx.stroke();
      gx += col.width;
    });

    tasks.forEach(function(task, idx) {
      var rowY = idx * rowH;
      var barY = rowY + (rowH - barH) / 2;
      var blBarY = rowY + (rowH - blBarH) / 2;

      if (idx % 2 === 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.012)';
        ctx.fillRect(0, rowY, w, rowH);
      }

      var isGroup = num(task.is_group) === 1;

      if (!isGroup) {
        var bl = self.getBaselineDates(task);
        if (bl) {
          var bx1 = E.dateToX(bl.start, cols, granularity);
          var bx2 = E.dateToX(bl.finish, cols, granularity);
          var bw = Math.max(3, bx2 - bx1);
          ctx.fillStyle = 'rgba(148,163,184,0.28)';
          ctx.fillRect(bx1, blBarY, bw, blBarH);
          ctx.strokeStyle = 'rgba(148,163,184,0.55)';
          ctx.strokeRect(bx1 + 0.5, blBarY + 0.5, bw - 1, blBarH - 1);
        }
      }

      var sISO = task.tgl_mulai_rencana || task.start_date || task.manual_start;
      var fISO = task.tgl_selesai_rencana || task.finish_date || task.manual_finish;
      if (!sISO || !fISO) return;

      var isCrit = num(task.is_critical) === 1;
      var x1 = E.dateToX(sISO, cols, granularity);
      var x2 = E.dateToX(fISO, cols, granularity);
      var barW = Math.max(6, x2 - x1);

      if (isGroup) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x1, barY, barW, barH);
        return;
      }

      var grad = ctx.createLinearGradient(x1, barY, x1 + barW, barY);
      if (isCrit) {
        grad.addColorStop(0, '#dc2626');
        grad.addColorStop(1, '#b91c1c');
      } else {
        grad.addColorStop(0, '#2f81f7');
        grad.addColorStop(1, '#1abc9c');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(x1, barY, barW, barH);

      var pct = self.getProgressPct(task);
      if (pct > 0) {
        var pw = barW * pct / 100;
        ctx.fillStyle = 'rgba(34,197,94,0.85)';
        ctx.fillRect(x1, barY, pw, barH);
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1 + pw, barY);
        ctx.lineTo(x1 + pw, barY + barH);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
    });

    if (self.state.showProgressLine) {
      var tx = E.dateToX(new Date(), cols, granularity);
      if (tx > 0 && tx < w) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(tx, 0);
        ctx.lineTo(tx, h);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
      }
    }

    ctx.strokeStyle = 'rgba(36,54,92,0.4)';
    for (var i = 0; i <= tasks.length; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * rowH + 0.5);
      ctx.lineTo(w, i * rowH + 0.5);
      ctx.stroke();
    }
  },

  renderSlipTable: function() {
    var wrap = document.getElementById('trackingSlipWrap');
    if (!wrap) return;

    if (!this.state.enabled) {
      wrap.style.display = 'none';
      wrap.innerHTML = '';
      return;
    }
    wrap.style.display = 'block';

    var pid = APP_STATE.activeProjectId;
    var tasks = [];
    (DB.project_wbs || []).forEach(function(w) {
      if (String(w.project_id) === String(pid) && !num(w.is_group)) {
        tasks.push(w);
      }
    });
    tasks.sort(function(a, b) { return num(a.urut) - num(b.urut); });

    if (!tasks.length) {
      wrap.innerHTML = '<div class="panel-head"><div><h3>Slip Analysis</h3></div></div>' +
        '<div style="padding:20px;text-align:center;color:#8fa3c4">Tidak ada task</div>';
      return;
    }

    var self = this;
    var rows = tasks.map(function(t) {
      return {
        task: t,
        slip: self.computeSlip(t),
        pct: self.getProgressPct(t),
        vol: num(t.volume_rab) || num(t.volume_rap),
        done: self.getProgressForTask(t.id)
      };
    });

    var html = '<div class="panel-head"><div><h3>Slip Analysis</h3>' +
               '<p>Terhadap BL' + self.state.baselineSlot + '</p></div></div>';
    html += '<div class="tw" style="max-height:40vh"><table>';
    html += '<thead><tr>';
    html += '<th>Kode</th><th>Uraian</th>';
    html += '<th style="text-align:right">Volume</th>';
    html += '<th style="text-align:right">Terpasang</th>';
    html += '<th style="text-align:center">Progress</th>';
    html += '<th style="text-align:center">BL Finish</th>';
    html += '<th style="text-align:center">Cur Finish</th>';
    html += '<th style="text-align:center">Slip</th>';
    html += '<th style="text-align:center">Status</th>';
    html += '</tr></thead><tbody>';

    rows.forEach(function(r) {
      var bl = self.getBaselineDates(r.task);
      var slipTxt = '&mdash;';
      var slipStyle = 'color:#475569';
      var statusHtml = '<span style="color:#475569">' + '&mdash;' + '</span>';

      if (r.slip !== null) {
        if (r.slip > 0) {
          slipTxt = '+' + r.slip + ' hari';
          slipStyle = 'color:#f87171;font-weight:700';
          statusHtml = '<span class="badge b-danger">Terlambat</span>';
        } else if (r.slip < 0) {
          slipTxt = '-' + Math.abs(r.slip) + ' hari';
          slipStyle = 'color:#4ade80;font-weight:700';
          statusHtml = '<span class="badge b-ok">Cepat</span>';
        } else {
          slipTxt = '0';
          slipStyle = 'color:#7cb3ff;font-weight:700';
          statusHtml = '<span class="badge b-info">Sesuai</span>';
        }
      }

      var pctColor = r.pct >= 100 ? '#4ade80' : (r.pct > 0 ? '#fbbf24' : '#8fa3c4');
      var trCls = (r.slip !== null && r.slip > 0) ? ' class="critical-row"' : '';

      html += '<tr' + trCls + '>';
      html += '<td><code style="color:#7cb3ff;font-weight:700">' + esc(r.task.kode_wbs || '') + '</code></td>';
      html += '<td>' + esc(r.task.uraian || '') + '</td>';
      html += '<td class="num">' + fmtNum(r.vol, 2) + '</td>';
      html += '<td class="num">' + fmtNum(r.done, 2) + '</td>';
      html += '<td style="text-align:center;font-weight:700;' + pctColor.replace('color:', 'color:') + '">' + fmtNum(r.pct, 1) + '%</td>';
      html += '<td style="text-align:center;color:#a8b8d6;font-size:11px">' + esc(bl ? bl.finish : '') + '</td>';
      html += '<td style="text-align:center;color:#e6edf7;font-size:11px">' + esc(r.task.tgl_selesai_rencana || r.task.finish_date || '') + '</td>';
      html += '<td style="text-align:center;' + slipStyle + '">' + slipTxt + '</td>';
      html += '<td style="text-align:center">' + statusHtml + '</td>';
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    wrap.innerHTML = html;
  },

  injectToolbar: function() {
    var tbRight = document.querySelector('.gantt-toolbar-right');
    if (!tbRight) return;
    if (tbRight.querySelector('#gvTrackToggle')) return;

    var btnCls = 'gantt-btn-track-toggle' + (this.state.enabled ? ' is-on' : '');
    var plCls = 'gantt-btn-progline-toggle' + (this.state.showProgressLine ? ' is-on' : '');
    var slotDisp = this.state.enabled ? 'inline-block' : 'none';
    var slotVal = String(this.state.baselineSlot);

    var html = '';
    html += '<div style="display:flex;align-items:center;gap:6px;margin-left:8px;padding-left:8px;border-left:1px solid #24365c">';
    html += '<button class="' + btnCls + '" id="gvTrackToggle">Tracking</button>';
    html += '<select id="gvTrackSlot" class="gantt-zoom" style="display:' + slotDisp + '">';
    html += '<option value="1">BL1</option>';
    html += '<option value="2">BL2</option>';
    html += '<option value="3">BL3</option>';
    html += '</select>';
    html += '<button class="' + plCls + '" id="gvProgLineToggle" style="display:' + slotDisp + '">Today</button>';
    html += '</div>';

    tbRight.insertAdjacentHTML('beforeend', html);

    var slot = document.getElementById('gvTrackSlot');
    if (slot) slot.value = slotVal;

    var self = this;

    var btn = document.getElementById('gvTrackToggle');
    if (btn) {
      btn.onclick = function() {
        self.state.enabled = !self.state.enabled;
        this.classList.toggle('is-on', self.state.enabled);
        var s = document.getElementById('gvTrackSlot');
        var p = document.getElementById('gvProgLineToggle');
        if (s) s.style.display = self.state.enabled ? 'inline-block' : 'none';
        if (p) p.style.display = self.state.enabled ? 'inline-block' : 'none';
        if (window.GanttView) window.GanttView.render();
      };
    }

    if (slot) {
      slot.onchange = function() {
        self.state.baselineSlot = parseInt(this.value, 10);
        if (window.GanttView) window.GanttView.render();
      };
    }

    var pl = document.getElementById('gvProgLineToggle');
    if (pl) {
      pl.onclick = function() {
        self.state.showProgressLine = !self.state.showProgressLine;
        this.classList.toggle('is-on', self.state.showProgressLine);
        if (window.GanttView) window.GanttView.render();
      };
    }
  },

  installHook: function() {
    var GV = window.GanttView;
    if (!GV) return;
    if (GV._trackingHooked) return;

    var self = this;
    var origDraw = GV.drawCanvases;
    var origRender = GV.render;

    GV.drawCanvases = function(flat, cols) {
      var tasks = [];
      flat.forEach(function(r) { tasks.push(r.task); });
      var zoom = this.state.zoom;
      var gran = this.state.granularity;

      var axisCv = document.getElementById('gvAxis');
      if (axisCv) {
        var zc = cols.map(function(c) {
          return { date: c.date, label: c.label, sublabel: c.sublabel, width: c.width * zoom, isWeekend: c.isWeekend };
        });
        GanttEngine.drawAxis(axisCv, zc, gran);
      }

      var barsCv = document.getElementById('gvBars');
      if (barsCv) {
        if (self.state.enabled) {
          var zc2 = cols.map(function(c) {
            return { date: c.date, label: c.label, sublabel: c.sublabel, width: c.width * zoom, isWeekend: c.isWeekend };
          });
          self.drawBars(barsCv, tasks, zc2, gran);
        } else {
          origDraw.call(this, flat, cols);
        }
      }
    };

    GV.render = function() {
      origRender.call(this);
      setTimeout(function() {
        try { self.injectToolbar(); } catch(e) { console.error('toolbar err', e); }
        try { self.renderSlipTable(); } catch(e) { console.error('slip err', e); }
      }, 0);
    };

    GV._trackingHooked = true;
    console.log('[Tracking] Hook installed');
  }
};

window.Tracking = Tracking;
console.log('[TrackingJs] Module loaded.');
</script>
