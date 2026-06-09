import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import AdminPage from "./AdminPage";
import ShoppingPage from "./ShoppingPage";
import HistoryPage from "./HistoryPage";
import MenuManagePage from "./MenuManagePage";
import AuthPage from "./AuthPage";
import PantryPage from "./PantryPage";


const SUPABASE_URL  = "https://udawpaivdegqhlyvnffs.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkYXdwYWl2ZGVncWhseXZuZmZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MDUxNTAsImV4cCI6MjA5NDA4MTE1MH0.2aPiAEdFq1S4NBQ-BUDjhGx4WpLzvvUMk_1e0njROWg";
const DEV_MODE = false;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ─── 常量 ──────────────────────────────────────────────────────
const PALETTE = [
  { bg:"#d4ede3", fg:"#2d7a58" },{ bg:"#fde8d8", fg:"#c4622d" },
  { bg:"#dde8f5", fg:"#2c5f8a" },{ bg:"#f0e6f5", fg:"#7040a0" },
  { bg:"#fdf0d5", fg:"#a07030" },{ bg:"#e5f0e0", fg:"#3a7030" },
];
function hashId(str) { let h=0; for(let i=0;i<str.length;i++) h=(h*31+str.charCodeAt(i))&0xffff; return h; }
function pal(id) { return PALETTE[hashId(id) % PALETTE.length]; }
function generateOrderNo() {
  const d=new Date(), pad=n=>String(n).padStart(2,"0");
  return `ORD-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${String(Math.floor(Math.random()*1000)).padStart(3,"0")}`;
}

const TABS = [
  { id:"menu",     label:"点单",  defaultIcon:"🍽" },
  { id:"admin",    label:"订单",  defaultIcon:"📋" },
  { id:"history",  label:"历史",  defaultIcon:"🕐" },
  { id:"manage",   label:"菜单",  defaultIcon:"⚙️" },
  { id:"shopping", label:"采购",  defaultIcon:"🛒" },
  { id:"pantry",   label:"食材", defaultIcon:"🥬" },

];

// ─── 图标配置弹窗 ──────────────────────────────────────────────
function IconConfigModal({ supabase, configs, onSave, onClose }) {
  const BUCKET = "menu-assets";
  const [uploading, setUploading] = useState(null); // key of uploading item
  const [localConfigs, setLocalConfigs] = useState({ ...configs });
  const fileRefs = useRef({});

  const handleUpload = async (key, file) => {
    if (!file) return;
    setUploading(key);
    try {
      const ext  = file.name.split(".").pop();
      const path = `icons/${key}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      // 更新数据库
      await supabase.from("app_config").upsert({ key, value: data.publicUrl });
      setLocalConfigs(c => ({ ...c, [key]: data.publicUrl }));
    } catch { alert("上传失败，请重试"); }
    finally { setUploading(null); }
  };

  const handleClear = async (key) => {
    await supabase.from("app_config").upsert({ key, value: "" });
    setLocalConfigs(c => ({ ...c, [key]: "" }));
  };

  const iconItems = [
    ...TABS.map(t => ({ key: `icon_${t.id}`, label: `"${t.label}" 图标`, defaultEmoji: t.defaultIcon })),
    { key: "icon_logo",  label: "左上角 Logo（长按进入设置）", defaultEmoji: "✦" },
    { key: "icon_right", label: "右上角装饰动图",              defaultEmoji: "🌿" },
    { key: "icon_price", label: "价格图标（替换 ¥ 符号）",     defaultEmoji: "🪙" },
  ];

  return (
    <div style={{ position:"fixed", inset:0, zIndex:600, display:"flex", alignItems:"flex-end" }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)" }} />
      <div style={{ position:"relative", width:"100%", background:"#f4faf7", borderRadius:"24px 24px 0 0", maxHeight:"85vh", display:"flex", flexDirection:"column", animation:"slideUp 0.3s cubic-bezier(.22,.68,0,1.2)" }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 0" }}>
          <div style={{ width:36, height:4, borderRadius:2, background:"#c8e0d4" }} />
        </div>
        <div style={{ padding:"12px 20px 0", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:"#1a3a2a" }}>图标 / 动图设置</div>
            <div style={{ fontSize:11, color:"#7a9a85", marginTop:2 }}>支持 GIF、PNG、WebP，建议尺寸 64×64</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#aaa", fontSize:22, cursor:"pointer", lineHeight:1 }}>×</button>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"16px 20px 8px" }}>
          {iconItems.map(({ key, label, defaultEmoji }) => {
            const url = localConfigs[key];
            const busy = uploading === key;
            return (
              <div key={key} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 0", borderBottom:"1px solid rgba(45,122,88,0.08)" }}>
                {/* 预览 */}
                <div style={{ width:52, height:52, borderRadius:12, background:"rgba(45,122,88,0.08)", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", border:"1.5px solid rgba(45,122,88,0.15)" }}>
                  {url
                    ? <img src={url} alt={label} style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                    : <span style={{ fontSize:22 }}>{defaultEmoji}</span>
                  }
                </div>

                {/* 信息 */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#1a3a2a", marginBottom:4 }}>{label}</div>
                  <div style={{ fontSize:11, color: url ? "#2d7a58" : "#aaa" }}>
                    {url ? "已上传自定义图标" : "使用默认 Emoji"}
                  </div>
                </div>

                {/* 操作 */}
                <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
                  <button
                    onClick={() => fileRefs.current[key]?.click()}
                    disabled={busy}
                    style={{ padding:"6px 14px", background: busy ? "#ccc" : "#2d7a58", color:"#fff", border:"none", borderRadius:10, fontSize:12, fontWeight:600, cursor: busy ? "not-allowed" : "pointer" }}
                  >
                    {busy ? "上传中…" : "上传"}
                  </button>
                  {url && (
                    <button onClick={() => handleClear(key)} style={{ padding:"6px 14px", background:"#fff0f0", color:"#e05a3a", border:"none", borderRadius:10, fontSize:12, cursor:"pointer" }}>清除</button>
                  )}
                </div>
                <input
                  ref={el => fileRefs.current[key] = el}
                  type="file" accept="image/*,.gif"
                  onChange={e => handleUpload(key, e.target.files?.[0])}
                  style={{ display:"none" }}
                />
              </div>
            );
          })}
        </div>

        <div style={{ padding:"12px 20px 32px", flexShrink:0 }}>
          <button onClick={() => { onSave(localConfigs); onClose(); }} style={{ width:"100%", padding:14, background:"linear-gradient(135deg,#2d7a58,#3a9068)", color:"#fff", border:"none", borderRadius:16, fontSize:15, fontWeight:700, cursor:"pointer" }}>
            完成
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 小组件 ────────────────────────────────────────────────────
function Spinner() {
  return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", flex:1 }}>
    <div style={{ width:28, height:28, border:"3px solid rgba(45,122,88,0.2)", borderTopColor:"#2d7a58", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
  </div>;
}

function Thumb({ item }) {
  const p = pal(item.id);
  if (item.image_url) return <img src={item.image_url} alt={item.name} style={{ width:68, height:68, borderRadius:12, objectFit:"cover", flexShrink:0 }} />;
  return <div style={{ width:68, height:68, borderRadius:12, flexShrink:0, background:p.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, fontWeight:700, color:p.fg, fontFamily:"'Noto Serif SC',serif" }}>{item.name.charAt(0)}</div>;
}

function ItemCard({ item, qty, onAdd, onSub, PriceIcon }) {
  return (
    <div style={{ display:"flex", gap:10, padding:"12px 0", borderBottom:"1px solid rgba(45,122,88,0.08)", opacity:item.is_available?1:0.5 }}>
      <div style={{ position:"relative", flexShrink:0 }}>
        <Thumb item={item} />
        {!item.is_available && <div style={{ position:"absolute", inset:0, borderRadius:12, background:"rgba(255,255,255,0.6)", display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:10, color:"#888", fontWeight:600 }}>售罄</span></div>}
      </div>
      <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:14, fontWeight:600, color:"#1a3a2a", lineHeight:1.3 }}>{item.name}</div>
          <div style={{ fontSize:11, color:"#7a9a85", marginTop:2, lineHeight:1.4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.description}</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:6 }}>
          <span style={{ fontSize:15, fontWeight:700, color:"#2d7a58", display:"flex", alignItems:"center", gap:2 }}>
            <PriceIcon size={14} />{item.price}
          </span>
          {item.is_available && (
            qty === 0 ? (
              <button onClick={onAdd} style={{ width:28, height:28, borderRadius:"50%", border:"none", background:"#2d7a58", color:"#fff", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:300, lineHeight:1, boxShadow:"0 2px 8px rgba(45,122,88,0.35)" }}>+</button>
            ) : (
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <button onClick={onSub} style={{ width:26, height:26, borderRadius:"50%", border:"1.5px solid #2d7a58", background:"transparent", color:"#2d7a58", fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>−</button>
                <span style={{ fontSize:14, fontWeight:600, color:"#1a3a2a", minWidth:16, textAlign:"center" }}>{qty}</span>
                <button onClick={onAdd} style={{ width:26, height:26, borderRadius:"50%", border:"none", background:"#2d7a58", color:"#fff", fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, boxShadow:"0 2px 8px rgba(45,122,88,0.3)" }}>+</button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function CartSheet({ cartItems, menuItems, onAdd, onSub, onClear, onOrder, onClose, totalPrice, ordering, PriceIcon }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:300, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.4)", backdropFilter:"blur(4px)" }} />
      <div style={{ position:"relative", background:"#fff", borderRadius:"24px 24px 0 0", maxHeight:"72vh", display:"flex", flexDirection:"column", boxShadow:"0 -8px 40px rgba(0,0,0,0.15)", animation:"slideUp 0.32s cubic-bezier(.22,.68,0,1.2) both" }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 0" }}><div style={{ width:36, height:4, borderRadius:2, background:"#e0e8e4" }} /></div>
        <div style={{ padding:"12px 20px 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <h2 style={{ fontSize:17, fontWeight:700, color:"#1a3a2a", fontFamily:"'Noto Serif SC',serif" }}>购物车</h2>
          <button onClick={onClear} style={{ background:"none", border:"none", color:"#aaa", fontSize:12, cursor:"pointer", padding:"4px 8px" }}>清空</button>
        </div>
        <div style={{ overflowY:"auto", flex:1, padding:"8px 20px" }}>
          {cartItems.length === 0
            ? <div style={{ textAlign:"center", padding:32, color:"#aaa", fontSize:14 }}>购物车是空的</div>
            : cartItems.map(({ id, qty }) => {
              const item = menuItems.find(m=>m.id===id); if (!item) return null;
              const p = pal(id);
              return (
                <div key={id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:"1px solid #f0f5f2" }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:p.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:p.fg, fontFamily:"'Noto Serif SC',serif", flexShrink:0 }}>{item.name.charAt(0)}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#1a3a2a" }}>{item.name}</div>
                    <div style={{ fontSize:12, color:"#2d7a58", fontWeight:700, display:"flex", alignItems:"center", gap:1 }}>
                      <PriceIcon size={12} />{item.price}
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <button onClick={()=>onSub(id)} style={{ width:26, height:26, borderRadius:"50%", border:"1.5px solid #2d7a58", background:"transparent", color:"#2d7a58", fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>−</button>
                    <span style={{ fontSize:14, fontWeight:600, minWidth:16, textAlign:"center" }}>{qty}</span>
                    <button onClick={()=>onAdd(id)} style={{ width:26, height:26, borderRadius:"50%", border:"none", background:"#2d7a58", color:"#fff", fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>+</button>
                  </div>
                </div>
              );
            })}
        </div>
        {cartItems.length > 0 && (
          <div style={{ padding:"14px 20px 32px", borderTop:"1px solid #f0f5f2" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <span style={{ color:"#7a9a85", fontSize:14 }}>合计</span>
              <span style={{ fontSize:20, fontWeight:700, color:"#1a3a2a", display:"flex", alignItems:"center", gap:3 }}>
                <PriceIcon size={18} />{totalPrice}
              </span>
            </div>
            <button onClick={onOrder} disabled={ordering} style={{ width:"100%", padding:15, background:ordering?"#aaa":"linear-gradient(135deg,#2d7a58,#3a9068)", color:"#fff", border:"none", borderRadius:16, fontSize:16, fontWeight:700, cursor:ordering?"not-allowed":"pointer", boxShadow:ordering?"none":"0 4px 20px rgba(45,122,88,0.4)", letterSpacing:"0.5px" }}>
              {ordering ? "下单中..." : "确认下单"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 菜单页 ────────────────────────────────────────────────────
function MenuPage({ supabase, PriceIcon }) {
  const [categories,   setCategories]   = useState([]);
  const [menuItems,    setMenuItems]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [activeCat,    setActiveCat]    = useState(null);
  const [expandedCats, setExpandedCats] = useState({}); // 哪些父分类展开了子分类
  const [cart,         setCart]         = useState({});
  const [showCart,     setShowCart]     = useState(false);
  const [toast,        setToast]        = useState(false);
  const [ordering,     setOrdering]     = useState(false);
  const catRefs          = useRef({});
  const rightRef         = useRef(null);
  const scrollingByClick = useRef(false);

  const loadMenu = useCallback(async () => {
    setError(null);
    try {
      const [{ data:cats, error:e1 }, { data:items, error:e2 }] = await Promise.all([
        supabase.from("categories").select("*").eq("is_active",true).order("sort_order"),
        supabase.from("menu_items").select("*").order("sort_order"),
      ]);
      if (e1) throw e1; if (e2) throw e2;
      setCategories(cats ?? []);
      setMenuItems(items ?? []);
      const topCats = (cats ?? []).filter(c => !c.parent_id);
      if (topCats.length) setActiveCat(topCats[0].id);
    } catch { setError("菜单加载失败"); }
    finally { setLoading(false); }
  }, [supabase]);

  useEffect(() => { loadMenu(); }, [loadMenu]);

  const addToCart   = id => setCart(c => ({ ...c, [id]: (c[id]||0)+1 }));
  const subFromCart = id => setCart(c => { const n={...c,[id]:(c[id]||1)-1}; if(n[id]===0) delete n[id]; return n; });
  const cartItems  = Object.entries(cart).map(([id,qty])=>({ id, qty }));
  const totalQty   = cartItems.reduce((s,{qty})=>s+qty, 0);
  const totalPrice = cartItems.reduce((s,{id,qty})=>{ const m=menuItems.find(m=>m.id===id); return s+(m?Number(m.price)*qty:0); },0).toFixed(2);

  const handleOrder = async () => {
    if (!cartItems.length||ordering) return;
    setOrdering(true);
    try {
      const order_no = generateOrderNo();
      const { data:orderData, error:e1 } = await supabase.from("orders").insert({ order_no, total_amount:totalPrice, status:"pending" }).select().single();
      if (e1) throw e1;
      const rows = cartItems.map(({id,qty})=>{ const m=menuItems.find(m=>m.id===id); return { order_id:orderData.id, menu_item_id:id, item_name:m.name, item_price:m.price, quantity:qty }; });
      const { error:e2 } = await supabase.from("order_items").insert(rows);
      if (e2) throw e2;
      setCart({}); setShowCart(false); setToast(true);
      setTimeout(()=>setToast(false), 2500);
    } catch { alert("下单失败，请稍后重试"); }
    finally { setOrdering(false); }
  };

  const topCats    = categories.filter(c => !c.parent_id);
  const childrenOf = (pid) => categories.filter(c => c.parent_id === pid);
  const isParentActive = (parentId) =>
    activeCat === parentId || childrenOf(parentId).some(c => c.id === activeCat);

  // ── 核心滚动函数：用 scrollIntoView 最准确 ──
  const scrollTocat = (catId) => {
    const el = catRefs.current[catId];
    if (!el || !rightRef.current) return;
    // 算出元素在滚动容器内的 top，然后减去一点让标题完整露出
    const ct     = rightRef.current;
    const elTop  = el.getBoundingClientRect().top;
    const ctTop  = ct.getBoundingClientRect().top;
    // 减 4px 让标题顶部刚好贴着容器顶，不被遮住
    const target = ct.scrollTop + (elTop - ctTop) - 4;
    ct.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  };

  // 点击顶级分类
  const handleParentClick = (cat) => {
    const children = childrenOf(cat.id);
    if (children.length > 0) {
      // 有子分类：切换展开/收起
      setExpandedCats(e => ({ ...e, [cat.id]: !e[cat.id] }));
    }
    // 无论有无子分类，都跳转到右侧该分类
    setActiveCat(cat.id);
    scrollingByClick.current = true;
    scrollTocat(cat.id);
    setTimeout(() => { scrollingByClick.current = false; }, 800);
  };

  // 点击子分类
  const handleChildClick = (child, parentId) => {
    setActiveCat(child.id);
    scrollingByClick.current = true;
    scrollTocat(child.id);
    setTimeout(() => { scrollingByClick.current = false; }, 800);
  };

  // 右侧滚动 → 同步高亮左侧，并自动展开对应父分类
  const handleRightScroll = () => {
    if (scrollingByClick.current) return;
    const ct = rightRef.current; if (!ct) return;
    const ctTop = ct.getBoundingClientRect().top;
    // 收集所有有 ref 的分类，找最后一个顶部 <= 容器顶部+8 的
    let cur = topCats[0]?.id ?? null;
    for (const cat of categories) {
      const el = catRefs.current[cat.id];
      if (!el) continue;
      const elTop = el.getBoundingClientRect().top - ctTop;
      if (elTop <= 8) cur = cat.id;
    }
    if (cur && cur !== activeCat) {
      setActiveCat(cur);
      // 如果滚到了子分类，自动展开其父分类
      const curCat = categories.find(c => c.id === cur);
      if (curCat?.parent_id) {
        setExpandedCats(e => e[curCat.parent_id] ? e : { ...e, [curCat.parent_id]: true });
      }
    }
  };

  if (loading) return <Spinner />;
  if (error) return (
    <div style={{ margin:16, padding:"14px 16px", background:"#fff3f0", borderRadius:12, border:"1px solid #fcc", display:"flex", justifyContent:"space-between" }}>
      <span style={{ fontSize:13, color:"#c04040" }}>{error}</span>
      <button onClick={loadMenu} style={{ fontSize:12, color:"#2d7a58", border:"none", background:"none", cursor:"pointer", fontWeight:600 }}>重试</button>
    </div>
  );

  return (
    <>
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* ── 左侧导航 ── */}
        <div style={{ width:68, flexShrink:0, overflowY:"auto", background:"rgba(255,255,255,0.35)", backdropFilter:"blur(10px)", borderRight:"1px solid rgba(45,122,88,0.1)", display:"flex", flexDirection:"column", gap:1, padding:"8px 4px" }}>
          {topCats.map((cat, idx) => {
            const children  = childrenOf(cat.id);
            const expanded  = !!expandedCats[cat.id];
            const pActive   = isParentActive(cat.id);

            return (
              <div key={cat.id} style={{ marginTop: idx > 0 ? 2 : 0 }}>
                {/* 顶级分类按钮 */}
                <button
                  onClick={() => handleParentClick(cat)}
                  style={{
                    width:"100%", padding:"10px 4px 8px", border:"none", cursor:"pointer",
                    borderRadius:12, display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                    background: pActive ? "rgba(45,122,88,0.11)" : "transparent",
                    position:"relative",
                  }}
                >
                  {pActive && <div style={{ position:"absolute", left:0, top:"50%", transform:"translateY(-50%)", width:3, height:24, borderRadius:"0 3px 3px 0", background:"#2d7a58" }} />}
                  <div style={{ width:36, height:36, borderRadius:10, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", background: cat.icon_url ? "transparent" : (pActive ? "rgba(45,122,88,0.1)" : "rgba(0,0,0,0.03)"), transition:"all 0.2s" }}>
                    {cat.icon_url
                      ? <img src={cat.icon_url} alt={cat.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      : <span style={{ fontSize:18, color: pActive ? "#2d7a58" : "#7a9a85" }}>{cat.icon}</span>
                    }
                  </div>
                  <span style={{ fontSize:10, fontWeight: pActive?600:400, color: pActive?"#2d7a58":"#7a9a85", lineHeight:1.2, textAlign:"center", wordBreak:"keep-all" }}>{cat.name}</span>
                  {/* 有子分类时显示展开箭头 */}
                  {children.length > 0 && (
                    <span style={{ fontSize:8, color: pActive?"#2d7a58":"#bbb", lineHeight:1, display:"inline-block", transition:"transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                  )}
                </button>

                {/* 子分类列表（受 expanded 控制） */}
                {children.length > 0 && expanded && (
                  <div style={{ paddingLeft:4, paddingRight:2, borderLeft:"2px solid rgba(45,122,88,0.12)", marginLeft:8, marginBottom:2 }}>
                    {children.map(child => {
                      const cActive = activeCat === child.id;
                      return (
                        <button
                          key={child.id}
                          onClick={() => handleChildClick(child, cat.id)}
                          style={{
                            width:"100%", padding:"6px 2px", border:"none", cursor:"pointer",
                            borderRadius:8, display:"flex", flexDirection:"column", alignItems:"center", gap:2,
                            background: cActive ? "rgba(45,122,88,0.1)" : "transparent",
                            position:"relative",
                          }}
                        >
                          {cActive && <div style={{ position:"absolute", left:-6, top:"50%", transform:"translateY(-50%)", width:2, height:16, borderRadius:"0 2px 2px 0", background:"#2d7a58" }} />}
                          <div style={{ width:28, height:28, borderRadius:8, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", background: child.icon_url ? "transparent" : (cActive ? "rgba(45,122,88,0.1)" : "rgba(0,0,0,0.03)") }}>
                            {child.icon_url
                              ? <img src={child.icon_url} alt={child.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                              : <span style={{ fontSize:13, color: cActive?"#2d7a58":"#9ab8a8" }}>{child.icon}</span>
                            }
                          </div>
                          <span style={{ fontSize:9, fontWeight: cActive?600:400, color: cActive?"#2d7a58":"#9ab8a8", lineHeight:1.2, textAlign:"center", wordBreak:"keep-all" }}>{child.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── 右侧菜品内容（无 sticky，避免遮挡） ── */}
        <div ref={rightRef} onScroll={handleRightScroll} style={{ flex:1, overflowY:"auto", padding:"0 12px 120px" }}>
          {topCats.map(parent => {
            const children   = childrenOf(parent.id);
            const parentItems = menuItems.filter(m => m.category_id === parent.id);
            const totalCount  = parentItems.length + children.flatMap(c => menuItems.filter(m => m.category_id === c.id)).length;

            return (
              <div key={parent.id}>
                {/* 父分类标题 —— ref 绑这里，不用 sticky */}
                <div
                  ref={el => { catRefs.current[parent.id] = el; }}
                  style={{ padding:"16px 0 6px", fontSize:13, fontWeight:600, color:"#2d7a58", display:"flex", alignItems:"center", gap:6 }}
                >
                  <span>{parent.icon}</span>
                  <span>{parent.name}</span>
                  {children.length > 0 && (
                    <span style={{ fontSize:10, color:"#aaa", background:"rgba(45,122,88,0.07)", padding:"1px 7px", borderRadius:10, fontWeight:400 }}>
                      {children.map(c => c.name).join(" · ")}
                    </span>
                  )}
                  <span style={{ fontSize:11, color:"#aaa", fontWeight:400 }}>({totalCount})</span>
                </div>
                {/* 父分类直属菜品 */}
                {parentItems.map(item => (
                  <ItemCard key={item.id} item={item} qty={cart[item.id]||0} onAdd={()=>addToCart(item.id)} onSub={()=>subFromCart(item.id)} PriceIcon={PriceIcon} />
                ))}

                {/* 子分类段落 */}
                {children.map(child => {
                  const childItems = menuItems.filter(m => m.category_id === child.id);
                  if (childItems.length === 0) return null;
                  return (
                    <div key={child.id}>
                      <div
                        ref={el => { catRefs.current[child.id] = el; }}
                        style={{ padding:"10px 0 5px", fontSize:12, fontWeight:600, color:"#5a8a6a", display:"flex", alignItems:"center", gap:5, marginLeft:4 }}
                      >
                        <span style={{ color:"rgba(45,122,88,0.35)", fontSize:10 }}>└</span>
                        <span>{child.icon}</span>
                        <span>{child.name}</span>
                        <span style={{ fontSize:11, color:"#aaa", fontWeight:400 }}>({childItems.length})</span>
                      </div>
                      <div style={{ paddingLeft:8, borderLeft:"2px solid rgba(45,122,88,0.08)", marginLeft:6 }}>
                        {childItems.map(item => (
                          <ItemCard key={item.id} item={item} qty={cart[item.id]||0} onAdd={()=>addToCart(item.id)} onSub={()=>subFromCart(item.id)} PriceIcon={PriceIcon} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* FAB */}
      <button onClick={()=>setShowCart(true)} style={{ position:"fixed", bottom:72, right:20, width:60, height:60, borderRadius:"50%", background:totalQty>0?"linear-gradient(135deg,#2d7a58,#3a9068)":"rgba(255,255,255,0.85)", border:totalQty>0?"none":"1.5px solid rgba(45,122,88,0.25)", backdropFilter:"blur(12px)", boxShadow:totalQty>0?"0 6px 24px rgba(45,122,88,0.45)":"0 4px 16px rgba(0,0,0,0.1)", cursor:"pointer", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:0 }}>
        <span style={{ fontSize:26 }}>🛒</span>
        {totalQty>0 && <div style={{ position:"absolute", top:-2, right:-2, background:"#e05a3a", color:"#fff", borderRadius:"50%", minWidth:20, height:20, fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px", border:"2px solid #fff" }}>{totalQty>99?"99+":totalQty}</div>}
      </button>
      {totalQty>0 && <div style={{ position:"fixed", bottom:78, right:88, background:"#1a3a2a", color:"#fff", borderRadius:20, padding:"6px 14px", fontSize:13, fontWeight:700, boxShadow:"0 4px 16px rgba(0,0,0,0.2)", zIndex:100, pointerEvents:"none", display:"flex", alignItems:"center", gap:2 }}><PriceIcon size={12} />{totalPrice}</div>}

      {showCart && <CartSheet cartItems={cartItems} menuItems={menuItems} onAdd={addToCart} onSub={subFromCart} onClear={()=>setCart({})} onOrder={handleOrder} onClose={()=>setShowCart(false)} totalPrice={totalPrice} ordering={ordering} PriceIcon={PriceIcon} />}

      {toast && (
        <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", background:"#fff", borderRadius:20, padding:"28px 36px", textAlign:"center", boxShadow:"0 12px 48px rgba(0,0,0,0.15)", zIndex:400, minWidth:180, animation:"popIn 0.4s cubic-bezier(.22,.68,0,1.2) both" }}>
          <div style={{ width:52, height:52, borderRadius:"50%", background:"linear-gradient(135deg,#2d7a58,#5db88a)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", fontSize:24, color:"#fff" }}>✓</div>
          <div style={{ fontSize:16, fontWeight:700, color:"#1a3a2a" }}>下单成功！</div>
          <div style={{ fontSize:12, color:"#7a9a85", marginTop:4 }}>请稍等，正在备餐中</div>
        </div>
      )}
    </>
  );
}


// ─── 主 App ────────────────────────────────────────────────────
export default function App() {
  const [tab,          setTab]          = useState("menu");
  const [configs,      setConfigs]      = useState({});
  const [configLoaded, setConfigLoaded] = useState(false);
  const [showIconCfg,  setShowIconCfg]  = useState(false);
  const [logoPressed,  setLogoPressed]  = useState(false);
  const [session,      setSession]      = useState(undefined); // undefined=加载中, null=未登录, obj=已登录
  const [showUserMenu, setShowUserMenu] = useState(false);

  const logoTimer = useRef(null);
  const TITLE = { menu:"小胖菜单 ✦", admin:"订单管理", history:"历史订单", manage:"菜单管理", shopping:"采购备忘", pantry:"食材库存"};

  // ── 监听登录状态 ──
  useEffect(() => {
    if (DEV_MODE) {
      setSession({ user: { email: "dev@local", user_metadata: { full_name: "开发模式" } } });
      return;
    }
    // 获取当前 session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });
    // 监听后续变化（登录/退出）
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── 退出登录 ──
  const handleSignOut = async () => {
    setShowUserMenu(false);
    await supabase.auth.signOut();
  };

  // ── 加载配置 ──
  const loadConfigs = useCallback(async () => {
    const { data } = await supabase.from("app_config").select("key,value");
    const map = {};
    (data ?? []).forEach(r => { map[r.key] = r.value; });
    setConfigs(map);
    setConfigLoaded(true);
  }, []);

  // ── 白名单检查 ──
  const [allowed, setAllowed] = useState(undefined); // undefined=检查中, true/false

  useEffect(() => {
    if (!session) return;
    if (DEV_MODE) { setAllowed(true); loadConfigs(); return; }

    const email = session.user.email;
    supabase
      .from("allowed_users")
      .select("email")
      .eq("email", email)
      .maybeSingle()
      .then(({ data }) => {
        setAllowed(!!data);
        if (data) loadConfigs(); // 在白名单里才加载配置
      });
  }, [session, loadConfigs]);

  // ── 加载中（session 还未确认）──
  if (session === undefined) return (
    <div style={{ height:"100dvh", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(160deg,#e8f5ee,#e4f2f8)" }}>
      <div style={{ width:36, height:36, border:"3px solid rgba(45,122,88,0.2)", borderTopColor:"#2d7a58", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── 未登录 → 登录页 ──
  if (!session) return <AuthPage supabase={supabase} />;

  // ── 已登录但白名单检查中 ──
  if (allowed === undefined) return (
    <div style={{ height:"100dvh", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(160deg,#e8f5ee,#e4f2f8)" }}>
      <div style={{ width:36, height:36, border:"3px solid rgba(45,122,88,0.2)", borderTopColor:"#2d7a58", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── 不在白名单 → 无权限页 ──
  if (!allowed) return (
    <div style={{ height:"100dvh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"linear-gradient(160deg,#e8f5ee,#e4f2f8)", fontFamily:"'Noto Sans SC',sans-serif", padding:"0 32px", textAlign:"center" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;600;700&family=Noto+Serif+SC:wght@700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>
      <div style={{ fontSize:56, marginBottom:20 }}>🚫</div>
      <h2 style={{ fontSize:22, fontWeight:700, color:"#1a3a2a", fontFamily:"'Noto Serif SC',serif", marginBottom:10 }}>暂无访问权限</h2>
      <p style={{ fontSize:14, color:"#7a9a85", lineHeight:1.8, marginBottom:8 }}>
        你的账号 <strong style={{ color:"#2d7a58" }}>{session.user.email}</strong><br />
        尚未被添加到系统白名单
      </p>
      <p style={{ fontSize:13, color:"#aaa", marginBottom:32 }}>请联系管理员将你的邮箱加入白名单</p>
      <button
        onClick={() => supabase.auth.signOut()}
        style={{ padding:"10px 28px", background:"transparent", border:"1.5px solid rgba(45,122,88,0.3)", borderRadius:20, fontSize:13, color:"#2d7a58", cursor:"pointer", fontWeight:600 }}
      >
        切换账号
      </button>
    </div>
  );

  // ── 在白名单 → 正常 App ──
  const user = session.user;
  const userAvatar = user.user_metadata?.avatar_url;
  const userName   = user.user_metadata?.full_name ?? user.email;

  // 获取图标：有自定义图片就用图片，否则用默认 emoji
  const getTabIcon = (tabId, defaultEmoji) => {
    const url = configs[`icon_${tabId}`];
    if (url) return <img src={url} alt={tabId} style={{ width:32, height:32, objectFit:"contain" }} />;
    return <span style={{ fontSize:22, lineHeight:1 }}>{defaultEmoji}</span>;
  };

  // 价格图标：替换 ¥，有图片就显示图片，否则显示 ¥
  const PriceIcon = ({ size = 15 }) => {
    const url = configs["icon_price"];
    if (url) return <img src={url} alt="price" style={{ width: size, height: size, objectFit:"contain", verticalAlign:"middle", marginRight:1 }} />;
    return <span style={{ fontSize: size }}>¥</span>;
  };

  const logoUrl  = configs["icon_logo"];
  const rightUrl = configs["icon_right"];

  // 长按 Logo → 打开图标配置
  const handleLogoPress = () => {
    setLogoPressed(true);
    logoTimer.current = setTimeout(() => {
      setLogoPressed(false);
      setShowIconCfg(true);
    }, 1500);
  };
  const handleLogoRelease = () => {
    clearTimeout(logoTimer.current);
    setLogoPressed(false);
  };

  return (
    <div style={{ height:"100dvh", display:"flex", flexDirection:"column", background:"linear-gradient(160deg,#e8f5ee 0%,#f0faf4 40%,#e4f2f8 100%)", fontFamily:"'Noto Sans SC','PingFang SC',sans-serif", width:"100%", overflow:"hidden", position:"relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&family=Noto+Serif+SC:wght@700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{display:none;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes popIn{0%{transform:translate(-50%,-50%) scale(0.8);opacity:0}60%{transform:translate(-50%,-50%) scale(1.05)}100%{transform:translate(-50%,-50%) scale(1);opacity:1}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(0.88)}}
      `}</style>

      {/* 顶部标题栏 */}
      <div style={{ padding:"24px 16px 12px", background:"linear-gradient(180deg,rgba(45,122,88,0.1) 0%,transparent 100%)", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {/* 左上角 Logo，长按进入图标配置 */}
          <button
            onMouseDown={handleLogoPress} onMouseUp={handleLogoRelease}
            onTouchStart={handleLogoPress} onTouchEnd={handleLogoRelease}
            style={{
              width:56, height:56, borderRadius:16, overflow:"hidden",
              border:"none", background:"rgba(45,122,88,0.08)", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", padding:0, flexShrink:0,
              transform: logoPressed ? "scale(0.88)" : "scale(1)",
              transition:"transform 0.15s",
              boxShadow: logoPressed ? "0 0 0 3px rgba(45,122,88,0.3)" : "0 2px 8px rgba(45,122,88,0.12)",
            }}
            title="长按1.5秒配置图标"
          >
            {logoUrl
              ? <img src={logoUrl} alt="logo" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              : <span style={{ fontSize:30 }}>✦</span>
            }
          </button>

          {/* 标题 */}
          <h1 style={{ fontSize:22, fontWeight:700, color:"#1a3a2a", fontFamily:"'Noto Serif SC',serif", flex:1 }}>
            {TITLE[tab]}
          </h1>

          {/* 右上角装饰动图 */}
          <div style={{ width:56, height:56, borderRadius:16, overflow:"hidden", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background: rightUrl ? "transparent" : "rgba(45,122,88,0.06)", boxShadow: rightUrl ? "0 2px 8px rgba(45,122,88,0.12)" : "none" }}>
            {rightUrl
              ? <img src={rightUrl} alt="deco" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              : <span style={{ fontSize:28 }}>🌿</span>
            }
          </div>
        </div>

        {/* 用户信息栏 */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:10, padding:"7px 12px", background:"rgba(255,255,255,0.5)", borderRadius:12, backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.8)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {userAvatar
              ? <img src={userAvatar} alt="avatar" style={{ width:26, height:26, borderRadius:"50%", border:"2px solid rgba(45,122,88,0.2)" }} />
              : <div style={{ width:26, height:26, borderRadius:"50%", background:"linear-gradient(135deg,#2d7a58,#5db88a)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"#fff", fontWeight:700 }}>
                  {userName?.charAt(0)?.toUpperCase()}
                </div>
            }
            <span style={{ fontSize:12, color:"#3a5a46", fontWeight:500 }}>{userName}</span>
          </div>
          <button onClick={handleSignOut} style={{ fontSize:11, color:"#7a9a85", background:"none", border:"1px solid rgba(45,122,88,0.2)", borderRadius:8, padding:"3px 10px", cursor:"pointer" }}>
            退出
          </button>
        </div>
      </div>

      {/* 页面内容 */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {tab === "menu"     && <MenuPage       supabase={supabase} PriceIcon={PriceIcon} />}
        {tab === "admin"    && <AdminPage      supabase={supabase} />}
        {tab === "history"  && <HistoryPage    supabase={supabase} />}
        {tab === "manage"   && <MenuManagePage supabase={supabase} />}
        {tab === "shopping" && <ShoppingPage   supabase={supabase} />}
        {tab === "pantry" && <PantryPage supabase={supabase} />}
      </div>

      {/* 底部 Tab Bar */}
      <div style={{ flexShrink:0, background:"rgba(255,255,255,0.88)", backdropFilter:"blur(16px)", borderTop:"1px solid rgba(45,122,88,0.1)", display:"flex", paddingBottom:"env(safe-area-inset-bottom, 8px)", zIndex:50 }}>
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, padding:"10px 0 6px", border:"none", background:"transparent", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, position:"relative" }}>
              {/* 图标区域 36×36 */}
              <div style={{ width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", filter: active ? "none" : "grayscale(30%) opacity(0.65)", transition:"filter 0.2s, transform 0.15s", transform: active ? "scale(1.08)" : "scale(1)" }}>
                {configLoaded ? getTabIcon(t.id, t.defaultIcon) : <span style={{ fontSize:26 }}>{t.defaultIcon}</span>}
              </div>
              <span style={{ fontSize:11, fontWeight:active?700:400, color:active?"#2d7a58":"#aaa", transition:"color 0.2s", lineHeight:1 }}>{t.label}</span>
              {active && <div style={{ position:"absolute", bottom:0, left:"50%", transform:"translateX(-50%)", width:24, height:3, borderRadius:2, background:"#2d7a58" }} />}
            </button>
          );
        })}
      </div>

      {/* 图标配置弹窗 */}
      {showIconCfg && (
        <IconConfigModal
          supabase={supabase}
          configs={configs}
          onSave={newCfg => setConfigs(c => ({ ...c, ...newCfg }))}
          onClose={() => setShowIconCfg(false)}
        />
      )}
    </div>
  );
}
