// js/api/categories.js
// Bảng: categories { id, name, parent_id }
window.Categories = (function(){
  function norm(it){
    if(!it) return null;
    return {
      id: Number(it.id),
      name: String(it.name || '').trim(),
      parent_id: (it.parent_id == null || it.parent_id === '') ? null : Number(it.parent_id)
    };
  }

  async function all(){
    const list = await apiGet('/categories');
    return (list||[]).map(norm).sort((a,b)=>a.id-b.id);
  }

  async function get(id){
    try { return norm(await apiGet('/categories/'+id)); }
    catch { return null; }
  }

  async function create(payload){
    const data = norm(payload||{});
    if(!data.name) throw new Error('Tên danh mục không được trống.');
    return apiPost('/categories', { name:data.name, parent_id:data.parent_id });
  }

  async function update(id, patch){
    const body = {};
    if(patch.name     != null) body.name      = String(patch.name).trim();
    if(patch.parent_id!== undefined){
      body.parent_id = (patch.parent_id == null || patch.parent_id === '') ? null : Number(patch.parent_id);
    }
    return apiPatch('/categories/'+id, body);
  }

  async function remove(id){
    return apiDelete('/categories/'+id);
  }

  return { all, get, create, update, remove };
})();
