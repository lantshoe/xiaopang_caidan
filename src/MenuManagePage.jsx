import { useState, useEffect, useCallback, useRef } from "react";

const BUCKET = "menu-assets";

// ─── 图片库弹窗 ────────────────────────────────────────────────
function ImagePickerModal({ supabase, onSelect, onClose }) {
  const [images,    setImages]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const loadImages = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.storage.from(BUCKET).list("images", { limit: 100, sortBy:{ column:"created_at", order:"desc" }});
    setImages(data?.filter(f => f.name !== ".emptyFolderPlaceholder") ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadImages(); }, [loadImages]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext  = file.name.split(".").pop();
    const path = `images/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    if (!error) await loadImages();
    setUploading(false);
  };

  const getUrl = (name) => {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(`images/${name}`);
    return data.publicUrl;
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:500, display:"flex", alignItems:"flex-end" }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)" }} />
      <div style={{ position:"relative", width:"100%", background:"#fff", borderRadius:"24px 24px 0 0", maxHeight:"80vh", display:"flex", flexDirection:"column", animation:"slideUp 0.3s cubic-bezier(.22,.68,0,1.2)" }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 0" }}>
          <div style={{ width:36, height:4, borderRadius:2, background:"#e0e8e4" }} />
        </div>
        <div style={{ padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <span style={{ fontSize:16, fontWeight:700, color:"#1a3a2a" }}>选择图片</span>
          <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ padding:"7px 16px", background:"#2d7a58", color:"#fff", border:"none", borderRadius:20, fontSize:13, fontWeight:600, cursor:"pointer" }}>
            {uploading ? "上传中..." : "+ 上传新图片"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display:"none" }} />
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"0 16px 32px" }}>
          {loading ? (
            <div style={{ textAlign:"center", padding:32, color:"#aaa" }}>加载中...</div>
          ) : images.length === 0 ? (
            <div style={{ textAlign:"center", padding:32, color:"#aaa", fontSize:14 }}>还没有图片，点击上传</div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10 }}>
              {images.map(img => (
                <div key={img.name} onClick={() => onSelect(getUrl(img.name))} style={{ aspectRatio:"1", borderRadius:12, overflow:"hidden", cursor:"pointer", border:"2px solid transparent", transition:"border 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#2d7a58"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
                >
                  <img src={getUrl(img.name)} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 菜品编辑弹窗 ──────────────────────────────────────────────
function ItemFormModal({ supabase, item, categories, onSave, onClose }) {
  const isNew = !item?.id;
  const [form, setForm] = useState({
    name:         item?.name         ?? "",
    description:  item?.description  ?? "",
    price:        item?.price        ?? "",
    category_id:  item?.category_id  ?? categories[0]?.id ?? "",
    is_available: item?.is_available ?? true,
    image_url:    item?.image_url    ?? "",
    sort_order:   item?.sort_order   ?? 0,
  });
  const [saving,     setSaving]     = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const fileRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // 直接上传图片（不经过图库）
  const handleDirectUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext  = file.name.split(".").pop();
    const path = `images/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      set("image_url", data.publicUrl);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) return;
    setSaving(true);
    try {
      const payload = { ...form, price: Number(form.price) };
      if (isNew) {
        const { error } = await supabase.from("menu_items").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("menu_items").update(payload).eq("id", item.id);
        if (error) throw error;
      }
      onSave();
    } catch { alert("保存失败"); }
    finally { setSaving(false); }
  };

  const inputStyle = { width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid rgba(45,122,88,0.2)", background:"#fff", fontSize:14, color:"#1a3a2a", outline:"none", fontFamily:"inherit" };
  const labelStyle = { fontSize:12, color:"#7a9a85", marginBottom:5, display:"block" };

  return (
    <>
      <div style={{ position:"fixed", inset:0, zIndex:400, display:"flex", alignItems:"flex-end" }}>
        <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.45)", backdropFilter:"blur(4px)" }} />
        <div style={{ position:"relative", width:"100%", background:"#f4faf7", borderRadius:"24px 24px 0 0", maxHeight:"90vh", display:"flex", flexDirection:"column", animation:"slideUp 0.3s cubic-bezier(.22,.68,0,1.2)" }}>
          <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 0" }}>
            <div style={{ width:36, height:4, borderRadius:2, background:"#c8e0d4" }} />
          </div>
          <div style={{ padding:"12px 20px 0", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
            <span style={{ fontSize:16, fontWeight:700, color:"#1a3a2a" }}>{isNew ? "添加菜品" : "编辑菜品"}</span>
            <button onClick={onClose} style={{ background:"none", border:"none", color:"#aaa", fontSize:20, cursor:"pointer", lineHeight:1 }}>×</button>
          </div>

          <div style={{ flex:1, overflowY:"auto", padding:"16px 20px 8px" }}>
            {/* 图片区 */}
            <label style={labelStyle}>菜品图片</label>
            <div style={{ display:"flex", gap:10, marginBottom:16 }}>
              {/* 预览 */}
              <div style={{ width:80, height:80, borderRadius:12, background:"#e8f5ee", flexShrink:0, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, color:"#7a9a85" }}>
                {form.image_url
                  ? <img src={form.image_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  : "📷"}
              </div>
              <div style={{ flex:1, display:"flex", flexDirection:"column", gap:8 }}>
                <button onClick={() => fileRef.current?.click()} style={{ padding:"9px 0", background:"#fff", border:"1.5px solid rgba(45,122,88,0.25)", borderRadius:10, fontSize:13, color:"#2d7a58", fontWeight:600, cursor:"pointer" }}>
                  📁 本地上传
                </button>
                <button onClick={() => setShowPicker(true)} style={{ padding:"9px 0", background:"#fff", border:"1.5px solid rgba(45,122,88,0.25)", borderRadius:10, fontSize:13, color:"#2d7a58", fontWeight:600, cursor:"pointer" }}>
                  🖼 从图库选
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleDirectUpload} style={{ display:"none" }} />
            </div>
            {form.image_url && (
              <button onClick={() => set("image_url", "")} style={{ fontSize:11, color:"#aaa", background:"none", border:"none", cursor:"pointer", marginBottom:12, padding:0 }}>× 清除图片</button>
            )}

            {/* 名称 */}
            <label style={labelStyle}>菜品名称 *</label>
            <input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="如：招牌红烧肉" style={{ ...inputStyle, marginBottom:14 }} />

            {/* 描述 */}
            <label style={labelStyle}>简介</label>
            <input value={form.description} onChange={e=>set("description",e.target.value)} placeholder="如：五花肉慢炖三小时，入口即化" style={{ ...inputStyle, marginBottom:14 }} />

            {/* 价格 + 分类 */}
            <div style={{ display:"flex", gap:12, marginBottom:14 }}>
              <div style={{ flex:1 }}>
                <label style={labelStyle}>价格 *</label>
                <input type="number" value={form.price} onChange={e=>set("price",e.target.value)} placeholder="0.00" style={inputStyle} />
              </div>
              <div style={{ flex:1 }}>
                <label style={labelStyle}>分类</label>
                <select value={form.category_id} onChange={e=>set("category_id",e.target.value)} style={{ ...inputStyle, appearance:"none" }}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* 排序 */}
            <label style={labelStyle}>排序（数字越小越靠前）</label>
            <input type="number" value={form.sort_order} onChange={e=>set("sort_order",Number(e.target.value))} style={{ ...inputStyle, marginBottom:14 }} />

            {/* 是否上架 */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:"#fff", borderRadius:12, marginBottom:8 }}>
              <span style={{ fontSize:14, color:"#1a3a2a" }}>上架销售</span>
              <button onClick={() => set("is_available", !form.is_available)} style={{
                width:44, height:26, borderRadius:13, border:"none", cursor:"pointer", position:"relative",
                background: form.is_available ? "#2d7a58" : "#ddd", transition:"background 0.2s",
              }}>
                <div style={{ position:"absolute", top:3, left: form.is_available ? 21 : 3, width:20, height:20, borderRadius:"50%", background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
          </div>

          <div style={{ padding:"12px 20px 32px", borderTop:"1px solid rgba(45,122,88,0.08)", flexShrink:0 }}>
            <button onClick={handleSave} disabled={saving || !form.name.trim() || !form.price} style={{
              width:"100%", padding:15, background: (saving||!form.name.trim()||!form.price) ? "#ccc" : "linear-gradient(135deg,#2d7a58,#3a9068)",
              color:"#fff", border:"none", borderRadius:16, fontSize:16, fontWeight:700,
              cursor: (saving||!form.name.trim()||!form.price) ? "not-allowed" : "pointer",
            }}>
              {saving ? "保存中..." : (isNew ? "添加菜品" : "保存修改")}
            </button>
          </div>
        </div>
      </div>

      {showPicker && (
        <ImagePickerModal supabase={supabase} onSelect={url => { set("image_url", url); setShowPicker(false); }} onClose={() => setShowPicker(false)} />
      )}
    </>
  );
}

// ─── 分类管理弹窗 ──────────────────────────────────────────────
function CategoryModal({ supabase, categories, onSave, onClose }) {
  const [list,    setList]    = useState(categories.map(c => ({ ...c })));
  const [saving,  setSaving]  = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("◈");

  const ICONS = ["◈","◉","◎","◆","◇","✦","★","♥","▲","●"];

  const addCat = async () => {
    if (!newName.trim()) return;
    const { data, error } = await supabase.from("categories").insert({ name: newName.trim(), icon: newIcon, sort_order: list.length + 1 }).select().single();
    if (!error && data) { setList(l => [...l, data]); setNewName(""); }
  };

  const toggleActive = async (cat) => {
    const newVal = !cat.is_active;
    setList(l => l.map(c => c.id === cat.id ? { ...c, is_active: newVal } : c));
    await supabase.from("categories").update({ is_active: newVal }).eq("id", cat.id);
  };

  const deleteCat = async (id) => {
    if (!confirm("删除分类不会删除该分类下的菜品，但菜品会变成无分类。确定吗？")) return;
    await supabase.from("categories").delete().eq("id", id);
    setList(l => l.filter(c => c.id !== id));
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:400, display:"flex", alignItems:"flex-end" }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.45)", backdropFilter:"blur(4px)" }} />
      <div style={{ position:"relative", width:"100%", background:"#f4faf7", borderRadius:"24px 24px 0 0", maxHeight:"80vh", display:"flex", flexDirection:"column", animation:"slideUp 0.3s cubic-bezier(.22,.68,0,1.2)" }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 0" }}>
          <div style={{ width:36, height:4, borderRadius:2, background:"#c8e0d4" }} />
        </div>
        <div style={{ padding:"12px 20px 0", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <span style={{ fontSize:16, fontWeight:700, color:"#1a3a2a" }}>管理分类</span>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#aaa", fontSize:20, cursor:"pointer" }}>×</button>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"12px 20px 8px" }}>
          {/* 新增分类 */}
          <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center" }}>
            <select value={newIcon} onChange={e=>setNewIcon(e.target.value)} style={{ width:52, padding:"9px 4px", borderRadius:10, border:"1.5px solid rgba(45,122,88,0.2)", background:"#fff", fontSize:16, textAlign:"center", outline:"none" }}>
              {ICONS.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
            <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCat()} placeholder="新分类名称" style={{ flex:1, padding:"10px 12px", borderRadius:10, border:"1.5px solid rgba(45,122,88,0.2)", background:"#fff", fontSize:14, color:"#1a3a2a", outline:"none", fontFamily:"inherit" }} />
            <button onClick={addCat} disabled={!newName.trim()} style={{ padding:"9px 16px", background: newName.trim()?"#2d7a58":"#ccc", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor: newName.trim()?"pointer":"not-allowed" }}>添加</button>
          </div>

          {/* 分类列表 */}
          {list.map(cat => (
            <div key={cat.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", background:"rgba(255,255,255,0.8)", borderRadius:12, marginBottom:8, border:"1px solid rgba(255,255,255,0.9)" }}>
              <span style={{ fontSize:18, width:24, textAlign:"center" }}>{cat.icon}</span>
              <span style={{ flex:1, fontSize:14, fontWeight:500, color: cat.is_active ? "#1a3a2a" : "#aaa" }}>{cat.name}</span>
              <button onClick={() => toggleActive(cat)} style={{ fontSize:11, padding:"3px 10px", borderRadius:20, border:"none", cursor:"pointer", background: cat.is_active ? "#e8f5ee" : "#f0f0f0", color: cat.is_active ? "#2d7a58" : "#aaa", fontWeight:600 }}>
                {cat.is_active ? "显示中" : "已隐藏"}
              </button>
              <button onClick={() => deleteCat(cat.id)} style={{ width:28, height:28, borderRadius:"50%", border:"none", background:"transparent", color:"#ddd", fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}
                onMouseEnter={e => e.currentTarget.style.color="#e05a3a"}
                onMouseLeave={e => e.currentTarget.style.color="#ddd"}
              >✕</button>
            </div>
          ))}
        </div>

        <div style={{ padding:"12px 20px 32px", flexShrink:0 }}>
          <button onClick={onClose} style={{ width:"100%", padding:14, background:"#2d7a58", color:"#fff", border:"none", borderRadius:16, fontSize:15, fontWeight:700, cursor:"pointer" }}>完成</button>
        </div>
      </div>
    </div>
  );
}

// ─── 主菜单管理页 ──────────────────────────────────────────────
export default function MenuManagePage({ supabase }) {
  const [categories, setCategories] = useState([]);
  const [menuItems,  setMenuItems]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeCat,  setActiveCat]  = useState("all");
  const [editItem,   setEditItem]   = useState(null);   // null | item | "new"
  const [showCatMgr, setShowCatMgr] = useState(false);
  const [deleting,   setDeleting]   = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: cats }, { data: items }] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("menu_items").select("*").order("sort_order"),
    ]);
    setCategories(cats ?? []);
    setMenuItems(items ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (item) => {
    if (!confirm(`确定删除「${item.name}」？`)) return;
    setDeleting(item.id);
    await supabase.from("menu_items").delete().eq("id", item.id);
    setMenuItems(prev => prev.filter(m => m.id !== item.id));
    setDeleting(null);
  };

  const toggleAvail = async (item) => {
    const newVal = !item.is_available;
    setMenuItems(prev => prev.map(m => m.id === item.id ? { ...m, is_available: newVal } : m));
    await supabase.from("menu_items").update({ is_available: newVal }).eq("id", item.id);
  };

  const filtered = activeCat === "all" ? menuItems : menuItems.filter(m => m.category_id === activeCat);

  const PALETTE = [
    { bg:"#d4ede3", fg:"#2d7a58" },{ bg:"#fde8d8", fg:"#c4622d" },
    { bg:"#dde8f5", fg:"#2c5f8a" },{ bg:"#f0e6f5", fg:"#7040a0" },
    { bg:"#fdf0d5", fg:"#a07030" },{ bg:"#e5f0e0", fg:"#3a7030" },
  ];
  function hashId(s){ let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))&0xffff; return h; }

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", flex:1 }}>
      <div style={{ width:28, height:28, border:"3px solid rgba(45,122,88,0.2)", borderTopColor:"#2d7a58", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
    </div>
  );

  return (
    <>
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* 顶部操作栏 */}
        <div style={{ padding:"0 16px 12px", display:"flex", gap:10, flexShrink:0 }}>
          <button onClick={() => setEditItem("new")} style={{ flex:1, padding:"10px 0", background:"linear-gradient(135deg,#2d7a58,#3a9068)", color:"#fff", border:"none", borderRadius:12, fontSize:14, fontWeight:700, cursor:"pointer", boxShadow:"0 3px 12px rgba(45,122,88,0.3)" }}>
            + 添加菜品
          </button>
          <button onClick={() => setShowCatMgr(true)} style={{ padding:"10px 16px", background:"rgba(255,255,255,0.75)", border:"1.5px solid rgba(45,122,88,0.2)", borderRadius:12, fontSize:13, color:"#2d7a58", fontWeight:600, cursor:"pointer", backdropFilter:"blur(8px)" }}>
            管理分类
          </button>
        </div>

        {/* 分类筛选 */}
        <div style={{ overflowX:"auto", display:"flex", gap:8, padding:"0 16px 12px", flexShrink:0 }}>
          {[{ id:"all", name:"全部", icon:"✦" }, ...categories].map(cat => {
            const active = activeCat === cat.id;
            return (
              <button key={cat.id} onClick={() => setActiveCat(cat.id)} style={{ flexShrink:0, padding:"7px 14px", borderRadius:20, border: active ? "none" : "1.5px solid rgba(45,122,88,0.15)", background: active ? "#2d7a58" : "rgba(255,255,255,0.7)", color: active ? "#fff" : "#4a7a60", fontSize:12, fontWeight: active ? 600 : 400, cursor:"pointer", display:"flex", alignItems:"center", gap:5, backdropFilter:"blur(8px)", boxShadow: active ? "0 2px 10px rgba(45,122,88,0.3)" : "none", transition:"all 0.2s" }}>
                <span>{cat.icon}</span>{cat.name}
                <span style={{ opacity:0.7, fontSize:11 }}>
                  ({cat.id === "all" ? menuItems.length : menuItems.filter(m=>m.category_id===cat.id).length})
                </span>
              </button>
            );
          })}
        </div>

        {/* 菜品列表 */}
        <div style={{ flex:1, overflowY:"auto", padding:"0 16px 32px" }}>
          {filtered.length === 0 && (
            <div style={{ textAlign:"center", padding:"48px 0", color:"#7a9a85" }}>
              <div style={{ fontSize:28, marginBottom:8 }}>🍽</div>
              <div style={{ fontSize:13 }}>该分类下暂无菜品</div>
            </div>
          )}
          {filtered.map(item => {
            const p = PALETTE[hashId(item.id) % PALETTE.length];
            return (
              <div key={item.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", background:"rgba(255,255,255,0.78)", borderRadius:14, marginBottom:10, border:"1px solid rgba(255,255,255,0.9)", boxShadow:"0 1px 8px rgba(45,122,88,0.07)", opacity: item.is_available ? 1 : 0.6 }}>
                {/* 图片/占位 */}
                <div style={{ width:56, height:56, borderRadius:10, flexShrink:0, overflow:"hidden", background:p.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:700, color:p.fg, fontFamily:"'Noto Serif SC',serif" }}>
                  {item.image_url ? <img src={item.image_url} alt={item.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : item.name.charAt(0)}
                </div>

                {/* 信息 */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:14, fontWeight:600, color:"#1a3a2a" }}>{item.name}</span>
                    {!item.is_available && <span style={{ fontSize:10, color:"#aaa", background:"#f0f0f0", padding:"1px 6px", borderRadius:10 }}>已下架</span>}
                  </div>
                  <div style={{ fontSize:11, color:"#7a9a85", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.description || "暂无描述"}</div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#2d7a58", marginTop:4 }}>¥{item.price}</div>
                </div>

                {/* 操作按钮 */}
                <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
                  <button onClick={() => setEditItem(item)} style={{ padding:"5px 12px", background:"#e8f5ee", color:"#2d7a58", border:"none", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>编辑</button>
                  <button onClick={() => toggleAvail(item)} style={{ padding:"5px 12px", background:"#f5f5f5", color:"#888", border:"none", borderRadius:8, fontSize:12, cursor:"pointer" }}>
                    {item.is_available ? "下架" : "上架"}
                  </button>
                  <button onClick={() => handleDelete(item)} disabled={deleting === item.id} style={{ padding:"5px 12px", background:"#fff0f0", color:"#e05a3a", border:"none", borderRadius:8, fontSize:12, cursor:"pointer" }}>删除</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 菜品编辑弹窗 */}
      {editItem && (
        <ItemFormModal
          supabase={supabase}
          item={editItem === "new" ? null : editItem}
          categories={categories}
          onSave={() => { setEditItem(null); loadData(); }}
          onClose={() => setEditItem(null)}
        />
      )}

      {/* 分类管理弹窗 */}
      {showCatMgr && (
        <CategoryModal
          supabase={supabase}
          categories={categories}
          onSave={loadData}
          onClose={() => { setShowCatMgr(false); loadData(); }}
        />
      )}
    </>
  );
}
