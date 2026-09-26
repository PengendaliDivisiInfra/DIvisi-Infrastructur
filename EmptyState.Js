<script>
/* =====================================================================
   EMPTY STATE COMPONENT
   Helper untuk menampilkan pesan ketika tidak ada data
   ===================================================================== */
(function(){
  if (window._emptyStateInstalled) return;
  window._emptyStateInstalled = true;

  const EmptyState = {
    /**
     * Render HTML empty state
     * @param {string} icon - Emoji ikon
     * @param {string} title - Judul besar
     * @param {string} subtitle - Deskripsi kecil
     * @param {string} actionHTML - Tombol/aksi opsional
     */
    html(icon, title, subtitle, actionHTML){
      return '<div class="empty" style="text-align:center;padding:32px 20px">' +
        '<div style="font-size:48px;margin-bottom:12px;opacity:.6">' + (icon || '📭') + '</div>' +
        '<div style="font-size:15px;font-weight:700;color:#e6edf7;margin-bottom:6px">' +
          (title || 'Tidak ada data') + '</div>' +
        (subtitle
          ? '<div style="font-size:12px;color:#8fa3c4;margin-bottom:14px">' + subtitle + '</div>'
          : '') +
        (actionHTML
          ? '<div style="margin-top:10px">' + actionHTML + '</div>'
          : '') +
      '</div>';
    },

    /**
     * Isi sebuah element dengan empty state
     */
    render(selector, icon, title, subtitle, actionHTML){
      const el = typeof selector === 'string'
        ? document.querySelector(selector)
        : selector;
      if (!el) return;
      el.innerHTML = this.html(icon, title, subtitle, actionHTML);
    },

    /**
     * Render sebagai <tr> untuk tabel
     */
    tableRow(colspan, icon, title, subtitle){
      return '<tr><td colspan="' + (colspan || 1) + '" class="empty" ' +
        'style="text-align:center;padding:32px 20px">' +
        '<div style="font-size:36px;margin-bottom:10px;opacity:.6">' + (icon || '📭') + '</div>' +
        '<div style="font-size:14px;font-weight:700;color:#e6edf7;margin-bottom:4px">' +
          (title || 'Tidak ada data') + '</div>' +
        (subtitle
          ? '<div style="font-size:11.5px;color:#8fa3c4">' + subtitle + '</div>'
          : '') +
      '</td></tr>';
    }
  };

  window.EmptyState = EmptyState;
  console.log('%c[EmptyState.js] ✅ Empty State component installed',
    'color:#22c55e;font-weight:bold');
})();
</script>
