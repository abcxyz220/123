// js/api/orders.js
// orders {id,user_id,created_date,status,total}
// order_details {id,order_id,product_id,variant_id,price,quantity}
window.Orders = (function(){
  async function place({ user, details, total, status='pending' }){
    if(!user || !user.id) throw new Error('Thiếu thông tin khách hàng.');
    if(!Array.isArray(details) || !details.length) throw new Error('Giỏ hàng trống.');

    const now = new Date().toISOString();

    const order = await apiPost('/orders', {
      user_id: user.id,
      created_date: now,
      status,
      total: Number(total||0)
    });

    await Promise.all(details.map(async d => {
      await apiPost('/order_details', {
        order_id   : order.id,
        product_id : d.product_id,
        variant_id : d.variant_id ?? null,
        price      : Number(d.price||0),
        quantity   : Number(d.quantity||1)
      });

      if(d.variant_id){
        try{
          const v = await apiGet('/product_variants/'+d.variant_id);
          await apiPatch('/product_variants/'+d.variant_id, {
            quantity: Math.max(0, Number(v.quantity||0) - Number(d.quantity||0))
          });
        }catch{}
      }
    }));

    return order.id;
  }

  async function all()      { return (await apiGet('/orders')) || []; }
  async function get(id)    { return apiGet('/orders/'+id); }
  async function items(oid) { return (await apiGet('/order_details?order_id='+encodeURIComponent(oid))) || []; }
  async function allItems() { return (await apiGet('/order_details')) || []; }
  async function count()    { const list = await all(); return list.length; }

  async function update(id, patch){
    const body = {};
    if(patch.status       != null) body.status       = String(patch.status);
    if(patch.total        != null) body.total        = Number(patch.total);
    if(patch.created_date != null) body.created_date = String(patch.created_date);
    return apiPatch('/orders/'+id, body);
  }

  async function remove(id){
    const its = await items(id);
    await Promise.all((its||[]).map(it => apiDelete('/order_details/'+it.id)));
    return apiDelete('/orders/'+id);
  }

  return { place, all, get, items, allItems, count, update, remove };
})();
