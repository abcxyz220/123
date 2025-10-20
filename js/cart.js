
function getCart(){
  const u = currentUser();
  const key = 'cart_' + (u?u.id:'guest');
  const raw = localStorage.getItem(key);
  const cart = raw? JSON.parse(raw) : { items: [] };
  cart._key = key;
  return cart;
}
function saveCart(c){ localStorage.setItem(c._key, JSON.stringify({ items: c.items })); }
function addToCart(product_id, variant_id, quantity){
  const c = getCart();
  const ex = c.items.find(i=>i.variant_id===variant_id);
  if(ex) ex.quantity += quantity; else c.items.push({ product_id, variant_id, quantity });
  saveCart(c);
}
function removeFromCart(variant_id){
  const c = getCart(); c.items = c.items.filter(i=>i.variant_id!==variant_id); saveCart(c);
}
function setQty(variant_id, quantity){
  const c = getCart(); const it = c.items.find(i=>i.variant_id===variant_id);
  if(it){ it.quantity = quantity; saveCart(c); }
}
function clearCart(){ const c = getCart(); c.items = []; saveCart(c); }
function updateCartCountBubble(){
  const c = getCart(); const n = c.items.reduce((s,i)=>s+i.quantity,0);
  const el = document.getElementById('cart-count'); if(el) el.textContent = n;
}
