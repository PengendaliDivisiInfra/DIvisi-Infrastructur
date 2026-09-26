<script>
/* =====================================================================
   PERFORMANCE CACHE — ResourceLoader Cache Manager
   Cache hasil ResourceLoader.load() agar tidak dihitung ulang
   ===================================================================== */
(function(){
  if (window._performanceCacheInstalled) return;
  window._performanceCacheInstalled = true;

  const PerformanceCache = {
    MAX_ENTRIES: 20,
    _cache: new Map(),

    /**
     * Buat cache key dari parameter
     */
    _key(projectId, opts){
      opts = opts || {};
      return [
        projectId,
        opts.mode || 'rab',
        opts.distribution || 'uniform',
        opts.granularity || 'weekly'
      ].join('::');
    },

    /**
     * Ambil dari cache
     */
    get(projectId, opts){
      const key = this._key(projectId, opts);
      if (this._cache.has(key)){
        const entry = this._cache.get(key);
        // Cek apakah versi masih sama
        if (entry.version === (typeof STATE !== 'undefined' ? STATE.dbVersion : null)){
          entry.hits = (entry.hits || 0) + 1;
          return entry.value;
        }
        // Version berubah → hapus cache lama
        this._cache.delete(key);
      }
      return null;
    },

    /**
     * Simpan ke cache
     */
    set(projectId, opts, value){
      const key = this._key(projectId, opts);
      const version = typeof STATE !== 'undefined' ? STATE.dbVersion : null;

      // LRU: hapus entry tertua kalau penuh
      if (this._cache.size >= this.MAX_ENTRIES){
        const firstKey = this._cache.keys().next().value;
        this._cache.delete(firstKey);
      }

      this._cache.set(key, {
        value: value,
        version: version,
        timestamp: Date.now(),
        hits: 0
      });
    },

    /**
     * Bersihkan cache (dipanggil saat data berubah)
     */
    clear(){
      const size = this._cache.size;
      this._cache.clear();
      if (size > 0){
        console.log('[PerformanceCache] Cache dibersihkan (' + size + ' entries)');
      }
    },

    /**
     * Info statistik cache
     */
    stats(){
      const entries = [];
      this._cache.forEach(function(v, k){
        entries.push({ key: k, hits: v.hits || 0, age: Date.now() - v.timestamp });
      });
      return {
        size: this._cache.size,
        max: this.MAX_ENTRIES,
        entries: entries
      };
    }
  };

  window.PerformanceCache = PerformanceCache;

  // Auto-clear cache saat data berubah
  if (typeof Undo !== 'undefined' && Undo.onChange){
    Undo.onChange(function(){ PerformanceCache.clear(); });
  }

  console.log('%c[PerformanceCache.js] ✅ ResourceLoader cache installed (max ' +
    PerformanceCache.MAX_ENTRIES + ' entries)',
    'color:#22c55e;font-weight:bold');
})();
</script>
