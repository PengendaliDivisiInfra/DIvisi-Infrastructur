/**
 * =====================================================================
 * MANAJEMEN KONSTRUKSI v1 — SCHEDULE EDITION
 * Backend Apps Script dengan Modul CPM, Working Calendar & Anti-Loss
 * Endpoint: Web App (Execute as: Me, Who has access: Anyone)
 * =====================================================================
 */

/* ---------- KONSTANTA SHEET ---------- */
const SHEET_NAMES = {
  master_resources     : 'master_resources',
  ahsp_headers         : 'ahsp_headers',
  ahsp_details_master  : 'ahsp_details_master',
  projects             : 'projects',
  project_ahsp_details : 'project_ahsp_details',
  project_wbs          : 'project_wbs',
  progress             : 'progress',
  working_calendars    : 'working_calendars',
  holidays             : 'holidays',
  // ── NEW (Fase 4A) — Multi-User ──
  project_users        : 'project_users',
  change_log           : 'change_log',
  sessions             : 'sessions',
  _settings            : '_settings'
};

/* =====================================================================
   FASE 5 — VERSION GUARD & SOFT LOCK
   ===================================================================== */
const VERSION_KEY    = 'mk_db_version';
const SOFT_LOCK_KEY  = 'mk_soft_lock';
const SOFT_LOCK_MAX  = 300000;   // 5 menit

function getDbVersion_(){
  const v = PropertiesService.getScriptProperties().getProperty(VERSION_KEY);
  return v ? parseInt(v, 10) : 0;
}

function bumpDbVersion_(){
  const next = getDbVersion_() + 1;
  PropertiesService.getScriptProperties().setProperty(VERSION_KEY, String(next));
  return next;
}

function readSoftLock_(){
  const raw = PropertiesService.getScriptProperties().getProperty(SOFT_LOCK_KEY);
  if (!raw) return null;
  try {
    const l = JSON.parse(raw);
    if (!l || typeof l.expiresAt !== 'number') return null;
    if (Date.now() > l.expiresAt) return null;   // auto-expired
    return l;
  } catch(e){ return null; }
}

function writeSoftLock_(clientId, ttlMs){
  const ttl = Math.min(Math.max(ttlMs || 60000, 5000), SOFT_LOCK_MAX);
  const lock = {
    clientId,
    acquiredAt: Date.now(),
    expiresAt:  Date.now() + ttl
  };
  PropertiesService.getScriptProperties()
    .setProperty(SOFT_LOCK_KEY, JSON.stringify(lock));
  return lock;
}

function clearSoftLock_(){
  PropertiesService.getScriptProperties().deleteProperty(SOFT_LOCK_KEY);
}

/* =====================================================================
   SKEMA KOLOM — Urutan logis & resolusi FK
   ===================================================================== */
const SHEET_SCHEMAS = {
  master_resources: {
    order: ['kode','nama','jenis','satuan','harga_rab','harga_rap',
            'kapasitas_harian',                    // ← NEW (Phase 4)
            'hitung_q','jenis_alat','kapasitas_bucket','faktor_bucket',
            'faktor_efisiensi','waktu_siklus','faktor_koreksi','faktor_konversi',
            'ts_lapangan','fk_lapangan','fa_lapangan',
            'ket_koreksi','ket_lapangan','id'],
    fk: {},
    hideEmpty: true
  },
  ahsp_headers: {
    order: ['kode','nama','kategori','satuan','overhead','biaya_umum','margin','sumber','id'],
    fk: {},
    hideEmpty: true
  },
  ahsp_details_master: {
    order: ['ahsp_id','ahsp_display','resource_id','resource_display',
            'koefisien','keterangan','id'],
    fk: {
      ahsp_id:     { sheet:'ahsp_headers',     key:'id', display:'kode', sep:' — ', display2:'nama', label:'ahsp_display' },
      resource_id: { sheet:'master_resources', key:'id', display:'kode', sep:' — ', display2:'nama', label:'resource_display' }
    },
    hideEmpty: false
  },
  projects: {
    order: ['kode','nama','lokasi','owner','nilai_kontrak','ppn','overhead',
            'durasi_minggu','durasi_hari','durasi_kerja','durasi_mode',
            'calendar_id','calendar_display',
            'tgl_mulai','tgl_selesai','status',
            // ── NEW (Fase 4A) — Multi-User Metadata ──
            'updated_at','updated_by','project_version',
            'id'],
    fk: {
      calendar_id: { sheet:'working_calendars', key:'id', display:'kode', sep:' — ', display2:'nama', label:'calendar_display' }
    },
    hideEmpty: true
  },
  project_ahsp_details: {
    order: ['project_id','project_display','ahsp_id','ahsp_display',
            'resource_id','resource_display','koefisien_master','koefisien_rap',
            'harga_rab','harga_rap','keterangan',
            // ── NEW (Fase 4A) ──
            'updated_at','updated_by',
            'id'],
    fk: {
      project_id:  { sheet:'projects',         key:'id', display:'kode', sep:' — ', display2:'nama', label:'project_display' },
      ahsp_id:     { sheet:'ahsp_headers',     key:'id', display:'kode', sep:' — ', display2:'nama', label:'ahsp_display' },
      resource_id: { sheet:'master_resources', key:'id', display:'kode', sep:' — ', display2:'nama', label:'resource_display' }
    },
    hideEmpty: false
  },
   project_wbs: {
    order: ['project_id','project_display','kode_wbs','uraian','sta','satuan',
            'ahsp_id','ahsp_display','parent_id','parent_display',
            'volume_rab','volume_rap','is_group','urut',
            'predecessor','pred_display','pred_type','lag_days',
            'calendar_id','calendar_display',
            'duration','start_date','finish_date',
            // ── NEW (Fase 1A) — Auto vs Manual Scheduling ──
            'schedule_mode','manual_start','manual_finish',
            // ── NEW (Fase 2E) — Work Contour per Task ──
            'work_contour',
            'early_start','early_finish','late_start','late_finish',
            'total_float',
            'durasi_hari',
            'tgl_mulai_rencana','tgl_selesai_rencana',
            'tgl_mulai_aktual','tgl_selesai_aktual',
            'float_total',
            'is_critical',
            'constraint_type','constraint_date',
            // ── NEW: Baseline columns (Fase 4A) ──
            'bl1_start','bl1_finish','bl1_set_at',
            'bl2_start','bl2_finish','bl2_set_at',
            'bl3_start','bl3_finish','bl3_set_at',
            // ── NEW (Fase 4A) — Multi-User Metadata ──
            'updated_at','updated_by',
            'id'], 

    fk: {
      project_id:  { sheet:'projects',          key:'id', display:'kode', sep:' — ', display2:'nama', label:'project_display' },
      ahsp_id:     { sheet:'ahsp_headers',      key:'id', display:'kode', sep:' — ', display2:'nama', label:'ahsp_display' },
      parent_id:   { sheet:'project_wbs',       key:'id', display:'kode_wbs', sep:' — ', display2:'uraian', label:'parent_display' },
      predecessor: { sheet:'project_wbs',       key:'id', display:'kode_wbs', sep:' — ', display2:'uraian', label:'pred_display' },
      calendar_id: { sheet:'working_calendars', key:'id', display:'kode', sep:' — ', display2:'nama', label:'calendar_display' }
    },
    hideEmpty: false
  },
  
  progress: {
    order: ['project_id','project_display','wbs_id','wbs_display',
            'minggu','volume','tanggal',
            // ── NEW (Fase 4A) ──
            'updated_at','updated_by',
            'id'],
    fk: {
      project_id: { sheet:'projects',    key:'id', display:'kode', sep:' — ', display2:'nama', label:'project_display' },
      wbs_id:     { sheet:'project_wbs', key:'id', display:'kode_wbs', sep:' — ', display2:'uraian', label:'wbs_display' }
    },
    hideEmpty: false
  },
  working_calendars: {
    order: ['kode','nama','work_days','jam_per_hari','start_hour','keterangan','is_default','id'],
    fk: {},
    hideEmpty: true
  },
  holidays: {
    order: ['tanggal','nama','jenis','calendar_id','calendar_display','id'],
    fk: {
      calendar_id: { sheet:'working_calendars', key:'id', display:'kode', sep:' — ', display2:'nama', label:'calendar_display' }
    },
    hideEmpty: false
  }

    ,
  // ═══════════════════════════════════════════════════════════
  // NEW (Fase 4A) — Multi-User Tables
  // ═══════════════════════════════════════════════════════════
  project_users: {
    order: ['username','pin_hash','nama','email','role','project_ids',
            'aktif','created_at','id'],
    fk: {},
    hideEmpty: false
  },
  change_log: {
    order: ['timestamp','username','project_id','action','sheet_name',
            'row_count','detail','id'],
    fk: {},
    hideEmpty: false
  },
  sessions: {
    order: ['token','username','role','created_at','expires_at','last_seen','id'],
    fk: {},
    hideEmpty: false
  }
};

/* =====================================================================
   CACHE FK — Resolve ID ke Display
   ===================================================================== */
let _fkCache = {};

function buildFkCache_(){
  _fkCache = {};
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  Object.keys(SHEET_SCHEMAS).forEach(sheetName => {
    const schema = SHEET_SCHEMAS[sheetName];
    if (!schema.fk) return;
    Object.keys(schema.fk).forEach(fkField => {
      const def = schema.fk[fkField];
      const srcSheet = def.sheet;
      if (_fkCache[srcSheet]) return;
      const sh = ss.getSheetByName(srcSheet);
      if (!sh){ _fkCache[srcSheet] = {}; return; }
      const lastRow = sh.getLastRow();
      const lastCol = sh.getLastColumn();
      if (lastRow < 2){ _fkCache[srcSheet] = {}; return; }
      const data = sh.getRange(1, 1, lastRow, lastCol).getValues();
      const headers = data[0].map(h => String(h).trim());
      const idxId       = headers.indexOf(def.key);
      const idxDisplay  = headers.indexOf(def.display);
      const idxDisplay2 = def.display2 ? headers.indexOf(def.display2) : -1;
      const map = {};
      for (let i = 1; i < data.length; i++){
        const id = data[i][idxId];
        if (id === '' || id === null) continue;
        let txt = String(data[i][idxDisplay] || '');
        if (idxDisplay2 >= 0 && data[i][idxDisplay2]) txt += def.sep + String(data[i][idxDisplay2]);
        map[String(id)] = txt;
      }
      _fkCache[srcSheet] = map;
    });
  });
}

/* =====================================================================
   WRITE SHEET — Styling Profesional
   ===================================================================== */
function writeSheet_(name, rows) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);

  sh.clear();
  sh.clearFormats();
  try { sh.getBandings().forEach(b => b.remove()); } catch(e){}

  if (!rows.length) {
    sh.getRange(1,1).setValue('(kosong)')
      .setFontStyle('italic').setFontColor('#888888');
    sh.setColumnWidth(1, 200);
    return;
  }

  const schema = SHEET_SCHEMAS[name] || { order:null, fk:{}, hideEmpty:false };

  const allKeys = [];
  rows.forEach(r => Object.keys(r).forEach(k => {
    if (allKeys.indexOf(k) < 0) allKeys.push(k);
  }));

  let headers;
  if (schema.order){
    headers = schema.order.filter(k => allKeys.indexOf(k) >= 0);
    allKeys.forEach(k => { if (headers.indexOf(k) < 0 && !k.startsWith('_')) headers.push(k); });
  } else {
    headers = allKeys.slice();
  }

  if (schema.fk){
    Object.keys(schema.fk).forEach(fkField => {
      const def = schema.fk[fkField];
      const idIdx = headers.indexOf(fkField);
      if (idIdx >= 0 && headers.indexOf(def.label) < 0){
        headers.splice(idIdx + 1, 0, def.label);
      }
    });
  }

  const values = [headers];
  rows.forEach(r => {
    values.push(headers.map(h => {
      let fkField = null;
      if (schema.fk){
        Object.keys(schema.fk).forEach(f => { if (schema.fk[f].label === h) fkField = f; });
      }
      if (fkField){
        const def = schema.fk[fkField];
        const idVal = r[fkField];
        if (idVal === null || idVal === undefined || idVal === '') return '';
        const map = _fkCache[def.sheet] || {};
        return map[String(idVal)] || String(idVal);
      }
      let v = r[h];
      if (v === null || v === undefined) return '';
      if (typeof v === 'object') return JSON.stringify(v);
      return v;
    }));
  });

  if (schema.hideEmpty && values.length > 1){
    const keep = [];
    for (let c = 0; c < headers.length; c++){
      const hasValue = values.some((row, i) => i > 0 && row[c] !== '' && row[c] !== null);
      if (hasValue || ['kode','nama','id'].includes(headers[c])) keep.push(c);
    }
    if (keep.length !== headers.length){
      const newHeaders = keep.map(i => headers[i]);
      const newValues  = values.map(row => keep.map(i => row[i]));
      headers.length = 0; headers.push(...newHeaders);
      values.length = 0; values.push(...newValues);
    }
  }

  const range = sh.getRange(1, 1, values.length, headers.length);
  range.setValues(values);

  const headerRange = sh.getRange(1, 1, 1, headers.length);
  headerRange
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#1f4e79')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setFontFamily('Arial')
    .setFontSize(11);
  sh.setRowHeight(1, 34);
  sh.setFrozenRows(1);

  const dataArea = sh.getRange(1, 1, values.length, headers.length);
  dataArea.setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
  dataArea.setFontFamily('Arial').setFontSize(10);
  dataArea.setVerticalAlignment('middle');

  for (let c = 1; c <= headers.length; c++){
    sh.autoResizeColumn(c);
    const w = sh.getColumnWidth(c);
    if (w > 340) sh.setColumnWidth(c, 340);
    if (w < 90)  sh.setColumnWidth(c, 90);
  }

  const hLower = headers.map(h => String(h).toLowerCase());
  for (let c = 0; c < headers.length; c++){
    const h = hLower[c];
    const colRange = sh.getRange(2, c + 1, values.length - 1, 1);
    const isCcy   = ['harga','total','nilai','biaya','varian','rp','ppn','margin','deviasi','subtotal','nilai_kontrak'].some(kw => h.includes(kw));
    const isCoef  = ['koefisien','faktor','kapasitas','persen','ratio','bucket','siklus','overhead'].some(kw => h.includes(kw));
    const isNum  = ['volume','qty','jumlah','vol_','urut','minggu','duration','durasi','lag','float'].some(kw => h.includes(kw));
    const isDate = h.startsWith('tgl_') || h.endsWith('_date') ||
                  ['tanggal','start_date','finish_date','early_start','early_finish','late_start','late_finish'].some(kw => h.includes(kw));
    if (h.endsWith('_id') || h === 'id'){
      colRange.setFontFamily('Consolas').setFontSize(9).setFontColor('#888').setHorizontalAlignment('left');
    } else if (isCoef){
      colRange.setNumberFormat('0.000000').setHorizontalAlignment('right');
    } else if (isCcy){
      colRange.setNumberFormat('"Rp"#,##0').setHorizontalAlignment('right');
    } else if (isNum){
      colRange.setNumberFormat('#,##0.00').setHorizontalAlignment('right');
    } else if (isDate){
      colRange.setNumberFormat('yyyy-mm-dd').setHorizontalAlignment('center').setFontSize(10);
    }
  }

  try {
    const banding = dataArea.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
    if (banding){
      banding.setHeaderRowColor('#1f4e79')
             .setFirstRowColor('#f3f7fb')
             .setSecondRowColor('#ffffff');
    }
  } catch(e){}

  if (schema.fk){
    Object.values(schema.fk).forEach(def => {
      const idx = headers.indexOf(def.label);
      if (idx >= 0){
        sh.getRange(2, idx + 1, values.length - 1, 1)
          .setBackground('#fffbe6')
          .setFontStyle('italic')
          .setFontColor('#7a5c00');
      }
    });
  }

  // Highlight kolom kritis merah
  const critIdx = headers.indexOf('is_critical');
  if (critIdx >= 0 && values.length > 1){
    for (let i = 2; i <= values.length; i++){
      if (num_(values[i-1][critIdx]) === 1){
        sh.getRange(i, 1, 1, headers.length).setBackground('#fff0f0');
      }
    }
  }
}

function num_(v){ const n = parseFloat(String(v ?? '').replace(/[^\d.-]/g,'')); return isFinite(n)?n:0; }

/* =====================================================================
   WRITE ALL — Bangun cache sebelum menulis
   ===================================================================== */
function writeAll_(db, settings) {
  buildFkCache_();
  Object.keys(SHEET_NAMES).forEach(key => {
    if (key === '_settings') return;
    const rows = db[key] || [];
    writeSheet_(SHEET_NAMES[key], rows);
  });
  writeSettings_(settings);
}

function writeSettings_(settings) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAMES._settings);
  if (!sh) sh = ss.insertSheet(SHEET_NAMES._settings);
  sh.clear();

  sh.getRange(1, 1, 1, 2).setValues([['key','value']])
    .setFontWeight('bold')
    .setBackground('#1f4e79')
    .setFontColor('#ffffff')
    .setHorizontalAlignment('center');
  sh.setFrozenRows(1);

  const rows = Object.keys(settings).map(k => [k, settings[k]]);
  if (rows.length) {
    sh.getRange(2, 1, rows.length, 2).setValues(rows);
    sh.getRange(1, 1, rows.length + 1, 2)
      .setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
  }
  sh.autoResizeColumn(1);
  sh.autoResizeColumn(2);
  sh.setColumnWidth(1, 180);
}

/* =====================================================================
   READ — Baca data dari sheet ke DB
   ===================================================================== */
function readAll_() {
  const out = {};
  Object.keys(SHEET_NAMES).forEach(key => {
    if (key === '_settings') return;
    out[key] = readSheet_(SHEET_NAMES[key]);
  });
  return out;
}

function readSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(name);
  if (!sh) return [];
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  const TZ = Session.getScriptTimeZone();
  const values = sh.getRange(1, 1, lastRow, lastCol).getValues();
  /* FIX: jangan filter — pakai map saja, skip empty di loop */
  const headers = values[0].map(h => String(h).trim());
  const rows = [];

  const DATE_COLS = new Set([
    'tanggal','tgl_mulai','tgl_selesai',
    'tgl_mulai_rencana','tgl_selesai_rencana',
    'tgl_mulai_aktual','tgl_selesai_aktual',
    'start_date','finish_date',
    'early_start','early_finish','late_start','late_finish',
    'constraint_date',
    // ── NEW: Baseline dates ──
    'bl1_start','bl1_finish',
    'bl2_start','bl2_finish',
    'bl3_start','bl3_finish',
    // ── NEW (Fase 1A): Manual scheduling dates ──
    'manual_start','manual_finish',
    // ── NEW (Fase 4A): Multi-User timestamps ──
    'updated_at','created_at','expires_at','last_seen'
  ]);

  // Kolom numerik yang wajib di-cast ke Number
  const NUM_COLS = new Set([
    'duration','durasi_hari','lag_days','lag',
    'total_float','float_total',
    'volume_rab','volume_rap','volume',
    'koefisien','koefisien_master','koefisien_rap',
    'harga_rab','harga_rap',
    'kapasitas_harian',                          // ← NEW
    'overhead','biaya_umum','margin',
    'kapasitas_bucket','faktor_bucket','faktor_efisiensi',
    'waktu_siklus','faktor_koreksi','faktor_konversi',
    'ts_lapangan','fk_lapangan','fa_lapangan',
    'is_group','urut','hitung_q','is_critical','is_default'
  ]);

  for (let i = 1; i < values.length; i++) {
    const obj = {};
    let hasVal = false;
    headers.forEach((h, j) => {
      if (!h) return;                 // ← FIX: skip kolom header kosong
      var v = values[i][j];
      const key = String(h).trim();

      // 1) Date object → ISO string timezone-aware (fix bug UTC drift)
      if (v instanceof Date) {
        v = Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
      }

      // 2) String numerik → Number (generik, semua kolom)
      if (typeof v === 'string') {
        const t = v.trim();
        if (t !== '' && /^-?\d+(\.\d+)?$/.test(t)) {
          v = parseFloat(t);
        } else if (isNaN(Number(t)) === false && t !== '' &&
                   (key.endsWith('_hari') || key.endsWith('_pct') || key.endsWith('_days'))) {
          // kolom bertipe "durasi_*" atau "lag_days" tapi isinya string desimal dengan pemisah
          const n = parseFloat(t.replace(/[^\d.-]/g, ''));
          if (isFinite(n)) v = n;
        }
      }

      // 3) Kolom numerik eksplisit — paksa cast kalau masih string
      if (NUM_COLS.has(key) && typeof v === 'string' && v.trim() !== '') {
        const n = parseFloat(v.replace(/[^\d.-]/g, ''));
        if (isFinite(n)) v = n;
      }

      // 4) Kolom tanggal eksplisit — kalau masih string, rapikan (mis. "03/06/2024")
      if (DATE_COLS.has(key) && typeof v === 'string' && v.trim() !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) {
        const d = new Date(v);
        if (!isNaN(d.getTime())) v = Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
      }

      // 5) JSON ter-encode
      if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
        try { v = JSON.parse(v); } catch(e){}
      }

      obj[key] = v;
      if (v !== '' && v !== null && v !== undefined) hasVal = true;
    });
    if (hasVal) rows.push(obj);
  }
  return rows;
}

function readSettings_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAMES._settings);
  if (!sh) return {};
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return {};
  const values = sh.getRange(2, 1, lastRow - 1, 2).getValues();
  const obj = {};
  values.forEach(([k, v]) => { if (k) obj[k] = v; });
  return obj;
}

/* =====================================================================
   VALIDASI & AUTO-CALCULATE
   ===================================================================== */
function hitungDurasiProyek_(tglMulai, tglSelesai, mode){
  if (!tglMulai || !tglSelesai) return { durasi_hari: 0, durasi_minggu: 0, durasi_kerja: 0 };
  const d1 = new Date(tglMulai);
  const d2 = new Date(tglSelesai);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return { durasi_hari: 0, durasi_minggu: 0, durasi_kerja: 0 };

  const diffMs = d2.getTime() - d1.getTime();
  const durasi_hari = Math.max(0, Math.round(diffMs / (1000*60*60*24)));

  // Durasi kerja (working days) — default Senin-Jumat
  let durasi_kerja = 0;
  const d = new Date(d1);
  while (d < d2){
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) durasi_kerja++;
    d.setDate(d.getDate() + 1);
  }

  const durasi_minggu = (mode === 'working')
    ? Math.ceil(durasi_kerja / 5)
    : Math.ceil(durasi_hari / 7);

  return { durasi_hari, durasi_minggu, durasi_kerja };
}

function validateDb_(db){
  if (!db || typeof db !== 'object'){
    return { ok:false, message:'DB bukan object valid.' };
  }

  const required = ['master_resources','ahsp_headers','ahsp_details_master',
                    'projects','project_ahsp_details','project_wbs','progress'];
  for (const k of required){
    if (!Array.isArray(db[k])){
      return { ok:false, message:`Tabel "${k}" hilang atau bukan array.` };
    }
  }

  const total = required.reduce((s, k) => s + db[k].length, 0);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let totalExisting = 0;
  try {
    const sh = ss.getSheetByName('master_resources');
    if (sh && sh.getLastRow() > 1) totalExisting += sh.getLastRow() - 1;
    const shP = ss.getSheetByName('projects');
    if (shP && shP.getLastRow() > 1) totalExisting += shP.getLastRow() - 1;
  } catch(e){}

  if (totalExisting > 0 && total === 0){
    return { ok:false, message:'Data yang dikirim KOSONG padahal sheet sudah berisi data. Push dibatalkan untuk mencegah kehilangan data.' };
  }

  const cleaned = JSON.parse(JSON.stringify(db));
  cleaned.projects = cleaned.projects.map(p => {
    const d = hitungDurasiProyek_(p.tgl_mulai, p.tgl_selesai, p.durasi_mode || 'working');
    return Object.assign({}, p, {
      durasi_hari: d.durasi_hari,
      durasi_minggu: d.durasi_minggu,
      durasi_kerja: d.durasi_kerja
    });
  });

  return { ok:true, message:'Validasi lolos.', cleaned, total };
}

function backupSnapshot_(db, settings){
  try {
    const props = PropertiesService.getScriptProperties();
    const snapshot = JSON.stringify({
      timestamp: new Date().toISOString(),
      db: db,
      settings: settings
    });
    const keys = ['snapshot_1','snapshot_2','snapshot_3'];
    for (let i = keys.length - 1; i > 0; i--){
      const prev = props.getProperty(keys[i-1]);
      if (prev) props.setProperty(keys[i], prev);
    }
    props.setProperty('snapshot_1', snapshot);
  } catch(e){ console.error('Backup gagal:', e); }
}

function restoreLatestSnapshot_(){
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty('snapshot_1');
  if (!raw) return { ok:false, message:'Tidak ada snapshot tersimpan.' };
  try {
    const snap = JSON.parse(raw);
    writeAll_(snap.db, snap.settings || {});
    return { ok:true, message:'Snapshot dari ' + snap.timestamp + ' berhasil dipulihkan.' };
  } catch(e){
    return { ok:false, message:'Restore gagal: ' + e.message };
  }
}

/* =====================================================================
   MAIN HANDLER — doPost & doGet
   ===================================================================== */
function doPost(e) {
  const hardLock = LockService.getScriptLock();
  try {
    hardLock.waitLock(30000);
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;
    const pl     = body.payload || {};

    /* ═══════════════════════════════════════════════════════════
       FASE 4A — AUTH ACTIONS
       ═══════════════════════════════════════════════════════════ */

    /* ── LOGIN ── */
    if (action === 'login'){
      const username = String(pl.username || '').toLowerCase().trim();
      const pin = String(pl.pin || '').trim();
      if (!username || !pin){
        return json_({ ok: false, code: 'NO_CRED', message: 'Username & PIN wajib diisi' });
      }
      const user = findUser_(username);
      if (!user){
        logChange_(username, '', 'login_failed', 'project_users', 0, 'user not found');
        return json_({ ok: false, code: 'NO_USER', message: 'Username tidak ditemukan' });
      }
      if (Number(user.aktif) !== 1){
        logChange_(username, '', 'login_failed', 'project_users', 0, 'inactive user');
        return json_({ ok: false, code: 'INACTIVE', message: 'Akun tidak aktif. Hubungi admin.' });
      }
      const pinHash = hashPin_(pin);
      if (pinHash !== String(user.pin_hash)){
        logChange_(username, '', 'login_failed', 'project_users', 0, 'wrong pin');
        return json_({ ok: false, code: 'WRONG_PIN', message: 'PIN salah' });
      }
      const session = createSession_(user);
      logChange_(username, '', 'login', 'project_users', 1, 'success');
      return json_({
        ok: true,
        session: session,
        user: {
          username: user.username,
          nama: user.nama || user.username,
          email: user.email || '',
          role: user.role,
          project_ids: session.project_ids
        },
        message: 'Login berhasil'
      });
    }

    /* ── LOGOUT ── */
    if (action === 'logout'){
      const token = pl.token;
      if (token){
        const s = findSession_(token);
        deleteSession_(token);
        if (s) logChange_(s.username, '', 'logout', 'sessions', 1, '');
      }
      return json_({ ok: true, message: 'Logout berhasil' });
    }

    /* ── GET SESSION ── */
    if (action === 'getSession'){
      const token = pl.token;
      const s = findSession_(token);
      if (!s){
        return json_({ ok: false, code: 'NO_SESSION', message: 'Session tidak valid atau expired' });
      }
      touchSession_(token);
      const user = findUser_(s.username);
      return json_({
        ok: true,
        session: {
          token: s.token,
          username: s.username,
          role: s.role,
          expires_at: String(s.expires_at)
        },
        user: user ? {
          username: user.username,
          nama: user.nama || user.username,
          email: user.email || '',
          role: user.role,
          project_ids: String(user.project_ids || '').split(',').map(function(x){ return x.trim(); }).filter(Boolean)
        } : null
      });
    }

    /* ── LIST MY PROJECTS ── */
    if (action === 'listMyProjects'){
      const token = pl.token;
      const s = findSession_(token);
      if (!s){
        return json_({ ok: false, code: 'NO_SESSION', message: 'Session tidak valid' });
      }
      const user = findUser_(s.username);
      if (!user){
        return json_({ ok: false, code: 'NO_USER', message: 'User tidak ditemukan' });
      }
      const allProjects = readSheet_(SHEET_NAMES.projects);
      let allowed;
      if (user.role === 'superadmin' || String(user.project_ids).trim() === '*'){
        allowed = allProjects;
      } else {
        const ids = resolveUserProjectIds_(user.project_ids);
        allowed = allProjects.filter(function(p){ return ids.indexOf(String(p.id)) >= 0; });
      }
      return json_({ ok: true, projects: allowed, total: allowed.length });
    }

    /* ── SOFT LOCK: acquire ── */
    if (action === 'softLock'){
      const active = readSoftLock_();
      if (active && active.clientId !== pl.clientId){
        return json_({
          ok: false, code: 'LOCKED',
          message: 'User lain sedang mengedit sejak ' +
                   new Date(active.acquiredAt).toLocaleTimeString('id-ID') + '.',
          holder: active.clientId,
          expiresAt: active.expiresAt
        });
      }
      const lock = writeSoftLock_(pl.clientId, pl.ttlMs);
      return json_({ ok: true, expiresAt: lock.expiresAt, dbVersion: getDbVersion_() });
    }

    /* ── SOFT LOCK: release ── */
    if (action === 'softRelease'){
      const active = readSoftLock_();
      if (active && active.clientId === pl.clientId) clearSoftLock_();
      return json_({ ok: true, message: 'Lock dilepas.' });
    }

    /* ── SOFT LOCK: status ── */
    if (action === 'softStatus'){
      const active = readSoftLock_();
      return json_({
        ok: true,
        locked: !!active,
        holder: active ? active.clientId : null,
        expiresAt: active ? active.expiresAt : null,
        dbVersion: getDbVersion_()
      });
    }

        /* ── CHECK PROJECT VERSIONS (untuk Sync Manager) ── */
    if (action === 'checkProjectVersions') {
      const serverVer = getDbVersion_();
      const clientVer = parseInt(pl.clientVersion, 10) || 0;

      // Fast path: kalau versi sama → skip baca sheet (hemat!)
      if (serverVer === clientVer) {
        return json_({
          ok: true,
          unchanged: true,
          dbVersion: serverVer
        });
      }

      // Ada perubahan → baca sheet projects (hanya kolom penting)
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sh = ss.getSheetByName('projects');
      const versions = {};
      if (sh && sh.getLastRow() > 1) {
        const data = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
        const hdr = data[0].map(function(h){ return String(h).trim(); });
        const idxId = hdr.indexOf('id');
        const idxVer = hdr.indexOf('project_version');
        const idxBy = hdr.indexOf('updated_by');
        const idxAt = hdr.indexOf('updated_at');
        for (let i = 1; i < data.length; i++){
          const id = data[i][idxId];
          if (!id) continue;
          versions[String(id)] = {
            version: idxVer >= 0 ? (parseInt(data[i][idxVer], 10) || 0) : 0,
            updated_by: idxBy >= 0 ? String(data[i][idxBy] || '') : '',
            updated_at: idxAt >= 0 ? String(data[i][idxAt] || '') : ''
          };
        }
      }
      return json_({
        ok: true,
        unchanged: false,
        versions: versions,
        dbVersion: serverVer
      });
    }

    /* ═══════════════════════════════════════════════════════════
       FASE 4B — PUSH PER PROYEK (Partial Push)
       Hanya kirim slice 1 proyek → tidak ganggu proyek lain
       ═══════════════════════════════════════════════════════════ */
    if (action === 'pushProject') {
      const token = pl.token;
      const s = findSession_(token);
      if (!s){
        return json_({ ok: false, code: 'NO_SESSION', message: 'Session tidak valid' });
      }
      const user = findUser_(s.username);
      if (!user){
        return json_({ ok: false, code: 'NO_USER', message: 'User tidak ditemukan' });
      }

      const projectId = pl.projectId;
      if (!projectId){
        return json_({ ok: false, code: 'NO_PROJECT', message: 'projectId wajib diisi' });
      }

      /* ── RBAC CHECK v2 ──
         superadmin / admin : full edit, semua proyek
         user               : full edit, hanya proyek yang di-assign
         owner              : READ-ONLY, tidak boleh push/edit
      ── */
      const roleLc = String(user.role || '').toLowerCase();
      const canEdit = (roleLc === 'superadmin' || roleLc === 'admin' || roleLc === 'user');
      const hasAccess = userCanAccessProject_(user, projectId);

      if (!hasAccess || !canEdit){
        logChange_(s.username, projectId, 'push_denied', '', 0, `role: ${user.role}, access: ${hasAccess}, canEdit: ${canEdit}`);
        return json_({ ok: false, code: 'NO_ACCESS', message: 'Anda tidak punya izin mengedit proyek ini' });
      }
      /* ── END RBAC CHECK ── */

      /* Per-project lock */
      const lockKey = 'mk_lock_project_' + projectId;
      const props = PropertiesService.getScriptProperties();
      const lockRaw = props.getProperty(lockKey);
      const nowMs = Date.now();
      if (lockRaw){
        try {
          const lock = JSON.parse(lockRaw);
          if (lock.expiresAt > nowMs && lock.username !== s.username){
            return json_({
              ok: false, code: 'LOCKED',
              message: 'Proyek sedang diedit oleh ' + lock.username + '. Coba lagi sebentar.',
              holder: lock.username,
              expiresAt: lock.expiresAt
            });
          }
        } catch(e){}
      }
      props.setProperty(lockKey, JSON.stringify({
        username: s.username,
        acquiredAt: nowMs,
        expiresAt: nowMs + 120000
      }));

      try {
        const patch = pl.data || {};
        const projectRows      = patch.projects || [];
        const wbsRows          = patch.project_wbs || [];
        const ahspDetailsRows  = patch.project_ahsp_details || [];
        const progressRows     = patch.progress || [];

        /* Stamp metadata */
        const nowIso = new Date().toISOString();
        const stamp = function(row){
          if (!row.updated_at) row.updated_at = nowIso;
          if (!row.updated_by) row.updated_by = s.username;
          return row;
        };
        projectRows.forEach(function(r){
          stamp(r);
          r.project_version = (parseInt(r.project_version, 10) || 0) + 1;
        });
        wbsRows.forEach(stamp);
        ahspDetailsRows.forEach(stamp);
        progressRows.forEach(stamp);

        /* MERGE: existing (other projects) + new (this project) */
        const allProjects = readSheet_(SHEET_NAMES.projects);
        const otherProjects = allProjects.filter(function(p){ return String(p.id) !== String(projectId); });
        writeSheet_(SHEET_NAMES.projects, otherProjects.concat(projectRows));

        const allWbs = readSheet_(SHEET_NAMES.project_wbs);
        const otherWbs = allWbs.filter(function(w){ return String(w.project_id) !== String(projectId); });
        writeSheet_(SHEET_NAMES.project_wbs, otherWbs.concat(wbsRows));

        const allAhsp = readSheet_(SHEET_NAMES.project_ahsp_details);
        const otherAhsp = allAhsp.filter(function(a){ return String(a.project_id) !== String(projectId); });
        writeSheet_(SHEET_NAMES.project_ahsp_details, otherAhsp.concat(ahspDetailsRows));

        const allProg = readSheet_(SHEET_NAMES.progress);
        const otherProg = allProg.filter(function(p){ return String(p.project_id) !== String(projectId); });
        writeSheet_(SHEET_NAMES.progress, otherProg.concat(progressRows));

        const newVer = bumpDbVersion_();

        logChange_(s.username, projectId, 'push_project', 'multiple',
          wbsRows.length + progressRows.length + ahspDetailsRows.length,
          'proj:' + projectRows.length + ' wbs:' + wbsRows.length +
          ' ahsp:' + ahspDetailsRows.length + ' prog:' + progressRows.length);

        return json_({
          ok: true,
          message: 'Proyek tersimpan (v' + newVer + ')',
          dbVersion: newVer,
          counts: {
            projects: projectRows.length,
            wbs: wbsRows.length,
            ahsp: ahspDetailsRows.length,
            progress: progressRows.length
          }
        });
      } finally {
        props.deleteProperty(lockKey);
      }
    }

    /* ── GET PROJECT (pull partial) ── */
    if (action === 'getProject') {
      const token = pl.token;
      const s = findSession_(token);
      if (!s){
        return json_({ ok: false, code: 'NO_SESSION', message: 'Session tidak valid' });
      }
      const user = findUser_(s.username);
      if (!user){
        return json_({ ok: false, code: 'NO_USER', message: 'User tidak ditemukan' });
      }
      const projectId = pl.projectId;
      if (!projectId){
        return json_({ ok: false, code: 'NO_PROJECT', message: 'projectId wajib' });
      }
      if (!userCanAccessProject_(user, projectId)){
        return json_({ ok: false, code: 'NO_ACCESS', message: 'Tidak punya akses ke proyek ini' });
      }

      const proj = readSheet_(SHEET_NAMES.projects).filter(function(p){ return String(p.id) === String(projectId); });
      const wbs  = readSheet_(SHEET_NAMES.project_wbs).filter(function(w){ return String(w.project_id) === String(projectId); });
      const ahsp = readSheet_(SHEET_NAMES.project_ahsp_details).filter(function(a){ return String(a.project_id) === String(projectId); });
      const prog = readSheet_(SHEET_NAMES.progress).filter(function(p){ return String(p.project_id) === String(projectId); });

      return json_({
        ok: true,
        projectId: projectId,
        data: {
          projects: proj,
          project_wbs: wbs,
          project_ahsp_details: ahsp,
          progress: prog
        },
        dbVersion: getDbVersion_()
      });
    }

    /* ═══════════════════════════════════════════════════════════
       FASE 4F — USER MANAGEMENT (superadmin only)
       ═══════════════════════════════════════════════════════════ */

    /* ── LIST USERS ── */
    if (action === 'listUsers'){
      const token = pl.token;
      const s = findSession_(token);
      if (!s) return json_({ ok: false, code: 'NO_SESSION', message: 'Session tidak valid' });
      const me = findUser_(s.username);
      if (!me || (me.role !== 'superadmin' && me.role !== 'admin')){
        return json_({ ok: false, code: 'NO_ACCESS', message: 'Hanya superadmin' });
      }
      const users = readUsers_();
      const safe = users.map(function(u){
        return {
          username: u.username,
          nama: u.nama,
          email: u.email,
          role: u.role,
          project_ids: String(u.project_ids || '').split(',').map(function(x){ return x.trim(); }).filter(Boolean),
          project_ids_raw: String(u.project_ids || ''),
          aktif: Number(u.aktif) === 1,
          created_at: String(u.created_at || ''),
          id: u.id
        };
      });
      return json_({ ok: true, users: safe, total: safe.length });
    }

    /* ── ADD USER ── */
    if (action === 'addUser'){
      const token = pl.token;
      const s = findSession_(token);
      if (!s) return json_({ ok: false, code: 'NO_SESSION', message: 'Session tidak valid' });
      const me = findUser_(s.username);
      if (!me || me.role !== 'superadmin'){
        return json_({ ok: false, code: 'NO_ACCESS', message: 'Hanya superadmin' });
      }
      const newUser = pl.user || {};
      if (!newUser.username || !newUser.pin){
        return json_({ ok: false, code: 'NO_CRED', message: 'Username & PIN wajib' });
      }
      const existing = findUser_(newUser.username);
      if (existing){
        return json_({ ok: false, code: 'DUPLICATE', message: 'Username sudah ada' });
      }
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sh = ss.getSheetByName(SHEET_NAMES.project_users);
      if (!sh) return json_({ ok: false, code: 'NO_SHEET', message: 'Sheet project_users tidak ada' });
      const nowIso = new Date().toISOString();
      const id = 'usr_' + Utilities.getUuid().slice(0, 8);
      sh.appendRow([
        String(newUser.username).toLowerCase().trim(),
        hashPin_(newUser.pin),
        newUser.nama || newUser.username,
        newUser.email || '',
        newUser.role || 'user',
        newUser.project_ids || '',
        newUser.aktif !== false ? 1 : 0,
        nowIso,
        id
      ]);
      logChange_(s.username, '', 'add_user', 'project_users', 1, 'user=' + newUser.username);
      return json_({ ok: true, message: '✅ User "' + newUser.username + '" dibuat', id: id });
    }

    /* ── UPDATE USER ── */
    if (action === 'updateUser'){
      const token = pl.token;
      const s = findSession_(token);
      if (!s) return json_({ ok: false, code: 'NO_SESSION', message: 'Session tidak valid' });
      const me = findUser_(s.username);
      if (!me || me.role !== 'superadmin'){
        return json_({ ok: false, code: 'NO_ACCESS', message: 'Hanya superadmin' });
      }
      const target = pl.user || {};
      if (!target.username) return json_({ ok: false, code: 'NO_USER', message: 'username wajib' });

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sh = ss.getSheetByName(SHEET_NAMES.project_users);
      if (!sh) return json_({ ok: false, code: 'NO_SHEET', message: 'Sheet tidak ada' });

      const lastRow = sh.getLastRow();
      const lastCol = sh.getLastColumn();
      const values = sh.getRange(1, 1, lastRow, lastCol).getValues();
      const headers = values[0].map(function(h){ return String(h).trim(); });
      const idxUsername = headers.indexOf('username');

      let rowIdx = -1;
      for (let i = 1; i < values.length; i++){
        if (String(values[i][idxUsername]).toLowerCase().trim() === String(target.username).toLowerCase().trim()){
          rowIdx = i;
          break;
        }
      }
      if (rowIdx < 0) return json_({ ok: false, code: 'NO_USER', message: 'User tidak ditemukan' });

      const newRow = values[rowIdx].slice();
      const setCol = function(colName, val){
        const i = headers.indexOf(colName);
        if (i >= 0 && val !== undefined) newRow[i] = val;
      };
      if (target.nama !== undefined) setCol('nama', target.nama);
      if (target.email !== undefined) setCol('email', target.email);
      if (target.role !== undefined) setCol('role', target.role);
      if (target.project_ids !== undefined) setCol('project_ids', target.project_ids);
      if (target.aktif !== undefined) setCol('aktif', target.aktif ? 1 : 0);
      if (target.pin) setCol('pin_hash', hashPin_(target.pin));

      sh.getRange(rowIdx + 1, 1, 1, newRow.length).setValues([newRow]);
      logChange_(s.username, '', 'update_user', 'project_users', 1, 'user=' + target.username);
      return json_({ ok: true, message: '✅ User diupdate' });
    }

    /* ── DELETE USER ── */
    if (action === 'deleteUser'){
      const token = pl.token;
      const s = findSession_(token);
      if (!s) return json_({ ok: false, code: 'NO_SESSION', message: 'Session tidak valid' });
      const me = findUser_(s.username);
      if (!me || me.role !== 'superadmin'){
        return json_({ ok: false, code: 'NO_ACCESS', message: 'Hanya superadmin' });
      }
      const targetUsername = pl.username;
      if (!targetUsername) return json_({ ok: false, code: 'NO_USER', message: 'username wajib' });
      if (String(targetUsername).toLowerCase() === 'admin'){
        return json_({ ok: false, code: 'PROTECTED', message: 'Superadmin admin tidak bisa dihapus' });
      }

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sh = ss.getSheetByName(SHEET_NAMES.project_users);
      if (!sh) return json_({ ok: false, code: 'NO_SHEET', message: 'Sheet tidak ada' });

      const lastRow = sh.getLastRow();
      const values = sh.getRange(1, 1, lastRow, 1).getValues();
      for (let i = 1; i < values.length; i++){
        if (String(values[i][0]).toLowerCase().trim() === String(targetUsername).toLowerCase().trim()){
          sh.deleteRow(i + 1);
          logChange_(s.username, '', 'delete_user', 'project_users', 1, 'user=' + targetUsername);
          return json_({ ok: true, message: '✅ User dihapus' });
        }
      }
      return json_({ ok: false, code: 'NO_USER', message: 'User tidak ditemukan' });
    }


    /* ── PUSH dengan version guard ── */
    if (action === 'push') {
      const db       = pl.db;
      const settings = pl.settings || {};
      const baseVer  = (pl.baseVersion === undefined) ? null : pl.baseVersion;
      const clientId = pl.clientId || 'anon';

      // Cek soft lock yang masih aktif oleh user lain
      const active = readSoftLock_();
      if (active && active.clientId !== clientId){
        return json_({
          ok: false, code: 'LOCKED',
          message: 'Tidak bisa Push — user lain sedang mengedit (' +
                   new Date(active.acquiredAt).toLocaleTimeString('id-ID') + ').'
        });
      }

      // Cek versi (optimistic concurrency)
      const serverVer = getDbVersion_();
      if (baseVer !== null && baseVer !== serverVer){
        return json_({
          ok: false, code: 'CONFLICT',
          message: `Data di server sudah berubah (server v${serverVer}, klien v${baseVer}). ` +
                   'Silakan Pull dulu sebelum Push.',
          serverVersion: serverVer,
          clientVersion: baseVer
        });
      }

      const v = validateDb_(db);
      if (!v.ok){
        return json_({ ok:false, message: 'Validasi gagal: ' + v.message });
      }

      // ── NEW: Increment project_version untuk setiap proyek ──
      const nowIso = new Date().toISOString();
      if (Array.isArray(v.cleaned.projects)){
        v.cleaned.projects.forEach(function(p){
          p.project_version = (parseInt(p.project_version, 10) || 0) + 1;
          if (!p.updated_at) p.updated_at = nowIso;
          if (!p.updated_by) p.updated_by = 'push';
        });
      }

      backupSnapshot_(v.cleaned, settings);
      writeAll_(v.cleaned, settings);

      const newVer = bumpDbVersion_();
      clearSoftLock_();   // edit selesai, lepas lock

      return json_({
        ok: true,
        message: 'Tersinkronisasi: ' + v.total + ' record (v' + newVer + ').',
        dbVersion: newVer
      });
    }

    /* ── PULL ── */
    if (action === 'pull') {
      const db = readAll_();
      const settings = readSettings_();
      return json_({
        ok: true,
        db, settings,
        dbVersion: getDbVersion_()
      });
    }

    /* ── RESTORE ── */
    if (action === 'restore') {
      const r = restoreLatestSnapshot_();
      if (r.ok) r.dbVersion = bumpDbVersion_();
      return json_(r);
    }

    return json_({ ok: false, message: 'Action tidak dikenal: ' + action });
  } catch (err) {
    return json_({ ok: false, message: 'Error: ' + err.message });
  } finally {
    try { hardLock.releaseLock(); } catch(e){}
  }
}

function doOptions(e) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(headers);
}

function doGetApi() {
  return json_({ ok: true, message: 'API aktif.' });
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* =====================================================================
   MIGRASI v2 — Jalankan sekali di Apps Script Editor
   ===================================================================== */
function migrateV2(){
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let shCal = ss.getSheetByName('working_calendars');
  if (!shCal){
    shCal = ss.insertSheet('working_calendars');
    const headers = ['kode','nama','work_days','jam_per_hari','start_hour','keterangan','is_default','id'];
    const rows = [
      headers,
      ['CAL-STD','Kalender Standar (Senin-Jumat)','1,2,3,4,5',8,'08:00','Standar proyek pemerintah', 1, 'wcal_std_001'],
      ['CAL-6D','Kalender 6 Hari Kerja','1,2,3,4,5,6',8,'08:00','Untuk proyek percepatan', 0, 'wcal_6d_002'],
      ['CAL-24H','Kalender 24/7','0,1,2,3,4,5,6',24,'00:00','Untuk pekerjaan kontinu', 0, 'wcal_24h_003']
    ];
    shCal.getRange(1,1,rows.length,headers.length).setValues(rows);
    shCal.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#1f4e79').setFontColor('#ffffff');
    shCal.setFrozenRows(1);
  }

  let shHol = ss.getSheetByName('holidays');
  if (!shHol){
    shHol = ss.insertSheet('holidays');
    const headers = ['tanggal','nama','jenis','calendar_id','id'];
    const rows = [
      headers,
      ['2026-01-01','Tahun Baru 2026','nasional','wcal_std_001','hol_001'],
      ['2026-03-19','Nyepi','nasional','wcal_std_001','hol_002'],
      ['2026-04-03','Wafat Isa Almasih','nasional','wcal_std_001','hol_003'],
      ['2026-05-01','Hari Buruh','nasional','wcal_std_001','hol_004'],
      ['2026-05-14','Kenaikan Isa Almasih','nasional','wcal_std_001','hol_005'],
      ['2026-06-01','Hari Lahir Pancasila','nasional','wcal_std_001','hol_006'],
      ['2026-08-17','Hari Kemerdekaan RI','nasional','wcal_std_001','hol_007'],
      ['2026-12-25','Hari Natal','nasional','wcal_std_001','hol_008']
    ];
    shHol.getRange(1,1,rows.length,headers.length).setValues(rows);
    shHol.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#1f4e79').setFontColor('#ffffff');
    shHol.setFrozenRows(1);
  }

  SpreadsheetApp.getUi().alert(
    'Migrasi v2 selesai.\n\n' +
    'Sheet working_calendars & holidays berhasil dibuat.\n\n' +
    'Langkah selanjutnya:\n' +
    '1. Deploy ulang Web App (New version)\n' +
    '2. Buka aplikasi web → tab ⚙ Pengaturan → Push ke Sheet'
  );
}

/* =====================================================================
   MIGRASI SCHEDULE v1 — Tambah kolom penjadwalan baru (NON-DESTRUKTIF)
   Jalankan manual SEKALI dari Apps Script Editor.
   ===================================================================== */
function migrateScheduleSchemaV1(){
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('project_wbs');

  if (!sh){
    ui.alert('Sheet "project_wbs" belum ada. Tidak ada yang perlu dimigrasi.');
    return;
  }

  const lastCol = sh.getLastColumn();
  if (lastCol < 1){
    ui.alert('Sheet "project_wbs" kosong.');
    return;
  }

  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0]
                    .map(h => String(h).trim());
  const NEW_COLS = [
    'durasi_hari',
    'tgl_mulai_rencana','tgl_selesai_rencana',
    'tgl_mulai_aktual','tgl_selesai_aktual',
    'float_total'
  ];

  const toAdd = NEW_COLS.filter(c => headers.indexOf(c) < 0);
  if (!toAdd.length){
    ui.alert('✅ Semua kolom penjadwalan sudah ada. Tidak ada yang ditambahkan.');
    return;
  }

  // Sisipkan setelah kolom terakhir (append), biarkan urutan lama utuh
  const startCol = lastCol + 1;
  const range = sh.getRange(1, startCol, 1, toAdd.length);
  range.setValues([toAdd]);
  range.setFontWeight('bold')
       .setBackground('#1f4e79')
       .setFontColor('#ffffff')
       .setHorizontalAlignment('center');
  sh.setFrozenRows(1);

  ui.alert(
    '✅ Migrasi Fase 1 selesai.\n\n' +
    'Kolom baru ditambahkan ke project_wbs:\n• ' + toAdd.join('\n• ') + '\n\n' +
    'Data baris lama TIDAK diubah. Silakan lanjutkan dengan deploy ulang ' +
    'Web App (New version) agar endpoint pull/push mengenali kolom ini.'
  );
}

/* =====================================================================
   MIGRASI SCHEDULE v1 — Fase 4: kolom kapasitas_harian (NON-DESTRUKTIF)
   Jalankan manual SEKALI dari Apps Script Editor.
   ===================================================================== */
function migrateResourceCapacity(){
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('master_resources');
  if (!sh){
    ui.alert('Sheet master_resources tidak ada.');
    return;
  }

  const lastCol = sh.getLastColumn();
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0]
                    .map(h => String(h).trim());

  if (headers.indexOf('kapasitas_harian') >= 0){
    ui.alert('✅ Kolom kapasitas_harian sudah ada.');
    return;
  }

  let insertAt = headers.indexOf('hitung_q');
  if (insertAt < 0) insertAt = lastCol;
  sh.insertColumnBefore(insertAt + 1);

  const cell = sh.getRange(1, insertAt + 1);
  cell.setValue('kapasitas_harian')
      .setFontWeight('bold').setBackground('#1f4e79')
      .setFontColor('#ffffff').setHorizontalAlignment('center');

  ui.alert(
    '✅ Kolom kapasitas_harian ditambahkan.\n\n' +
    'Isi kolom ini dengan kapasitas maksimum harian per resource. ' +
    'Contoh: Pekerja=20 orang, Excavator=3 unit, Semen=500 sak.\n\n' +
    'Kosongkan kalau tidak ingin resource tsb diperiksa over-allocation.'
  );
}

/* =====================================================================
   MIGRASI SCHEDULE v1 — Fase 1A: Auto vs Manual Scheduling (NON-DESTRUKTIF)
   Menambahkan kolom: schedule_mode, manual_start, manual_finish
   Jalankan manual SEKALI dari Apps Script Editor.
   ===================================================================== */
function migrateScheduleModeV1(){
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('project_wbs');

  if (!sh){
    ui.alert('Sheet "project_wbs" belum ada. Tidak ada yang perlu dimigrasi.');
    return;
  }

  const lastCol = sh.getLastColumn();
  if (lastCol < 1){
    ui.alert('Sheet "project_wbs" kosong.');
    return;
  }

  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0]
                    .map(h => String(h).trim());

  // Kolom baru yang akan ditambahkan (urutan penting)
  const NEW_COLS = ['schedule_mode', 'manual_start', 'manual_finish'];
  const toAdd = NEW_COLS.filter(c => headers.indexOf(c) < 0);

  if (!toAdd.length){
    ui.alert('✅ Semua kolom Fase 1A sudah ada. Tidak ada yang ditambahkan.');
    return;
  }

  // Strategi: sisipkan setelah 'duration' kalau ada, jika tidak append di akhir.
  // Gunakan insertColumnsAfter agar kolom lain tidak bergeser secara destruktif
  // (kolom baru benar-benar kosong, tidak menyentuh data yang ada).
  const anchor = headers.indexOf('duration');
  let startCol;

  if (anchor >= 0){
    // Sisipkan tepat setelah kolom 'duration'
    sh.insertColumnsAfter(anchor + 1, toAdd.length);
    startCol = anchor + 2;
  } else {
    // Fallback: append di akhir (pola migrasi sebelumnya)
    startCol = lastCol + 1;
  }

  const range = sh.getRange(1, startCol, 1, toAdd.length);
  range.setValues([toAdd]);
  range.setFontWeight('bold')
       .setBackground('#1f4e79')
       .setFontColor('#ffffff')
       .setHorizontalAlignment('center')
       .setVerticalAlignment('middle');
  sh.setRowHeight(1, 34);
  sh.setFrozenRows(1);

  // Pre-fill semua baris data dengan 'auto' untuk schedule_mode,
  // supaya task lama otomatis berperilaku sebagai Auto Scheduled
  // (kompatibel penuh dengan perilaku lama).
  const lastRow = sh.getLastRow();
  const modeColIdx = startCol + toAdd.indexOf('schedule_mode');
  if (lastRow > 1 && toAdd.indexOf('schedule_mode') >= 0){
    const modeRange = sh.getRange(2, modeColIdx, lastRow - 1, 1);
    const modeValues = modeRange.getValues().map(r => [r[0] || 'auto']);
    modeRange.setValues(modeValues);
  }

  ui.alert(
    '✅ Migrasi Fase 1A selesai.\n\n' +
    'Kolom baru ditambahkan ke project_wbs:\n• ' + toAdd.join('\n• ') + '\n\n' +
    'Semua baris lama otomatis disetel ke schedule_mode = "auto" ' +
    '(perilaku identik dengan versi sebelumnya).\n\n' +
    'Langkah selanjutnya:\n' +
    '1. Deploy ulang Web App (New version)\n' +
    '2. Buka aplikasi web → tab ⚙ Pengaturan → Pull dari Sheet ' +
    'untuk sinkronisasi schema baru.'
  );
}

/* =====================================================================
   MIGRASI SCHEDULE v1 — Fase 2E: Work Contour per Task (NON-DESTRUKTIF)
   Menambahkan kolom: work_contour
   Jalankan manual SEKALI dari Apps Script Editor.
   ===================================================================== */
function migrateWorkContourV1(){
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('project_wbs');

  if (!sh){
    ui.alert('Sheet "project_wbs" belum ada.');
    return;
  }

  const lastCol = sh.getLastColumn();
  if (lastCol < 1){
    ui.alert('Sheet "project_wbs" kosong.');
    return;
  }

  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0]
                    .map(h => String(h).trim());

  if (headers.indexOf('work_contour') >= 0){
    ui.alert('✅ Kolom work_contour sudah ada.');
    return;
  }

  // Append di akhir (paling aman, tidak mengganggu kolom lain)
  const startCol = lastCol + 1;
  const range = sh.getRange(1, startCol, 1, 1);
  range.setValue('work_contour');
  range.setFontWeight('bold')
       .setBackground('#1f4e79')
       .setFontColor('#ffffff')
       .setHorizontalAlignment('center')
       .setVerticalAlignment('middle');
  sh.setFrozenRows(1);

  // Pre-fill existing rows dengan 'uniform' (default = perilaku lama)
  const lastRow = sh.getLastRow();
  if (lastRow > 1){
    const dataRange = sh.getRange(2, startCol, lastRow - 1, 1);
    const vals = dataRange.getValues().map(r => [r[0] || 'uniform']);
    dataRange.setValues(vals);
  }

  ui.alert(
    '✅ Migrasi Fase 2E selesai.\n\n' +
    'Kolom work_contour ditambahkan ke project_wbs.\n' +
    'Semua baris lama disetel ke "uniform" (perilaku identik dengan versi sebelumnya).\n\n' +
    'Langkah selanjutnya:\n' +
    '1. Deploy ulang Web App (New version)\n' +
    '2. Buka aplikasi web → ⚙ Pengaturan → Pull dari Sheet'
  );
}

/* =====================================================================
   FASE 4A — MULTI-USER: AUTH + LOGGING + SESSION
   ===================================================================== */

/**
 * SHA-256 hash untuk PIN. Deterministic, cocok untuk verifikasi.
 */
function hashPin_(pin){
  const raw = String(pin || '') + '|mk_v1_salt';
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  return bytes.map(function(b){
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

/**
 * Ambil semua user dari sheet project_users.
 */
function readUsers_(){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAMES.project_users);
  if (!sh) return [];
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2) return [];
  const values = sh.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0].map(function(h){ return String(h).trim(); });
  const out = [];
  for (let i = 1; i < values.length; i++){
    const obj = {};
    headers.forEach(function(h, j){ if (h) obj[h] = values[i][j]; });
    if (obj.username) out.push(obj);
  }
  return out;
}

/**
 * Baca session dari sheet sessions. Auto-cleanup expired.
 */
function readSessions_(){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAMES.sessions);
  if (!sh) return [];
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2) return [];
  const values = sh.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0].map(function(h){ return String(h).trim(); });
  const out = [];
  const now = Date.now();
  for (let i = 1; i < values.length; i++){
    const obj = {};
    headers.forEach(function(h, j){ if (h) obj[h] = values[i][j]; });
    if (!obj.token) continue;
    const exp = obj.expires_at ? new Date(obj.expires_at).getTime() : 0;
    if (exp > now) out.push(obj);
  }
  return out;
}

/**
 * Cari user by username.
 */
function findUser_(username){
  const users = readUsers_();
  const u = String(username || '').toLowerCase().trim();
  return users.find(function(x){ return String(x.username).toLowerCase().trim() === u; });
}

/**
 * Cari session by token.
 */
function findSession_(token){
  if (!token) return null;
  const sessions = readSessions_();
  return sessions.find(function(s){ return s.token === token; });
}

/**
 * Buat session baru untuk user.
 */
function createSession_(user){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAMES.sessions);
  if (!sh){
    sh = ss.insertSheet(SHEET_NAMES.sessions);
    sh.getRange(1, 1, 1, 7).setValues([['token','username','role','created_at','expires_at','last_seen','id']]);
    sh.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#1f4e79').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  const token = 'tok_' + Utilities.getUuid().slice(0, 16);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 hari
  const id = 'sess_' + Utilities.getUuid().slice(0, 8);
  sh.appendRow([token, user.username, user.role, now, expiresAt, now, id]);
  /* Fase 4F: resolve project_ids (kode → id) */
  const resolvedIds = resolveUserProjectIds_(user.project_ids);

  return {
    token: token,
    username: user.username,
    role: user.role,
    nama: user.nama || user.username,
    project_ids: resolvedIds,
    project_ids_raw: String(user.project_ids || ''),
    expires_at: expiresAt.toISOString()
  };
}

/**
 * Update last_seen session.
 */
function touchSession_(token){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAMES.sessions);
  if (!sh) return;
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return;
  const values = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < values.length; i++){
    if (values[i][0] === token){
      sh.getRange(i + 2, 6).setValue(new Date());
      return;
    }
  }
}

/**
 * Hapus session by token.
 */
function deleteSession_(token){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAMES.sessions);
  if (!sh) return;
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return;
  const values = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = values.length - 1; i >= 0; i--){
    if (values[i][0] === token){
      sh.deleteRow(i + 2);
      return;
    }
  }
}

/**
 * Catat perubahan ke change_log.
 */
function logChange_(username, projectId, action, sheetName, rowCount, detail){
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(SHEET_NAMES.change_log);
    if (!sh){
      sh = ss.insertSheet(SHEET_NAMES.change_log);
      sh.getRange(1, 1, 1, 8).setValues([['timestamp','username','project_id','action','sheet_name','row_count','detail','id']]);
      sh.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#1f4e79').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
    const id = 'log_' + Utilities.getUuid().slice(0, 10);
    sh.appendRow([new Date(), username || 'anon', projectId || '', action || '', sheetName || '', rowCount || 0, detail || '', id]);

    // Auto-cleanup: max 10,000 baris
    const lastRow = sh.getLastRow();
    if (lastRow > 10001){
      sh.deleteRows(2, lastRow - 10000);
    }
  } catch(e){
    console.error('logChange_ gagal:', e);
  }
}

/* =====================================================================
   FASE 4F — RESOLVE PROJECT KODE ↔ ID (Multi-User Enhancement)
   ===================================================================== */

/**
 * Resolve KODE proyek → internal id.
 * Support: "SDA-2026-001" → "prj_xxx"
 */
function resolveProjectKodeToId_(kode){
  if (!kode) return null;
  const target = String(kode).trim().toLowerCase();
  const projects = readSheet_(SHEET_NAMES.projects);
  for (let i = 0; i < projects.length; i++){
    if (String(projects[i].kode || '').trim().toLowerCase() === target){
      return String(projects[i].id);
    }
  }
  return null;
}

/**
 * Resolve project_ids user (bisa kode ATAU id) → array of internal ids.
 * Support:
 *   - "*"                          → ["*"] (semua proyek)
 *   - "SDA-2026-001, SDA-2026-002" → ["prj_xxx","prj_yyy"]
 *   - "prj_xxx, prj_yyy"           → dipakai apa adanya (backward compat)
 */
function resolveUserProjectIds_(projectIdsRaw){
  const raw = String(projectIdsRaw || '').trim();
  if (raw === '*') return ['*'];
  if (!raw) return [];

  const parts = raw.split(',').map(function(s){ return s.trim(); }).filter(Boolean);
  const result = [];
  const projects = readSheet_(SHEET_NAMES.projects);

  parts.forEach(function(p){
    const idFromKode = resolveProjectKodeToId_(p);
    if (idFromKode){
      result.push(idFromKode);
      return;
    }
    const found = projects.find(function(x){ return String(x.id) === p; });
    if (found) result.push(p);
    else result.push(p);
  });
  return result;
}

/**
 * Cek apakah user punya akses ke projectId tertentu.
 */
function userCanAccessProject_(user, projectId){
  if (!user) return false;
  const roleLc = String(user.role || '').toLowerCase();
  // superadmin & admin: akses semua proyek
  if (roleLc === 'superadmin' || roleLc === 'admin') return true;
  const raw = String(user.project_ids || '').trim();
  if (raw === '*') return true;
  const resolved = resolveUserProjectIds_(raw);
  return resolved.indexOf(String(projectId)) >= 0;
}

/* =====================================================================
   MIGRASI — Fase 4A Multi-User Foundation
   Jalankan manual SEKALI dari Apps Script Editor.
   Menggunakan console.log (bukan UI alert) untuk kompatibilitas.
   ===================================================================== */
function migrateMultiUserV1(){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const messages = [];

  console.log('══════ MIGRASI FASE 4A — START ══════');

  /* ═══ 1. Buat sheet project_users ═══ */
  let shUsers = ss.getSheetByName('project_users');
  if (!shUsers){
    shUsers = ss.insertSheet('project_users');
    const headers = ['username','pin_hash','nama','email','role','project_ids','aktif','created_at','id'];
    const superadminPin = hashPin_('123456');
    const rows = [
      headers,
      ['admin', superadminPin, 'Administrator', 'admin@example.com', 'superadmin', '*', 1, new Date().toISOString(), 'usr_admin_001']
    ];
    shUsers.getRange(1, 1, rows.length, headers.length).setValues(rows);
    shUsers.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#1f4e79')
      .setFontColor('#ffffff')
      .setHorizontalAlignment('center');
    shUsers.setFrozenRows(1);
    messages.push('✅ Sheet "project_users" dibuat (admin / PIN: 123456)');
  } else {
    messages.push('ℹ Sheet "project_users" sudah ada — skip');
  }

  /* ═══ 2. Buat sheet change_log ═══ */
  let shLog = ss.getSheetByName('change_log');
  if (!shLog){
    shLog = ss.insertSheet('change_log');
    const headers = ['timestamp','username','project_id','action','sheet_name','row_count','detail','id'];
    shLog.getRange(1, 1, 1, headers.length).setValues([headers]);
    shLog.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#1f4e79')
      .setFontColor('#ffffff')
      .setHorizontalAlignment('center');
    shLog.setFrozenRows(1);
    messages.push('✅ Sheet "change_log" dibuat');
  } else {
    messages.push('ℹ Sheet "change_log" sudah ada — skip');
  }

  /* ═══ 3. Buat sheet sessions ═══ */
  let shSess = ss.getSheetByName('sessions');
  if (!shSess){
    shSess = ss.insertSheet('sessions');
    const headers = ['token','username','role','created_at','expires_at','last_seen','id'];
    shSess.getRange(1, 1, 1, headers.length).setValues([headers]);
    shSess.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#1f4e79')
      .setFontColor('#ffffff')
      .setHorizontalAlignment('center');
    shSess.setFrozenRows(1);
    messages.push('✅ Sheet "sessions" dibuat');
  } else {
    messages.push('ℹ Sheet "sessions" sudah ada — skip');
  }

  /* ═══ 4-7. Tambah kolom metadata ═══ */
  addMissingColumns_(ss, 'projects', ['updated_at','updated_by','project_version'], messages);
  addMissingColumns_(ss, 'project_wbs', ['updated_at','updated_by'], messages);
  addMissingColumns_(ss, 'progress', ['updated_at','updated_by'], messages);
  addMissingColumns_(ss, 'project_ahsp_details', ['updated_at','updated_by'], messages);

  /* ═══ Print hasil ═══ */
  console.log('');
  messages.forEach(function(m){ console.log(m); });
  console.log('');
  console.log('══════════════════════════════════════');
  console.log('⚠️  PENTING:');
  console.log('   1. Login: admin / PIN 123456');
  console.log('      GANTI PIN setelah login pertama!');
  console.log('   2. Deploy ulang Web App (New version)');
  console.log('══════════════════════════════════════');

  /* Toast (works di banyak konteks, fallback ke console kalau gagal) */
  try {
    ss.toast('Migrasi Fase 4A selesai. Login: admin / 123456', 'Migrasi Multi-User', 10);
  } catch(e){
    // ignore
  }

  return messages.join('\n');
}

/**
 * Helper: tambah kolom kalau belum ada di sheet.
 * Pre-fill: updated_at = now, updated_by = 'system', project_version = 1
 */
function addMissingColumns_(ss, sheetName, cols, messages){
  const sh = ss.getSheetByName(sheetName);
  if (!sh){
    messages.push('⚠ Sheet "' + sheetName + '" tidak ada — skip');
    return;
  }
  const lastCol = sh.getLastColumn();
  if (lastCol < 1){
    messages.push('⚠ Sheet "' + sheetName + '" kosong — skip');
    return;
  }
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h){ return String(h).trim(); });
  const toAdd = cols.filter(function(c){ return headers.indexOf(c) < 0; });
  if (!toAdd.length){
    messages.push('ℹ ' + sheetName + ': semua kolom sudah ada');
    return;
  }
  const startCol = lastCol + 1;
  const range = sh.getRange(1, startCol, 1, toAdd.length);
  range.setValues([toAdd]);
  range.setFontWeight('bold')
       .setBackground('#1f4e79')
       .setFontColor('#ffffff')
       .setHorizontalAlignment('center');

  // Pre-fill data lama
  const lastRow = sh.getLastRow();
  if (lastRow > 1){
    toAdd.forEach(function(colName, idx){
      const col = startCol + idx;
      const rangeCol = sh.getRange(2, col, lastRow - 1, 1);
      let fillValue;
      if (colName === 'updated_at' || colName === 'created_at'){
        fillValue = new Date().toISOString();
      } else if (colName === 'updated_by'){
        fillValue = 'system';
      } else if (colName === 'project_version'){
        fillValue = 1;
      } else {
        fillValue = '';
      }
      const fillArray = [];
      for (let r = 0; r < lastRow - 1; r++) fillArray.push([fillValue]);
      rangeCol.setValues(fillArray);
    });
  }

  messages.push('✅ ' + sheetName + ': +' + toAdd.length + ' kolom (' + toAdd.join(', ') + ')');
}

function checkMigrateStatus(){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const needed = ['project_users', 'change_log', 'sessions'];
  console.log('══════ MIGRATION STATUS ══════');
  needed.forEach(function(name){
    const sh = ss.getSheetByName(name);
    if (sh){
      console.log('✅ ' + name + ': ada (' + (sh.getLastRow() - 1) + ' baris data)');
    } else {
      console.log('❌ ' + name + ': BELUM DIBUAT');
    }
  });
  // Cek kolom di projects
  const shP = ss.getSheetByName('projects');
  if (shP){
    const h = shP.getRange(1,1,1,shP.getLastColumn()).getValues()[0].map(function(x){ return String(x).trim(); });
    ['updated_at','updated_by','project_version'].forEach(function(c){
      console.log((h.indexOf(c) >= 0 ? '✅' : '❌') + ' projects.' + c);
    });
  }
  console.log('══════════════════════════════');
}

/**
 * Helper: Generate user entry untuk project_users.
 * Jalankan manual dari Apps Script Editor.
 */
function generateUserEntry(){
  var username = 'helmy';        // ← GANTI
  var pin = '112233';            // ← GANTI
  var nama = 'Helmy Sutanto';    // ← GANTI
  var email = 'helmy@email.com'; // ← GANTI
  var role = 'owner';            // owner | editor | viewer
  var projectIds = 'prj_mucusuc9hdfdpx'; // ← GANTI (comma-separated)
  
  var pinHash = hashPin_(pin);
  var nowIso = new Date().toISOString();
  var id = 'usr_' + Utilities.getUuid().slice(0, 8);
  
  var row = [username, pinHash, nama, email, role, projectIds, 1, nowIso, id];
  
  console.log('══════ USER ENTRY ══════');
  console.log('Salin nilai berikut ke sheet project_users (baris baru):');
  console.log('username    :', username);
  console.log('pin_hash    :', pinHash);
  console.log('nama        :', nama);
  console.log('email       :', email);
  console.log('role        :', role);
  console.log('project_ids :', projectIds);
  console.log('aktif       :', 1);
  console.log('created_at  :', nowIso);
  console.log('id          :', id);
  console.log('════════════════════════');
  console.log('ATAU paste di baris baru sheet (tab-separated):');
  console.log(row.join('\t'));
  
  return row;
}

// Contoh logika di Code.gs (Backend)
function validateUserAccess(username, projectCode) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('project_users');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === username) { // Kolom username
      const allowedProjects = data[i][5].split(',').map(s => s.trim()); // Kolom project_ids
      if (allowedProjects.includes('*') || allowedProjects.includes(projectCode)) {
        return true; // Akses diberikan
      }
    }
  }
  return false; // Akses ditolak
}

/* =====================================================================
   MIGRASI FASE 4F — Convert project_ids ke format KODE
   Jalankan manual SEKALI dari Apps Script Editor.
   Contoh: "prj_mucusuc9hdfdpx" → "SDA-2026-001"
   ===================================================================== */
function migrateProjectUsersToKode(){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('project_users');
  if (!sh){
    console.log('❌ Sheet project_users tidak ada');
    return 'Error: no sheet';
  }

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2){
    console.log('ℹ Tidak ada baris user');
    return 'No rows';
  }

  const values = sh.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0].map(function(h){ return String(h).trim(); });
  const idxProjectIds = headers.indexOf('project_ids');
  if (idxProjectIds < 0){
    console.log('❌ Kolom project_ids tidak ada');
    return 'Error: no col';
  }

  const projects = readSheet_(SHEET_NAMES.projects);
  const idToKode = {};
  projects.forEach(function(p){
    idToKode[String(p.id)] = String(p.kode);
  });

  let converted = 0;
  const log = [];

  for (let i = 1; i < values.length; i++){
    const username = String(values[i][headers.indexOf('username')] || '').trim();
    const raw = String(values[i][idxProjectIds] || '').trim();
    if (!raw || raw === '*') continue;

    const parts = raw.split(',').map(function(s){ return s.trim(); }).filter(Boolean);
    let changed = false;
    const newParts = parts.map(function(p){
      if (idToKode[p]){
        changed = true;
        return idToKode[p];
      }
      return p;
    });

    if (changed){
      const newVal = newParts.join(', ');
      sh.getRange(i + 1, idxProjectIds + 1).setValue(newVal);
      converted++;
      log.push('  • ' + username + ': "' + raw + '" → "' + newVal + '"');
    }
  }

  console.log('══════ MIGRASI PROJECT_IDS KE KODE ══════');
  log.forEach(function(l){ console.log(l); });
  console.log('');
  console.log('✅ Converted: ' + converted + ' user rows');
  console.log('══════════════════════════════════════════');

  return 'Converted ' + converted + ' rows';
}

/* =====================================================================
   MIGRASI KE FULL APPS SCRIPT — HTML SERVICE
   Fungsi-fungsi ini menggantikan peran GitHub Pages
   ===================================================================== */

/**
 * Fungsi include() untuk HTML Service templating.
 * Memungkinkan kita memisahkan file HTML/JS menjadi modul-modul kecil.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function includeRaw(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * doGet() — Entry point saat Web App dibuka.
 * Menyajikan Index.html yang berisi seluruh aplikasi.
 */
/**
 * doGet() — Entry point saat Web App dibuka.
 * VERSI DEBUG v2 — dengan verifikasi placeholder + no-cache
 */
function doGet(e) {
  // ─── STEP 1: Baca Index.html ───
  var html;
  try {
    html = HtmlService.createHtmlOutputFromFile('Index').getContent();
    console.log('[doGet] ✅ Index.html loaded, length:', html.length);
  } catch (err) {
    console.error('[doGet] ❌ Index.html ERROR:', err.message);
    return HtmlService.createHtmlOutput(
      '<h1 style="color:red;font-family:sans-serif">ERROR: File "Index" tidak ditemukan. ' + err.message + '</h1>'
    );
  }

  // ─── STEP 2: Verifikasi placeholder ada di Index.html ───
  var hasStylePlaceholder = html.indexOf('___MK_STYLE_PLACEHOLDER___') >= 0;
  var hasJsPlaceholder    = html.indexOf('___MK_JS_PLACEHOLDER___') >= 0;
  console.log('[doGet] Placeholder STYLE ada?', hasStylePlaceholder);
  console.log('[doGet] Placeholder ALL_JS ada?', hasJsPlaceholder);

  // ─── STEP 3: Inject CSS ───
  try {
    var cssRaw = HtmlService.createHtmlOutputFromFile('Style').getContent();
    console.log('[doGet] Style.html raw length:', cssRaw.length);
    
    // Extract <style>...</style>
    var styleMatch = cssRaw.match(/<style[^>]*>[\s\S]*?<\/style>/i);
    var cssTag = styleMatch ? styleMatch[0] : '<style>' + cssRaw + '</style>';
    console.log('[doGet] CSS tag extracted, length:', cssTag.length);
    
    // Cek 100 karakter pertama untuk verifikasi isi
    console.log('[doGet] CSS starts with:', cssTag.substring(0, 80));
    
    // Replace placeholder
    var htmlBefore = html.length;
    html = html.replace('___MK_STYLE_PLACEHOLDER___', cssTag);
    var htmlAfter = html.length;
    console.log('[doGet] HTML size: ' + htmlBefore + ' → ' + htmlAfter + ' (+' + (htmlAfter - htmlBefore) + ' bytes)');
  } catch (err) {
    console.error('[doGet] ❌ CSS ERROR:', err.message);
    html = html.replace('___MK_STYLE_PLACEHOLDER___', 
      '<style>body{background:#0b1220;color:#e6edf7;font-family:sans-serif;padding:20px}' +
      'h1,h2{color:#f87171}</style>' +
      '<div style="padding:20px"><h1>⚠ CSS Gagal Dimuat</h1>' +
      '<p>Error: ' + err.message + '</p></div>');
  }

  // ─── STEP 4: Inline semua modul JS ───
  var modules = [
    'LoadingIndicatorJs', 'EmptyStateJs', 'SheetSyncFixJs', 'PerformanceCacheJs',
    'AppJs',
    'ScheduleJs_01_Calendar', 'ScheduleJs_02_CPM',
    'ScheduleJs_03_Autosave', 'ScheduleJs_04_Resource', 'ScheduleJs_05_Baseline',
    'ScheduleJs_06_GanttEngine', 'ScheduleJs_07_GanttView', 'ScheduleJs_08_UIHelpers',
    'ScheduleJs_09_UndoBulk', 'ScheduleJs_10_SyncManager', 'ScheduleJs_11_Reporting',
    'ScheduleJs_12_RenderMain',
    'TrackingJs', 'ProgressWizardJs', 'PortfolioTimelineJs',
    'KeyboardShortcutsJs', 'KbShortcuts2Js',    'AutosaveCoreJs', 'AutosaveUiJs',    'SyncManagerCoreJs', 'SyncManagerUiJs', 'TaskInspectorCoreJs', 'TaskInspectorUiJs',
    'PortfolioTimelineDataJs', 'PortfolioTimelineDrawJs', 'PortfolioTimelineUiJs',
    'HistoryCoreJs', 'HistoryUiJs',
    /* RP DISABLED:
    'RpCoreJs', 'RpOpenJs', 'RpDialogJs', 'RpGenerateJs', 'RpWrapperSimpleJs',
    'RpCss1Js', 'RpCss2Js', 'RpExecJs',
    */
    'ReportA1Js', 'ReportA2Js', 'ReportA3Js',
    'Fase1COverride', 'MultiUserJs'
  ];

  var allJs = '';
  var loadedCount = 0;
  var errorCount = 0;

  modules.forEach(function(m) {
    try {
      var content = HtmlService.createHtmlOutputFromFile(m).getContent();
      
      // Extract isi <body>...</body>
      var bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) content = bodyMatch[1];
      
      // Strip wrapper <script>...</script>
      content = content.replace(/^\s*<script[^>]*>/i, '');
      content = content.replace(/<\/script>\s*$/i, '');
      
      allJs += '\n\n/* ═══ MODULE: ' + m + ' ═══ */\n' + content;
      loadedCount++;
    } catch (err) {
      allJs += '\n\n/* MODULE ' + m + ' ERROR: ' + err.message + ' */\n';
      errorCount++;
      console.error('Module load error:', m, err.message);
    }
  });

  console.log('[doGet] JS Modules loaded:', loadedCount, '| Errors:', errorCount);
  html = html.replace('___MK_JS_PLACEHOLDER___', '<script>' + allJs + '</script>');

  // ─── STEP 5: Verifikasi akhir ───
  var stillStyle = html.indexOf('___MK_STYLE_PLACEHOLDER___') >= 0;
  var stillJs    = html.indexOf('___MK_JS_PLACEHOLDER___') >= 0;
  var hasStyleTag = html.indexOf('<style>') >= 0 || html.indexOf('<style ') >= 0;
  var hasCssVar  = html.indexOf('--bg:#0b1220') >= 0;
  
  console.log('[doGet] ══════ VERIFIKASI AKHIR ══════');
  console.log('[doGet] Placeholder STYLE masih ada?', stillStyle, '(harus FALSE)');
  console.log('[doGet] Placeholder ALL_JS masih ada?', stillJs, '(harus FALSE)');
  console.log('[doGet] Ada tag <style> di HTML?', hasStyleTag, '(harus TRUE)');
  console.log('[doGet] Ada CSS var --bg:#0b1220?', hasCssVar, '(harus TRUE)');
  console.log('[doGet] Final HTML length:', html.length);
  console.log('[doGet] ═══════════════════════════════');

  // ─── STEP 6: Return output ───
  return HtmlService.createHtmlOutput(html)
    .setTitle('Manajemen Konstruksi v1')
    .setFaviconUrl('https://ssl.gstatic.com/docs/script/images/favicon.ico')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * doPostApi() — Pengganti doPost via google.script.run.
 * Menerima action & payload langsung (bukan dari HTTP body),
 * lalu memanggil doPost() dengan format yang sama.
 * 
 * INI ADALAH KUNCI MIGRASI: Kita TIDAK mengubah doPost() sama sekali.
 * Hanya membungkusnya dengan parameter yang sesuai.
 */
function doPostApi(action, payload) {
  try {
    const fakeEvent = {
      postData: {
        contents: JSON.stringify({ action: action, payload: payload || {} })
      }
    };
    const response = doPost(fakeEvent);
    const text = response.getContent();
    return text; // Sudah berupa JSON string
  } catch (err) {
    return JSON.stringify({
      ok: false,
      code: 'SERVER_ERROR',
      message: 'Error server: ' + err.message
    });
  }
}

/* ═══════════════════════════════════════════════════════════
   DIAGNOSTIC v2 — Cari modul dengan SYNTAX ERROR
   Jalankan dari Apps Script Editor
   ═══════════════════════════════════════════════════════════ */
function findBrokenModule(){
  var files = [
    'LoadingIndicatorJs', 'EmptyStateJs', 'SheetSyncFixJs', 'PerformanceCacheJs',
    'AppJs',
    'ScheduleJs_01_Calendar', 'ScheduleJs_02_CPM',
    'ScheduleJs_03_Autosave', 'ScheduleJs_04_Resource', 'ScheduleJs_05_Baseline',
    'ScheduleJs_06_GanttEngine', 'ScheduleJs_07_GanttView', 'ScheduleJs_08_UIHelpers',
    'ScheduleJs_09_UndoBulk', 'ScheduleJs_10_SyncManager', 'ScheduleJs_11_Reporting',
    'ScheduleJs_12_RenderMain',
    'TrackingJs', 'ProgressWizardJs',
    'PortfolioTimelineJs', 'KeyboardShortcutsJs', 'Fase1COverride', 'MultiUserJs',
    'ReportCoreJs', 'ReportExecutiveJs',
    'PortfolioTimelineDataJs', 'PortfolioTimelineDrawJs', 'PortfolioTimelineUiJs',
    'HistoryCoreJs', 'HistoryUiJs',
    'SyncManagerCoreJs', 'SyncManagerUiJs',
    'TaskInspectorCoreJs', 'TaskInspectorUiJs',
    'AutosaveCoreJs', 'AutosaveUiJs',
    'KbShortcuts2Js',
    'RpCoreJs', 'RpOpenJs', 'RpDialogJs',
    'RpGenerateJs', 'RpWrapperJs', 'RpCss1Js', 'RpCss2Js', 'RpExecJs'
  ];

  var cumulative = '';
  var brokenAt = null;

  console.log('══════ FIND BROKEN MODULE ══════');

  for (var i = 0; i < files.length; i++){
    var name = files[i];
    try {
      var content = HtmlService.createHtmlOutputFromFile(name).getContent();

      // SAMA seperti doGet: strip wrapper
      var bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) content = bodyMatch[1];
      content = content.replace(/^\s*<script[^>]*>/i, '');
      content = content.replace(/<\/script>\s*$/i, '');

      var marker = '\n\n/* ═══ MODULE: ' + name + ' ═══ */\n';
      cumulative += marker + content;

      // TEST: coba parse JS cumulative
      try {
        new Function(cumulative);
        console.log('OK  ' + name + ' (modul: ' + content.length + ', total: ' + cumulative.length + ')');
      } catch(e){
        console.log('');
        console.log('========================================');
        console.log('BROKEN DI: ' + name);
        console.log('Error: ' + e.message);
        console.log('Panjang modul: ' + content.length + ' chars');
        console.log('Total sampai sini: ' + cumulative.length + ' chars');
        console.log('========================================');
        console.log('');
        brokenAt = name;
        break;
      }
    } catch(e){
      console.log('WARN  Baca ' + name + ' gagal: ' + e.message);
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════');
  if (brokenAt){
    console.log('RESULT: Modul rusak = ' + brokenAt);
  } else {
    console.log('RESULT: Semua modul OK secara syntax');
  }
  console.log('═══════════════════════════════════════');
}
