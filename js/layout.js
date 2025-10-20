// js/layout.js (final)
(async function () {
  /* ========== Nhận biết trang admin + gốc tương đối ========== */
  function atAdmin() {
    return location.pathname.replace(/\\/g, "/").includes("/admin/");
  }
  const ROOT =
    (typeof window !== "undefined" && window.PARTIAL_BASE)
      ? window.PARTIAL_BASE
      : (atAdmin() ? ".." : ".");

  /* ========== Nạp partial (header/footer) ========== */
  async function loadPartial(targetId, file, after) {
    const el = document.getElementById(targetId);
    if (!el) return;
    const href = `${ROOT}/${file}`.replace(/\/{2,}/g, "/");
    try {
      const res = await fetch(href, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      el.innerHTML = await res.text();
      if (typeof after === "function") after();
    } catch (err) {
      console.warn("loadPartial failed:", href, err);
      el.innerHTML = `<div class="text-danger small">Không tải được ${href}</div>`;
    }
  }

  /* ========== Fallback đọc user từ localStorage nếu app chưa có currentUser() ========== */
  (function () {
    const SESSION_KEYS = [
      "susan_session_user",
      "ss_user",
      "session_user",
      "session_user_id",
    ];
    function safeParse(json) { try { return JSON.parse(json); } catch { return null; } }
    function findUserById(id) {
      try {
        if (typeof dbGet !== "function") return null;
        const db = dbGet() || {};
        const users = Array.isArray(db.users) ? db.users : [];
        return users.find(u => Number(u.id) === Number(id)) || null;
      } catch { return null; }
    }
    function readSessionUser() {
      for (const k of SESSION_KEYS) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const obj = safeParse(raw);
        if (obj && typeof obj === "object") {
          return {
            id: obj.id ?? obj.user_id ?? null,
            email: (obj.email || "").trim().toLowerCase(),
            name: obj.name || obj.fullname || "",
            role: (obj.role || "").toLowerCase() || "customer",
          };
        }
        if (/^\d+$/.test(String(raw))) {
          const u = findUserById(Number(raw));
          if (u) return {
            id: u.id,
            email: (u.email || "").toLowerCase(),
            name: u.name || u.fullname || "",
            role: (u.role || "customer").toLowerCase(),
          };
        }
      }
      return null;
    }
    if (typeof window.currentUser !== "function") {
      window.currentUser = function () { return readSessionUser(); };
    }
  })();

  function getUser() {
    try { return (typeof currentUser === "function") ? currentUser() : null; }
    catch { return null; }
  }
  const isAdmin = u => !!u && String(u.role || "").toLowerCase() === "admin";

  /* ========== CART BADGE – chuẩn hoá ==========
     KHÔNG gọi API gì ở đây để tránh 403 trên trang public */
  const CART_KEYS = ["ss_cart", "cart", "susan_cart_v1"];
  function normalizeCart(c) { if (!c) return { items: [] }; if (Array.isArray(c)) return { items: c }; if (c && Array.isArray(c.items)) return { items: c.items }; return { items: [] }; }
  function readCartStrict() {
    for (const k of CART_KEYS) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const n = normalizeCart(JSON.parse(raw));
        if (Array.isArray(n.items)) return n;
      } catch {}
    }
    return { items: [] };
  }
  function writeCartStrict(cart) {
    const nc = normalizeCart(cart);
    for (const k of CART_KEYS) { try { localStorage.setItem(k, JSON.stringify(nc)); } catch {} }
  }
  async function sanitizeCartInvalidItems() {
    try {
      const cart = readCartStrict();
      const items = Array.isArray(cart.items) ? cart.items : [];
      // chỉ dùng dbGet() local – không gọi API
      let products = [], variants = [];
      try {
        if (typeof dbGet === "function") {
          const db = dbGet() || {};
          products = Array.isArray(db.products) ? db.products : [];
          variants = Array.isArray(db.product_variants) ? db.product_variants : [];
        }
      } catch {}
      const byP = new Map(products.map(p => [Number(p.id), p]));
      const byV = new Map(variants.map(v => [Number(v.id), v]));
      const valid = [];
      for (const it of items) {
        const v = byV.get(Number(it.variant_id));
        if (!v) continue;
        const p = byP.get(Number(v.product_id));
        if (!p) continue;
        valid.push({ ...it, quantity: Number(it.quantity || it.qty || 0) });
      }
      if (valid.length !== items.length) {
        cart.items = valid;
        writeCartStrict(cart);
      }
    } catch {}
  }
  function purgeCartIfNoProducts() {
    try {
      if (typeof dbGet !== "function") return;
      const db = dbGet() || {};
      const hasProducts = Array.isArray(db.products) && db.products.length > 0;
      if (!hasProducts) {
        for (const k of CART_KEYS) { try { localStorage.removeItem(k); } catch {} }
      }
    } catch {}
  }
  function countCartQty() {
    const items = readCartStrict().items || [];
    return items.reduce((s, it) => s + Number(it.quantity || it.qty || 0), 0);
  }
  async function syncBadgeStrict() {
    try {
      purgeCartIfNoProducts();
      await sanitizeCartInvalidItems();
    } catch {}
    const n = countCartQty();
    ["cart-count", "cart-count-badge", "header-cart-count"].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = String(n);
      el.classList.toggle("d-none", !n || n <= 0);
    });
  }
  window.syncBadgeStrict = syncBadgeStrict;
  window.updateCartBadges = () => syncBadgeStrict();
  if (typeof window.syncBadge !== "function") window.syncBadge = () => syncBadgeStrict();

  /* ========== Tìm kiếm trong header ========== */
  function bindHeaderSearch() {
    const form = document.getElementById("header-search-form") || document.getElementById("header-search");
    const input = document.getElementById("header-search-input") || (form ? form.querySelector('input[name="q"]') : null);
    if (!form || !input) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = (input.value || "").trim();
      const onPageInput = document.getElementById("searchName");
      if (onPageInput) {
        onPageInput.value = q;
        if (typeof loadProducts === "function") loadProducts();
        return;
      }
      location.href = `${ROOT}/products.html?q=${encodeURIComponent(q)}`;
    });
  }

  /* ========== Chuẩn hoá link header (tránh link tuyệt đối bị sai) ========== */
  function normalizeHeaderLinks() {
    const pairs = [
      ['a[href="intro.html"]',   "intro.html"],
      ['a[href="index.html"]',   "index.html"],
      ['a[href="product.html"]', "product.html"],
      ['a[href="cart.html"]',    "cart.html"],
    ];
    for (const [sel, to] of pairs) {
      const a = document.querySelector(sel);
      if (a) a.setAttribute("href", `${ROOT}/${to}`);
    }
  }

  /* ========== Khởi tạo header sau khi nạp partial ========== */
  function initHeader() {
    const user = getUser();
    const authArea = document.getElementById("authArea");

    if (authArea) {
      if (user) {
        const isAdm = isAdmin(user);
        const first = (user.name || user.email || "User").split(" ")[0];
        const iconClass = isAdm ? "bi-shield-lock-fill text-warning" : "bi-person-circle";
        const adminChip = isAdm ? `<span class="badge rounded-pill bg-warning text-dark ms-1">Admin</span>` : "";
        const adminMenu = isAdm ? `
          <li><a class="dropdown-item" href="${ROOT}/admin/categories.html"><i class="bi bi-grid me-2"></i>Danh mục</a></li>
          <li><a class="dropdown-item" href="${ROOT}/admin/products.html"><i class="bi bi-box-seam me-2"></i>Sản phẩm</a></li>
          <li><a class="dropdown-item" href="${ROOT}/admin/users.html"><i class="bi bi-people me-2"></i>Khách hàng</a></li>
          <li><a class="dropdown-item" href="${ROOT}/admin/orders.html"><i class="bi bi-receipt me-2"></i>Đơn hàng</a></li>
          <li><a class="dropdown-item" href="${ROOT}/admin/stats.html"><i class="bi bi-bar-chart me-2"></i>Thống kê</a></li>
          <li><hr class="dropdown-divider"></li>
        ` : "";

        authArea.innerHTML = `
          <div class="d-flex align-items-center gap-2">
            ${isAdm ? `
              <a class="btn btn-warning rounded-4 d-none d-md-inline-flex align-items-center"
                 href="${ROOT}/admin/products.html" title="Admin Dashboard">
                <i class="bi bi-speedometer2 me-1"></i><span class="fw-semibold">Admin</span>
              </a>
            ` : ""}
            <div class="dropdown">
              <button class="btn btn-light dropdown-toggle d-flex align-items-center gap-2"
                      data-bs-toggle="dropdown" aria-expanded="false"
                      title="${isAdm ? "Tài khoản (Admin)" : "Tài khoản"}">
                <i class="bi ${iconClass}"></i>
                <span class="d-none d-sm-inline">${first}</span>
                ${adminChip}
              </button>
              <ul class="dropdown-menu dropdown-menu-end shadow">
                <li><h6 class="dropdown-header d-flex align-items-center justify-content-between">
                  <span>${user.email || ""}</span>
                  ${isAdm ? '<span class="badge bg-warning text-dark">Admin</span>' : ''}
                </h6></li>
                ${adminMenu}
                <li><a class="dropdown-item" href="${ROOT}/settings.html"><i class="bi bi-gear me-2"></i>Cài đặt</a></li>
                <li><button class="dropdown-item text-danger" id="logout-link"><i class="bi bi-box-arrow-right me-2"></i>Đăng xuất</button></li>
              </ul>
            </div>
          </div>
        `;

        document.getElementById("logout-link")?.addEventListener("click", (e) => {
          e.preventDefault();
          try {
            if (typeof logout === "function") logout();
            else localStorage.removeItem("susan_session_user");
          } catch {}
          location.href = `${ROOT}/index.html`;
        });

        document.documentElement.classList.toggle("is-admin", isAdm);
      } else {
        authArea.innerHTML = `
          <a class="btn btn-outline-light rounded-4" href="${ROOT}/login.html" title="Đăng nhập">
            <i class="bi bi-person"></i>
          </a>
          <a class="btn btn-outline-light rounded-4 ms-1" href="${ROOT}/register.html" title="Đăng ký">
            <i class="bi bi-person-plus"></i>
          </a>
        `;
        document.documentElement.classList.remove("is-admin");
      }
    }

    // đồng bộ badge & ẩn số 0
    Promise.resolve(syncBadgeStrict()).catch(()=>{});
    const noti = document.getElementById("noti-count");
    if (noti && (!noti.textContent || noti.textContent.trim() === "0")) {
      noti.classList.add("d-none");
    }

    normalizeHeaderLinks();
    bindHeaderSearch();
  }

  /* ========== Thực sự nạp header/footer ========== */
  await loadPartial("app-header", "header.html", initHeader);
  await loadPartial("app-footer", "footer.html");

  /* ========== Fill keyword khi đi từ ô tìm kiếm header sang products ========== */
  const q = new URLSearchParams(location.search).get("q");
  const searchName = document.getElementById("searchName");
  if (q && searchName) {
    searchName.value = q;
    if (typeof loadProducts === "function") loadProducts();
  }

  /* ========== Live sync giữa các tab ========== */
  window.addEventListener("storage", (e) => {
    if (["ss_cart", "cart", "susan_cart_v1"].includes(e.key)) syncBadgeStrict();
    if (e.key === "auth_tick") initHeader();
  });

  document.addEventListener("DOMContentLoaded", () => { syncBadgeStrict(); });
})();
