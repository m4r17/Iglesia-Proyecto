App.Utils = (function () {
  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function toISODate(date) {
    const d = date || new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function parseDate(value) {
    if (!value) return null;
    const parts = String(value).split('-').map(Number);
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function todayISO() {
    return toISODate(new Date());
  }

  function formatDate(value, options) {
    const date = typeof value === 'string' ? parseDate(value) : value;
    if (!date) return '—';
    return date.toLocaleDateString('es-MX', options || { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatLongDate(value) {
    const date = typeof value === 'string' ? parseDate(value) : value;
    if (!date) return '—';
    const text = date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function formatMoney(value) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 2
    }).format(Number(value) || 0);
  }

  function monthKey(value) {
    if (!value) return todayISO().slice(0, 7);
    return String(value).slice(0, 7);
  }

  function monthLabel(key, style) {
    const parts = String(key).split('-').map(Number);
    if (parts.length < 2) return '';
    const date = new Date(parts[0], parts[1] - 1, 1);
    const text = date.toLocaleDateString('es-MX', style || { month: 'long', year: 'numeric' });
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function addMonths(date, delta) {
    return new Date(date.getFullYear(), date.getMonth() + delta, 1);
  }

  function addDays(date, delta) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
  }

  function startOfWeek(value) {
    const date = typeof value === 'string' ? parseDate(value) : new Date(value || new Date());
    const day = (date.getDay() + 6) % 7;
    return addDays(date, -day);
  }

  function endOfWeek(value) {
    return addDays(startOfWeek(value), 6);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  }

  function normalize(value) {
    return String(value == null ? '' : value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function id(prefix) {
    return `${prefix ? prefix + '_' : ''}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  function hashPassword(password) {
    let hash = 5381;
    const text = String(password == null ? '' : password);
    for (let i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) + hash) + text.charCodeAt(i);
      hash &= 0xffffffff;
    }
    return `h${(hash >>> 0).toString(16)}`;
  }

  function debounce(fn, wait) {
    let timer = null;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait || 200);
    };
  }

  function initials(name) {
    const words = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '?';
    return words.slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join('');
  }

  function firstName(name) {
    return String(name || '').trim().split(/\s+/)[0] || '';
  }

  function sortByDateDesc(a, b) {
    return String(b.fecha || '').localeCompare(String(a.fecha || ''));
  }

  return {
    pad2,
    toISODate,
    parseDate,
    todayISO,
    formatDate,
    formatLongDate,
    formatMoney,
    monthKey,
    monthLabel,
    addMonths,
    addDays,
    startOfWeek,
    endOfWeek,
    escapeHtml,
    normalize,
    id,
    hashPassword,
    debounce,
    initials,
    firstName,
    sortByDateDesc
  };
})();
