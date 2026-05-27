import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import AdminPage from "./AdminPage";
import ShoppingPage from "./ShoppingPage";
import HistoryPage from "./HistoryPage";
import MenuManagePage from "./MenuManagePage";

// ─── Supabase 初始化 ───────────────────────────────────────────
const SUPABASE_URL  = "https://your-project.supabase.co";
const SUPABASE_ANON = "your-anon-key";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ─── 常量 ──────────────────────────────────────────────────────
const PALETTE = [
  { bg:"#d4ede3", fg:"#2d7a58" }, { bg:"#fde8d8", fg:"#c4622d" },
  { bg:"#dde8f5", fg:"#2c5f8a" }, { bg:"#f0e6f5", fg:"#7040a0" },
  { bg:"#fdf0d5", fg:"#a07030" }, { bg:"#e5f0e0", fg:"#3a7030" },
];
function hashId(str) { let h=0; for(let i=0;i<str.length;i++) h=(h*31+str.charCodeAt(i))&0xffff; return h; }
function pal(id) { return PALETTE[hashId(id) % PALETTE.length]; }
function generateOrderNo() {
  const d=new Date(), pad=n=>String(n).padStart(2,"0");
  return `ORD-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${String(Math.floor(Math.random()*1000)).padStart(3,"0")}`;
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

function ItemCard({ item, qty, onAdd, onSub }) {
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
          <span style={{ fontSize:15, fontWeight:700, color:"#2d7a58" }}>¥{item.price}</span>
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

function CartSheet({ cartItems, menuItems, onAdd, onSub, onClear, onOrder, onClose, totalPrice, ordering }) {
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
          {cartItems.length === 0 ? <div style={{ textAlign:"center", padding:32, color:"#aaa", fontSize:14 }}>购物车是空的</div>
          : cartItems.map(({ id, qty }) => {
            const item = menuItems.find(m=>m.id===id); if (!item) return null;
            const p = pal(id);
            return (
              <div key={id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:"1px solid #f0f5f2" }}>
                <div style={{ width:40, height:40, borderRadius:10, background:p.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:p.fg, fontFamily:"'Noto Serif SC',serif", flexShrink:0 }}>{item.name.charAt(0)}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#1a3a2a" }}>{item.name}</div>
                  <div style={{ fontSize:12, color:"#2d7a58", fontWeight:700 }}>¥{item.price}</div>
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
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <span style={{ color:"#7a9a85", fontSize:14 }}>合计</span>
              <span style={{ fontSize:20, fontWeight:700, color:"#1a3a2a" }}>¥{totalPrice}</span>
            </div>
            <button onClick={onOrder} disabled={ordering} style={{ width:"100%", padding:15, background: ordering?"#aaa":"linear-gradient(135deg,#2d7a58,#3a9068)", color:"#fff", border:"none", borderRadius:16, fontSize:16, fontWeight:700, cursor: ordering?"not-allowed":"pointer", boxShadow: ordering?"none":"0 4px 20px rgba(45,122,88,0.4)", letterSpacing:"0.5px" }}>
              {ordering ? "下单中..." : "确认下单"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 菜单页 ────────────────────────────────────────────────────
function MenuPage({ supabase }) {
  const [categories, setCategories] = useState([]);
  const [menuItems,  setMenuItems]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [activeCat,  setActiveCat]  = useState(null);
  const [cart,       setCart]       = useState({});
  const [showCart,   setShowCart]   = useState(false);
  const [toast,      setToast]      = useState(false);
  const [ordering,   setOrdering]   = useState(false);
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
      setCategories(cats??[]); setMenuItems(items??[]);
      if (cats?.length) setActiveCat(cats[0].id);
    } catch { setError("菜单加载失败"); }
    finally { setLoading(false); }
  }, [supabase]);

  useEffect(() => { loadMenu(); }, [loadMenu]);

  const addToCart   = id => setCart(c => ({ ...c, [id]: (c[id]||0)+1 }));
  const subFromCart = id => setCart(c => { const n={...c,[id]:(c[id]||1)-1}; if(n[id]===0) delete n[id]; return n; });
  const cartItems   = Object.entries(cart).map(([id,qty])=>({ id, qty }));
  const totalQty    = cartItems.reduce((s,{qty})=>s+qty, 0);
  const totalPrice  = cartItems.reduce((s,{id,qty})=>{ const m=menuItems.find(m=>m.id===id); return s+(m?Number(m.price)*qty:0); },0).toFixed(2);

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

  const handleCatClick = id => {
    setActiveCat(id); scrollingByClick.current=true;
    const el=catRefs.current[id];
    if (el&&rightRef.current) rightRef.current.scrollTo({ top:el.offsetTop-8, behavior:"smooth" });
    setTimeout(()=>{ scrollingByClick.current=false; },700);
  };

  const handleRightScroll = () => {
    if (scrollingByClick.current) return;
    const ct=rightRef.current; if (!ct) return;
    let cur=categories[0]?.id;
    for (const cat of categories) { const el=catRefs.current[cat.id]; if (el&&el.offsetTop-16<=ct.scrollTop) cur=cat.id; }
    setActiveCat(cur);
  };

  if (loading) return <Spinner />;
  if (error)   return <div style={{ margin:16, padding:"14px 16px", background:"#fff3f0", borderRadius:12, border:"1px solid #fcc", display:"flex", justifyContent:"space-between" }}><span style={{ fontSize:13, color:"#c04040" }}>{error}</span><button onClick={loadMenu} style={{ fontSize:12, color:"#2d7a58", border:"none", background:"none", cursor:"pointer", fontWeight:600 }}>重试</button></div>;

  return (
    <>
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        {/* 左侧分类 */}
        <div style={{ width:68, flexShrink:0, overflowY:"auto", background:"rgba(255,255,255,0.35)", backdropFilter:"blur(10px)", borderRight:"1px solid rgba(45,122,88,0.1)", display:"flex", flexDirection:"column", gap:2, padding:"8px 4px" }}>
          {categories.map(cat => {
            const active = activeCat===cat.id;
            return (
              <button key={cat.id} onClick={()=>handleCatClick(cat.id)} style={{ width:"100%", padding:"12px 4px", border:"none", cursor:"pointer", borderRadius:12, display:"flex", flexDirection:"column", alignItems:"center", gap:4, background:active?"rgba(45,122,88,0.12)":"transparent", position:"relative" }}>
                {active && <div style={{ position:"absolute", left:0, top:"50%", transform:"translateY(-50%)", width:3, height:24, borderRadius:"0 3px 3px 0", background:"#2d7a58" }} />}
                <span style={{ fontSize:16, color:active?"#2d7a58":"#7a9a85" }}>{cat.icon}</span>
                <span style={{ fontSize:11, fontWeight:active?600:400, color:active?"#2d7a58":"#7a9a85", lineHeight:1.2 }}>{cat.name}</span>
              </button>
            );
          })}
        </div>
        {/* 右侧菜品 */}
        <div ref={rightRef} onScroll={handleRightScroll} style={{ flex:1, overflowY:"auto", padding:"0 12px 120px" }}>
          {categories.map(cat => (
            <div key={cat.id} ref={el=>catRefs.current[cat.id]=el}>
              <div style={{ padding:"16px 0 4px", fontSize:13, fontWeight:600, color:"#2d7a58", display:"flex", alignItems:"center", gap:6, position:"sticky", top:0, background:"linear-gradient(180deg,rgba(240,250,244,0.97) 70%,transparent 100%)", backdropFilter:"blur(4px)", zIndex:1 }}>
                <span>{cat.icon}</span><span>{cat.name}</span>
                <span style={{ fontSize:11, color:"#aaa", fontWeight:400 }}>({menuItems.filter(m=>m.category_id===cat.id).length})</span>
              </div>
              {menuItems.filter(m=>m.category_id===cat.id).map(item=>(
                <ItemCard key={item.id} item={item} qty={cart[item.id]||0} onAdd={()=>addToCart(item.id)} onSub={()=>subFromCart(item.id)} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* FAB */}
      <button onClick={()=>setShowCart(true)} style={{ position:"fixed", bottom:28, right:20, width:60, height:60, borderRadius:"50%", background:totalQty>0?"linear-gradient(135deg,#2d7a58,#3a9068)":"rgba(255,255,255,0.85)", border:totalQty>0?"none":"1.5px solid rgba(45,122,88,0.25)", backdropFilter:"blur(12px)", boxShadow:totalQty>0?"0 6px 24px rgba(45,122,88,0.45)":"0 4px 16px rgba(0,0,0,0.1)", cursor:"pointer", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:24 }}>🛒</span>
        {totalQty>0 && <div style={{ position:"absolute", top:-2, right:-2, background:"#e05a3a", color:"#fff", borderRadius:"50%", minWidth:20, height:20, fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px", border:"2px solid #fff" }}>{totalQty>99?"99+":totalQty}</div>}
      </button>
      {totalQty>0 && <div style={{ position:"fixed", bottom:34, right:88, background:"#1a3a2a", color:"#fff", borderRadius:20, padding:"6px 14px", fontSize:13, fontWeight:700, boxShadow:"0 4px 16px rgba(0,0,0,0.2)", zIndex:100, pointerEvents:"none", animation:"fadeIn 0.2s ease" }}>¥{totalPrice}</div>}

      {showCart && <CartSheet cartItems={cartItems} menuItems={menuItems} onAdd={addToCart} onSub={subFromCart} onClear={()=>setCart({})} onOrder={handleOrder} onClose={()=>setShowCart(false)} totalPrice={totalPrice} ordering={ordering} />}

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

// ─── TABS 配置 ─────────────────────────────────────────────────
const TABS = [
  { id:"menu",     label:"点单", icon:"🍽" },
  { id:"admin",    label:"订单", icon:"📋" },
  { id:"history",  label:"历史", icon:"🕐" },
  { id:"manage",   label:"菜单", icon:"⚙️" },
  { id:"shopping", label:"采购", icon:"🛒" },
];

// ─── 主 App ────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("menu");

  const TITLE = { menu:"今日菜单 ✦", admin:"订单管理", history:"历史订单", manage:"菜单管理", shopping:"采购备忘" };

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
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(224,144,48,0.4)}70%{box-shadow:0 0 0 8px rgba(224,144,48,0)}}
      `}</style>

      {/* 顶部标题栏 */}
      <div style={{ padding:"48px 16px 12px", background:"linear-gradient(180deg,rgba(45,122,88,0.1) 0%,transparent 100%)", flexShrink:0 }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:"#1a3a2a", fontFamily:"'Noto Serif SC',serif" }}>{TITLE[tab]}</h1>
      </div>

      {/* 页面内容 */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {tab === "menu"     && <MenuPage       supabase={supabase} />}
        {tab === "admin"    && <AdminPage      supabase={supabase} />}
        {tab === "history"  && <HistoryPage    supabase={supabase} />}
        {tab === "manage"   && <MenuManagePage supabase={supabase} />}
        {tab === "shopping" && <ShoppingPage   supabase={supabase} />}
      </div>

      {/* 底部 Tab Bar */}
      <div style={{ flexShrink:0, background:"rgba(255,255,255,0.85)", backdropFilter:"blur(16px)", borderTop:"1px solid rgba(45,122,88,0.1)", display:"flex", paddingBottom:"env(safe-area-inset-bottom, 8px)" }}>
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, padding:"10px 0 6px", border:"none", background:"transparent", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, transition:"all 0.2s" }}>
              <span style={{ fontSize:22, lineHeight:1 }}>{t.icon}</span>
              <span style={{ fontSize:11, fontWeight:active?600:400, color:active?"#2d7a58":"#aaa", transition:"color 0.2s" }}>{t.label}</span>
              {active && <div style={{ width:20, height:2, borderRadius:1, background:"#2d7a58", marginTop:1 }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
