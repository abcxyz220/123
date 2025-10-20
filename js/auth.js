(function () {
  const LS_SESSION = 'susan_session_user';
  const escEmail = s => String(s || '').trim().toLowerCase();

  /* ===== Local DB fallback ===== */
  function dbGetSafe() {
    try {
      const raw = localStorage.getItem('db');
      const db = raw ? JSON.parse(raw) : {};
      db.users = Array.isArray(db.users) ? db.users : [];
      return db;
    } catch { return { users: [] }; }
  }
  function dbSetSafe(db) {
    try { localStorage.setItem('db', JSON.stringify(db || { users: [] })); } catch {}
  }

  /* ===== Session helpers ===== */
  function _setSessionUser(u) {
    if (u) {
      const light = {
        id: u.id,
        name: u.name || '',
        email: escEmail(u.email),
        role: String(u.role || 'member').toLowerCase(),
        avatar: u.avatar || ''
      };
      localStorage.setItem(LS_SESSION, JSON.stringify(light));
    } else {
      localStorage.removeItem(LS_SESSION);
    }
    // rung tín hiệu để header/khác tự cập nhật
    try { localStorage.setItem('auth_tick', String(Date.now())); } catch {}
  }

  function _getSessionUser() {
    try {
      const raw = localStorage.getItem(LS_SESSION);
      if (!raw) return null;
      const u = JSON.parse(raw);
      if (!u || !u.id) return null;
      return {
        id: u.id,
        name: u.name || '',
        email: escEmail(u.email || ''),
        role: String(u.role || 'member').toLowerCase(),
        avatar: u.avatar || ''
      };
    } catch { return null; }
  }

  /* ===== Detect API mode (json-server) ===== */
  let API_BASE = (typeof window !== 'undefined' && window.API_BASE)
    ? String(window.API_BASE).replace(/\/+$/,'')
    : '';
  let API_OK = false;

  async function _probeAPI() {
    if (!API_BASE) return (API_OK = false);
    try {
      const r = await fetch(API_BASE + '/users?_limit=1', { cache: 'no-store' });
      return (API_OK = r.ok);
    } catch { return (API_OK = false); }
  }

  /* ===== API data source ===== */
  async function apiGetUsers() {
    const r = await fetch(API_BASE + '/users', { cache: 'no-store' });
    if (!r.ok) throw new Error('Users fetch failed');
    return r.json();
  }
  async function apiFindUserByEmail(email) {
    const r = await fetch(API_BASE + '/users?email=' + encodeURIComponent(escEmail(email)) + '&_limit=1', { cache: 'no-store' });
    if (!r.ok) throw new Error('Users query failed');
    const a = await r.json();
    return a && a[0] ? a[0] : null;
  }
  async function apiCreateUser(payload) {
    const r = await fetch(API_BASE + '/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) throw new Error('Create user failed');
    return r.json();
  }

  /* ===== Local data source ===== */
  function localGetUsers() {
    const list = (dbGetSafe().users || []).map(u => ({
      id: +u.id || 0,
      name: u.name || '',
      email: escEmail(u.email || ''),
      phone: u.phone || '',
      address: u.address || '',
      password: String(u.password || ''),
      role: String(u.role || 'member').toLowerCase(),
      avatar: u.avatar || ''
    }));
    // mirror cho code cũ (không bắt buộc)
    try { localStorage.setItem('users', JSON.stringify(list)); } catch {}
    return list;
  }
  function localSaveUsers(list) {
    const db = dbGetSafe();
    db.users = Array.isArray(list) ? list : [];
    dbSetSafe(db);
    try { localStorage.setItem('users', JSON.stringify(db.users)); } catch {}
    return db.users;
  }

  /* ===== Public APIs ===== */
  async function getUsers() {
    if (API_BASE && !API_OK) await _probeAPI();
    return API_OK ? apiGetUsers() : localGetUsers();
  }
  async function saveUsers(arr) {
    if (API_BASE && !API_OK) await _probeAPI();
    if (API_OK) throw new Error('saveUsers() chỉ dùng local; API mode dùng POST/PATCH /users.');
    return localSaveUsers(arr);
  }

  function currentUser() { return _getSessionUser(); }
  function logout() {
    _setSessionUser(null);
    document.dispatchEvent(new CustomEvent('auth:logout'));
  }

  async function registerUser({ name, email, phone = '', address = '', password }) {
    name = String(name || '').trim();
    email = escEmail(email);
    password = String(password || '').trim();
    if (!name || !email || !password) throw new Error('Vui lòng nhập đủ Họ tên, Email, Mật khẩu.');

    if (API_BASE && !API_OK) await _probeAPI();

    if (API_OK) {
      const dup = await apiFindUserByEmail(email);
      if (dup) throw new Error('Email đã tồn tại.');
      const user = await apiCreateUser({ name, email, phone, address, password, role: 'member', avatar: '' });
      _setSessionUser(user);
      document.dispatchEvent(new CustomEvent('auth:login', { detail: { user } }));
      return user;
    } else {
      const list = localGetUsers();
      if (list.some(u => u.email === email)) throw new Error('Email đã tồn tại.');
      const nextId = list.length ? Math.max(...list.map(u => u.id || 0)) + 1 : 1;
      const user = { id: nextId, name, email, phone, address, password, role: 'member', avatar: '' };
      list.push(user);
      localSaveUsers(list);
      _setSessionUser(user);
      document.dispatchEvent(new CustomEvent('auth:login', { detail: { user } }));
      return user;
    }
  }

  async function login(email, password) {
    email = escEmail(email);
    password = String(password || '').trim();
    if (!email || !password) throw new Error('Vui lòng nhập Email và Mật khẩu.');

    if (API_BASE && !API_OK) await _probeAPI();

    if (API_OK) {
      const u = await apiFindUserByEmail(email);
      if (!u || String(u.password || '') !== password) throw new Error('Email hoặc mật khẩu không đúng.');
      u.role = String(u.role || 'member').toLowerCase();
      _setSessionUser(u);
      document.dispatchEvent(new CustomEvent('auth:login', { detail: { user: u } }));
      return u;
    } else {
      const u = localGetUsers().find(x => x.email === email && String(x.password || '') === password);
      if (!u) throw new Error('Email hoặc mật khẩu không đúng.');
      _setSessionUser(u);
      document.dispatchEvent(new CustomEvent('auth:login', { detail: { user: u } }));
      return u;
    }
  }

  function _root() {
    return (typeof window !== 'undefined' && window.PARTIAL_BASE)
      ? window.PARTIAL_BASE
      : (location.pathname.replace(/\\/g, '/').includes('/admin/') ? '..' : '.');
  }
  function requireAuth() {
    if (!currentUser()) {
      const next = encodeURIComponent(location.pathname + location.search);
      location.href = `${_root()}/login.html?next=${next}`;
      return false;
    }
    return true;
  }
  function requireAdmin() {
    const u = currentUser();
    const ok = !!u && String(u.role || '').toLowerCase() === 'admin';
    if (!ok) {
      const next = encodeURIComponent(location.pathname + location.search);
      location.href = `${_root()}/login.html?next=${next}`;
      return false;
    }
    return true;
  }

  // Seed local nếu chưa có user (khi KHÔNG dùng API)
  const DEFAULT_LOCAL_USERS = [
    { id: 1, name: 'Admin',      email: 'admin@susan.shop',  phone: '0900000000', address: 'HN',  password: 'admin',  role: 'admin',  avatar: '' },
    { id: 2, name: 'Khách hàng', email: 'user@susan.shop',   phone: '0901111222', address: 'HCM', password: '123456', role: 'member', avatar: '' }
  ];
  async function seedLocalIfEmpty() {
    if (API_BASE && await _probeAPI()) return; // có API thì không seed
    const list = localGetUsers();
    if (list.length) return;
    localSaveUsers(DEFAULT_LOCAL_USERS);
  }

  // Thông báo cross-tab (không gọi initHeader ở đây)
  window.addEventListener('storage', (e) => {
    if (e.key === 'auth_tick') {
      document.dispatchEvent(new CustomEvent('auth:sync'));
    }
  });

  // Expose
  window.getUsers = getUsers;
  window.saveUsers = saveUsers;
  window.currentUser = currentUser;
  window.logout = logout;
  window.registerUser = registerUser;
  window.login = login;
  window.requireAuth = requireAuth;
  window.requireAdmin = requireAdmin;

  // Boot
  (async () => {
    if (API_BASE) await _probeAPI();
    await seedLocalIfEmpty();
  })();
})();
