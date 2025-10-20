// js/api/products.js
(function () {
  function getDB() { return (typeof dbGet === 'function') ? dbGet() : (JSON.parse(localStorage.getItem('db') || '{}')); }
  function setDB(db) { if (typeof dbSet === 'function') dbSet(db); else localStorage.setItem('db', JSON.stringify(db)); }
  function ensureArrays(db) {
    db.products = Array.isArray(db.products) ? db.products : [];
    db.product_variants = Array.isArray(db.product_variants) ? db.product_variants : [];
    return db;
  }

  // ---- ID tuần tự + nén lại khi xoá ----
  function resequenceProducts(db) {
    const oldIds = db.products.map(p => p.id);
    db.products.forEach((p, i) => p.id = i + 1);
    const idMap = new Map(oldIds.map((old, i) => [String(old), i + 1]));
    db.product_variants.forEach(v => { const m = idMap.get(String(v.product_id)); if (m != null) v.product_id = m; });
    return db;
  }
  function resequenceVariants(db, productId) {
    const list = db.product_variants.filter(v => Number(v.product_id) === Number(productId));
    list.forEach((v, i) => v.id = i + 1);
    // đồng bộ toàn bộ bảng theo thứ tự xuất hiện (để mỗi sản phẩm vẫn có id biến thể riêng 1..M)
    let next = 1;
    db.product_variants.forEach(v => { v.id = next++; });
    return db;
  }

  // ---- Tính min/max từ biến thể ----
  function addPriceRange(p, variants) {
    const vs = variants.filter(v => Number(v.product_id) === Number(p.id));
    if (!vs.length) { p.minPrice = p.maxPrice = Number(p.price || 0); return p; }
    const prices = vs.map(v => Number(v.price || 0));
    p.minPrice = Math.min(...prices); p.maxPrice = Math.max(...prices);
    return p;
  }

  window.Products = {
    // ======= Products =======
    async all() {
      const db = ensureArrays(getDB());
      const list = db.products.slice().map(p => ({ ...p }));
      list.forEach(p => addPriceRange(p, db.product_variants));
      return list;
    },
    async filter({ cateId=null, minP=0, maxP=0 } = {}) {
      const list = await this.all();
      let rs = list;
      if (cateId) rs = rs.filter(p => String(p.cate_id) === String(cateId));
      if (minP)   rs = rs.filter(p => Number(p.maxPrice || p.price || 0) >= Number(minP));
      if (maxP)   rs = rs.filter(p => Number(p.minPrice || p.price || 0) <= Number(maxP));
      return rs;
    },
    async get(id) {
      const db = ensureArrays(getDB());
      id = Number(id);
      const p = db.products.find(x => Number(x.id) === id);
      if (!p) return null;
      return addPriceRange({ ...p }, db.product_variants);
    },
    async create(payload) {
      const db = ensureArrays(getDB());
      const id = db.products.length + 1; // tuần tự
      const rec = {
        id,
        name: (payload.name || '').trim(),
        sku:  String(payload.sku || id),
        cate_id: Number(payload.cate_id || 0),
        detail: (payload.detail || '').trim(),
        price: Number(payload.price || 0),
        quantity: Number(payload.quantity || 0),
        image: (payload.image || '').trim()
      };
      db.products.push(rec);

      // nếu chưa có biến thể -> tạo mặc định từ metadata
      const has = db.product_variants.some(v => Number(v.product_id) === id);
      if (!has) {
        const vid = db.product_variants.length + 1;
        db.product_variants.push({
          id: vid, product_id: id,
          variant_name: 'Mặc định',
          price: rec.price, quantity: rec.quantity, image: rec.image
        });
      }

      setDB(db);
      return { id };
    },
    async update(id, patch) {
      const db = ensureArrays(getDB());
      id = Number(id);
      const it = db.products.find(p => Number(p.id) === id);
      if (!it) throw new Error('Product not found');
      Object.assign(it, {
        name: (patch.name ?? it.name),
        sku:  (patch.sku  ?? it.sku),
        cate_id: patch.cate_id != null ? Number(patch.cate_id) : it.cate_id,
        detail: (patch.detail ?? it.detail),
        price: patch.price != null ? Number(patch.price) : it.price,
        quantity: patch.quantity != null ? Number(patch.quantity) : it.quantity,
        image: (patch.image ?? it.image),
      });
      setDB(db);
      return true;
    },
    async remove(id) {
      const db = ensureArrays(getDB());
      id = Number(id);
      db.products = db.products.filter(p => Number(p.id) !== id);
      db.product_variants = db.product_variants.filter(v => Number(v.product_id) !== id);
      resequenceProducts(db);
      setDB(db);
      return true;
    },

    // ======= Variants =======
    async variants(productId) {
      const db = ensureArrays(getDB());
      productId = Number(productId);
      return db.product_variants
        .filter(v => Number(v.product_id) === productId)
        .map(v => ({ ...v }));
    },
    async allVariants() {
      return ensureArrays(getDB()).product_variants.slice();
    },
    async firstVariant(productId) {
      const list = await this.variants(productId);
      return list[0] || null;
    },
    async saveVariant(productId, rec) {
      const db = ensureArrays(getDB());
      productId = Number(productId);
      db.product_variants = Array.isArray(db.product_variants) ? db.product_variants : [];

      if (rec.id) {
        const row = db.product_variants.find(v => Number(v.id) === Number(rec.id));
        if (!row) throw new Error('Variant not found');
        Object.assign(row, {
          product_id: productId,
          variant_name: (rec.variant_name || 'Mặc định'),
          price: Number(rec.price || 0),
          quantity: Number(rec.quantity || 0),
          image: (rec.image || '')
        });
      } else {
        const vid = db.product_variants.length + 1;
        db.product_variants.push({
          id: vid, product_id: productId,
          variant_name: (rec.variant_name || 'Mặc định'),
          price: Number(rec.price || 0),
          quantity: Number(rec.quantity || 0),
          image: (rec.image || '')
        });
      }
      // nén lại id biến thể để luôn tuần tự (và ổn định khi xoá)
      resequenceVariants(db, productId);
      setDB(db);
      return true;
    },
    async removeVariant(variantId) {
      const db = ensureArrays(getDB());
      variantId = Number(variantId);
      const v = db.product_variants.find(x => Number(x.id) === variantId);
      if (!v) return true;
      const pid = v.product_id;
      db.product_variants = db.product_variants.filter(x => Number(x.id) !== variantId);
      resequenceVariants(db, pid);
      setDB(db);
      return true;
    }
  };
})();
