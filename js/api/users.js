// js/api/users.js (fixed, safe for json-server)
// Cần apiGet/apiPost/apiPatch/apiDelete từ _config.js

(function () {
  const API = (typeof window !== 'undefined' && window.API_BASE)
    ? window.API_BASE.replace(/\/+$/, '')
    : '';

  // Đọc id an toàn: null/NaN/0 -> undefined (không dùng 0)
  const toId = (v) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  // Chuẩn hoá đối tượng user lấy từ API (KHÔNG ép khi tạo)
  function normRead(u) {
    if (!u) return null;
    return {
      id: toId(u.id),
      name: String(u.name || '').trim(),
      email: String(u.email || '').trim().toLowerCase(),
      phone: String(u.phone || '').trim(),
      address: String(u.address || '').trim(),
      password: String(u.password || ''),
      role: String(u.role || 'member').toLowerCase(),
      avatar: String(u.avatar || '')
    };
  }

  async function http(method, path, body) {
    const opt = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opt.body = JSON.stringify(body);
    const r = await fetch(API + path, opt);
    if (!r.ok) {
      const txt = await r.text().catch(() => r.statusText);
      throw new Error(`HTTP ${r.status} @ ${path}\n${txt || 'Not Found'}`);
    }
    return r.headers.get('content-type')?.includes('json') ? r.json() : null;
  }

  // ========== Public ==========
  async function all() {
    const a = await http('GET', '/users');
    return (a || []).map(normRead);
  }

  async function get(id) {
    const u = await http('GET', `/users/${id}`);
    return normRead(u);
  }

  // ❗ KHÔNG gửi id khi tạo mới để json-server tự tăng
  async function create(payload) {
    const data = {
      name: String(payload?.name || '').trim(),
      email: String(payload?.email || '').trim().toLowerCase(),
      phone: String(payload?.phone || '').trim(),
      address: String(payload?.address || '').trim(),
      password: String(payload?.password || ''),
      role: String(payload?.role || 'member').toLowerCase(),
      avatar: String(payload?.avatar || '')
    };
    if (!data.name) throw new Error('Tên không được trống.');
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error('Email không hợp lệ.');

    // Kiểm tra trùng email (nhẹ nhàng)
    const dup = await http('GET', `/users?email=${encodeURIComponent(data.email)}&_limit=1`);
    if (Array.isArray(dup) && dup[0]) throw new Error('Email đã tồn tại.');

    // Không có field id ở đây!
    const saved = await http('POST', '/users', data);
    return normRead(saved);
  }

  async function update(id, patch) {
    const body = {};
    if (patch.name != null) body.name = String(patch.name).trim();
    if (patch.email != null) body.email = String(patch.email).trim().toLowerCase();
    if (patch.phone != null) body.phone = String(patch.phone).trim();
    if (patch.address != null) body.address = String(patch.address).trim();
    if (patch.password != null) body.password = String(patch.password);
    if (patch.role != null) body.role = String(patch.role || 'member').toLowerCase();
    if (patch.avatar != null) body.avatar = String(patch.avatar || '');

    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      throw new Error('Email không hợp lệ.');
    }
    if (body.email) {
      const list = await http('GET', `/users?email=${encodeURIComponent(body.email)}`);
      if (Array.isArray(list) && list.some(u => toId(u.id) !== toId(id) && String(u.email).toLowerCase() === body.email)) {
        throw new Error('Email đã tồn tại.');
      }
    }

    const saved = await http('PATCH', `/users/${id}`, body);
    return normRead(saved);
  }

  async function remove(id) {
    return http('DELETE', `/users/${id}`);
  }

  async function count() {
    const list = await all();
    return list.length;
  }

  window.Users = { all, get, create, update, remove, count };
})();
