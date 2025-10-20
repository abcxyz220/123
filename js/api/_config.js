// js/api/_config.js
(function () {
  // Go Live ở localhost/127.0.0.1 -> gọi json-server ở :3000
  const host = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? '127.0.0.1'
    : location.hostname;
  const PORT = 3000;
  const BASE = `http://${host}:${PORT}`;

  function withTimeout(promise, ms = 15000) {
    return Promise.race([
      promise,
      new Promise((_, rej) => setTimeout(() => rej(new Error('Request timeout')), ms)),
    ]);
  }

  async function _api(method, path, body) {
    if (!path.startsWith('/')) path = '/' + path;
    const opt = { method, headers: {} };
    if (body != null) {
      opt.headers['Content-Type'] = 'application/json';
      opt.body = JSON.stringify(body);
    }
    const res = await withTimeout(fetch(BASE + path, opt));
    if (!res.ok) {
      let detail = '';
      try { detail = await res.text(); } catch {}
      throw new Error(`HTTP ${res.status} @ ${path}\n${detail||''}`);
    }
    const ct = res.headers.get('content-type') || '';
    return ct.includes('application/json') ? res.json() : true;
  }

  window.API_BASE  = BASE;
  window.apiGet    = (p)    => _api('GET',    p);
  window.apiPost   = (p,b)  => _api('POST',   p, b);
  window.apiPatch  = (p,b)  => _api('PATCH',  p, b);
  window.apiDelete = (p)    => _api('DELETE', p);
})();
