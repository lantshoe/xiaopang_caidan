import { useState, useEffect, useCallback, useRef } from "react";

// ─── 便签颜色主题 ──────────────────────────────────────────────
const NOTE_COLORS = [
  { bg: "#fef9c3", border: "#f5e642", shadow: "rgba(245,230,66,0.3)",  line: "#f0d800" },
  { bg: "#dcfce7", border: "#86efac", shadow: "rgba(134,239,172,0.3)", line: "#4ade80" },
  { bg: "#fce7f3", border: "#f9a8d4", shadow: "rgba(249,168,212,0.3)", line: "#f472b6" },
  { bg: "#dbeafe", border: "#93c5fd", shadow: "rgba(147,197,253,0.3)", line: "#60a5fa" },
  { bg: "#ffe4e6", border: "#fca5a5", shadow: "rgba(252,165,165,0.3)", line: "#f87171" },
  { bg: "#f3e8ff", border: "#d8b4fe", shadow: "rgba(216,180,254,0.3)", line: "#c084fc" },
];

function hashStr(s) { let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))&0xffff; return h; }
function noteColor(id) { return NOTE_COLORS[hashStr(id) % NOTE_COLORS.length]; }

function formatDate(ts) {
  const d = new Date(ts);
  return `${d.getMonth()+1}月${d.getDate()}日 ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function getWeekKey(ts) {
  const d = new Date(ts);
  const day = d.getDay() || 7;
  const mon = new Date(d); mon.setDate(d.getDate() - day + 1);
  return `${mon.getFullYear()}-W${String(Math.ceil((((mon - new Date(mon.getFullYear(),0,1))/86400000)+1)/7)).padStart(2,"0")}`;
}

function getMonthKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}

function getWeekLabel(key) {
  const [y, w] = key.split("-W");
  return `${y}年 第${w}周`;
}

function getMonthLabel(key) {
  const [y, m] = key.split("-");
  return `${y}年${parseInt(m)}月`;
}

// ─── 便签输入组件 ──────────────────────────────────────────────
function StickyInput({ onAdd }) {
  const [text,   setText]   = useState("");
  const [amount, setAmount] = useState("");
  const [color,  setColor]  = useState(0);
  const textRef = useRef(null);

  const handleAdd = () => {
    const t = text.trim();
    if (!t) return;
    onAdd({ content: t, amount: amount ? Number(amount) : null, color_idx: color });
    setText(""); setAmount("");
  };

  const c = NOTE_COLORS[color];

  return (
    <div style={{ padding:"16px", flexShrink:0 }}>
      {/* 便签输入区域 */}
      <div style={{
        background: c.bg,
        borderRadius: "2px 16px 16px 16px",
        padding: "16px",
        boxShadow: `3px 4px 12px ${c.shadow}, 0 1px 3px rgba(0,0,0,0.08)`,
        border: `1px solid ${c.border}`,
        position: "relative",
        transition: "background 0.3s, border 0.3s, box-shadow 0.3s",
      }}>
        {/* 折角效果 */}
        <div style={{
          position:"absolute", top:0, left:0, width:0, height:0,
          borderStyle:"solid", borderWidth:"18px 18px 0 0",
          borderColor: `${c.border} transparent transparent transparent`,
          borderRadius:"2px 0 0 0",
          filter:"drop-shadow(1px 1px 1px rgba(0,0,0,0.1))",
        }} />

        {/* 便签线条背景 */}
        <div style={{
          position:"absolute", inset:0, borderRadius:"inherit", overflow:"hidden", pointerEvents:"none",
          backgroundImage: `repeating-linear-gradient(transparent, transparent 27px, ${c.line}40 27px, ${c.line}40 28px)`,
          backgroundPositionY: "36px",
        }} />

        {/* 文本输入 */}
        <textarea
          ref={textRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={"写下采购内容…\n例如：五花肉 2斤、西兰花 3颗"}
          rows={3}
          style={{
            width:"100%", background:"transparent", border:"none", outline:"none", resize:"none",
            fontSize:15, lineHeight:"28px", color:"#2a2a2a",
            fontFamily:"'Ma Shan Zheng','ZCOOL KuaiLe','Noto Sans SC',cursive",
            paddingTop:4, paddingLeft:4, position:"relative", zIndex:1,
            letterSpacing:"0.3px",
          }}
        />

        {/* 金额 + 颜色选择 + 保存按钮 */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:8, position:"relative", zIndex:1 }}>
          {/* 颜色选择 */}
          <div style={{ display:"flex", gap:5 }}>
            {NOTE_COLORS.map((nc, i) => (
              <button key={i} onClick={() => setColor(i)} style={{
                width:18, height:18, borderRadius:"50%", border: i===color ? "2px solid #333" : "2px solid transparent",
                background: nc.bg, cursor:"pointer", outline:"none",
                boxShadow: i===color ? "0 0 0 1px rgba(0,0,0,0.3)" : "none",
                transition:"transform 0.15s", transform: i===color ? "scale(1.2)" : "scale(1)",
                padding:0,
              }} />
            ))}
          </div>

          {/* 金额输入 */}
          <div style={{ display:"flex", alignItems:"center", gap:4, background:"rgba(255,255,255,0.6)", borderRadius:8, padding:"4px 10px", border:"1px solid rgba(0,0,0,0.08)", flex:1 }}>
            <span style={{ fontSize:13, color:"#888" }}>¥</span>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="金额（可选）"
              style={{ background:"transparent", border:"none", outline:"none", fontSize:13, color:"#333", width:"100%", fontFamily:"inherit" }}
            />
          </div>

          {/* 保存按钮 */}
          <button onClick={handleAdd} disabled={!text.trim()} style={{
            padding:"6px 18px", borderRadius:20,
            background: text.trim() ? "#2d7a58" : "#ccc",
            color:"#fff", border:"none", fontSize:13, fontWeight:700,
            cursor: text.trim() ? "pointer" : "not-allowed",
            boxShadow: text.trim() ? "0 3px 10px rgba(45,122,88,0.35)" : "none",
            transition:"all 0.2s", flexShrink:0,
          }}>贴上去 ✦</button>
        </div>
      </div>
    </div>
  );
}

// ─── 单张便签 ──────────────────────────────────────────────────
function StickyNote({ item, onToggle, onDelete }) {
  const c = NOTE_COLORS[item.color_idx ?? 0];
  const [pressing, setPressing] = useState(false);

  return (
    <div style={{
      background: item.is_done ? "#f5f5f0" : c.bg,
      border: `1px solid ${item.is_done ? "#e0e0d8" : c.border}`,
      borderRadius: "2px 14px 14px 14px",
      padding:"14px 14px 12px",
      boxShadow: item.is_done
        ? "1px 2px 6px rgba(0,0,0,0.06)"
        : `2px 4px 12px ${c.shadow}, 0 1px 3px rgba(0,0,0,0.07)`,
      position:"relative", overflow:"hidden",
      transition:"all 0.35s ease",
      transform: pressing ? "scale(0.97)" : "scale(1)",
      opacity: item.is_done ? 0.65 : 1,
      animation: "noteIn 0.3s cubic-bezier(.22,.68,0,1.2) both",
    }}
      onMouseDown={() => setPressing(true)}
      onMouseUp={() => setPressing(false)}
      onMouseLeave={() => setPressing(false)}
    >
      {/* 折角 */}
      <div style={{
        position:"absolute", top:0, left:0, width:0, height:0,
        borderStyle:"solid", borderWidth:"14px 14px 0 0",
        borderColor: `${item.is_done ? "#e0e0d8" : c.border} transparent transparent transparent`,
      }} />

      {/* 线条背景 */}
      {!item.is_done && (
        <div style={{
          position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden",
          backgroundImage: `repeating-linear-gradient(transparent, transparent 27px, ${c.line}35 27px, ${c.line}35 28px)`,
          backgroundPositionY:"36px",
        }} />
      )}

      {/* 内容 */}
      <div style={{ position:"relative", zIndex:1 }}>
        <p style={{
          fontSize:14, lineHeight:"26px", color: item.is_done ? "#999" : "#2a2a2a",
          fontFamily:"'Ma Shan Zheng','ZCOOL KuaiLe','Noto Sans SC',cursive",
          textDecoration: item.is_done ? "line-through" : "none",
          textDecorationColor:"#aaa", margin:0, paddingLeft:4, whiteSpace:"pre-wrap",
          wordBreak:"break-all", letterSpacing:"0.3px",
        }}>{item.content}</p>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {/* 时间 */}
            <span style={{ fontSize:10, color:"#bbb" }}>{formatDate(item.created_at)}</span>
            {/* 金额标签 */}
            {item.amount && (
              <span style={{
                fontSize:12, fontWeight:700,
                color: item.is_done ? "#aaa" : "#2d7a58",
                background: item.is_done ? "#eee" : "rgba(45,122,88,0.1)",
                padding:"2px 8px", borderRadius:20,
                textDecoration: item.is_done ? "line-through" : "none",
              }}>¥{item.amount}</span>
            )}
          </div>

          <div style={{ display:"flex", gap:6 }}>
            {/* 勾选完成 */}
            <button onClick={() => onToggle(item)} style={{
              width:28, height:28, borderRadius:"50%",
              border: item.is_done ? "none" : `1.5px solid ${c.border}`,
              background: item.is_done ? "#2d7a58" : "rgba(255,255,255,0.6)",
              color: item.is_done ? "#fff" : c.line,
              fontSize:14, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              transition:"all 0.2s", boxShadow: item.is_done ? "0 2px 6px rgba(45,122,88,0.3)" : "none",
            }}>{item.is_done ? "✓" : "○"}</button>

            {/* 删除 */}
            <button onClick={() => onDelete(item.id)} style={{
              width:28, height:28, borderRadius:"50%",
              border:"none", background:"rgba(255,255,255,0.5)",
              color:"#ccc", fontSize:14, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              transition:"color 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.color="#e05a3a"}
              onMouseLeave={e => e.currentTarget.style.color="#ccc"}
            >✕</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 统计面板 ──────────────────────────────────────────────────
function StatsPanel({ items }) {
  const [view, setView] = useState("week"); // week | month

  // 只统计有金额且已完成的
  const withAmount = items.filter(i => i.is_done && i.amount > 0);

  // 分组
  const grouped = {};
  withAmount.forEach(item => {
    const key = view === "week" ? getWeekKey(item.created_at) : getMonthKey(item.created_at);
    if (!grouped[key]) grouped[key] = { total:0, count:0 };
    grouped[key].total += Number(item.amount);
    grouped[key].count += 1;
  });

  const sortedKeys = Object.keys(grouped).sort((a,b) => b.localeCompare(a));
  const grandTotal = Object.values(grouped).reduce((s,g) => s+g.total, 0);

  // 未完成合计
  const pendingTotal = items.filter(i => !i.is_done && i.amount > 0).reduce((s,i) => s+Number(i.amount), 0);

  if (items.length === 0) return null;

  return (
    <div style={{ margin:"0 16px 16px", background:"rgba(255,255,255,0.6)", backdropFilter:"blur(12px)", borderRadius:16, border:"1px solid rgba(255,255,255,0.9)", overflow:"hidden" }}>
      {/* 头部 */}
      <div style={{ padding:"12px 16px 10px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid rgba(45,122,88,0.08)" }}>
        <div>
          <div style={{ fontSize:11, color:"#7a9a85", letterSpacing:1, marginBottom:2 }}>采购支出统计</div>
          <div style={{ fontSize:20, fontWeight:700, color:"#1a3a2a" }}>¥{grandTotal.toFixed(0)} <span style={{ fontSize:12, color:"#7a9a85", fontWeight:400 }}>已完成</span></div>
          {pendingTotal > 0 && <div style={{ fontSize:12, color:"#e09030", marginTop:2 }}>待采购 ¥{pendingTotal.toFixed(0)}</div>}
        </div>
        {/* 周/月切换 */}
        <div style={{ display:"flex", background:"rgba(45,122,88,0.08)", borderRadius:20, padding:3, gap:2 }}>
          {[["week","按周"],["month","按月"]].map(([v,l]) => (
            <button key={v} onClick={()=>setView(v)} style={{
              padding:"5px 12px", borderRadius:17, border:"none", cursor:"pointer", fontSize:11,
              background: view===v ? "#2d7a58" : "transparent",
              color: view===v ? "#fff" : "#7a9a85",
              fontWeight: view===v ? 600 : 400, transition:"all 0.2s",
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* 分组列表 */}
      {sortedKeys.length === 0 ? (
        <div style={{ padding:"14px 16px", fontSize:12, color:"#bbb", textAlign:"center" }}>完成采购并记录金额后显示统计</div>
      ) : sortedKeys.map((key, i) => {
        const g = grouped[key];
        const label = view === "week" ? getWeekLabel(key) : getMonthLabel(key);
        const maxVal = Math.max(...Object.values(grouped).map(g=>g.total));
        const pct = maxVal > 0 ? (g.total / maxVal * 100) : 0;
        return (
          <div key={key} style={{ padding:"10px 16px", borderBottom: i < sortedKeys.length-1 ? "1px solid rgba(45,122,88,0.06)" : "none" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
              <span style={{ fontSize:12, color:"#7a9a85" }}>{label}</span>
              <div style={{ textAlign:"right" }}>
                <span style={{ fontSize:14, fontWeight:700, color:"#1a3a2a" }}>¥{g.total.toFixed(0)}</span>
                <span style={{ fontSize:11, color:"#aaa", marginLeft:6 }}>{g.count}笔</span>
              </div>
            </div>
            {/* 进度条 */}
            <div style={{ height:4, borderRadius:2, background:"rgba(45,122,88,0.1)", overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:2, background:"linear-gradient(90deg,#2d7a58,#5db88a)", width:`${pct}%`, transition:"width 0.5s ease" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 主组件 ────────────────────────────────────────────────────
export default function ShoppingPage({ supabase }) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [showDone, setShowDone] = useState(false);

  const loadItems = useCallback(async () => {
    setError(null);
    try {
      const { data, error } = await supabase
        .from("shopping_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setItems(data ?? []);
    } catch { setError("加载失败"); }
    finally { setLoading(false); }
  }, [supabase]);

  useEffect(() => { loadItems(); }, [loadItems]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel("shopping-rt")
      .on("postgres_changes", { event:"*", schema:"public", table:"shopping_items" }, loadItems)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [supabase, loadItems]);

  const handleAdd = async ({ content, amount, color_idx }) => {
    const { data, error } = await supabase
      .from("shopping_items")
      .insert({ content, amount, color_idx, is_done: false })
      .select().single();
    if (!error && data) setItems(prev => [data, ...prev]);
  };

  const toggleItem = async (item) => {
    const newVal = !item.is_done;
    setItems(prev => prev.map(i => i.id===item.id ? {...i, is_done:newVal} : i));
    await supabase.from("shopping_items").update({ is_done: newVal }).eq("id", item.id);
  };

  const deleteItem = async (id) => {
    setItems(prev => prev.filter(i => i.id !== id));
    await supabase.from("shopping_items").delete().eq("id", id);
  };

  const clearDone = async () => {
    const ids = items.filter(i => i.is_done).map(i => i.id);
    if (!ids.length || !confirm(`清空 ${ids.length} 条已完成记录？金额将仍保留在统计中。`)) return;
    // 不真删，标记 archived（保留统计数据）
    setItems(prev => prev.filter(i => !i.is_done));
    await supabase.from("shopping_items").delete().in("id", ids);
  };

  const todoItems = items.filter(i => !i.is_done);
  const doneItems = items.filter(i => i.is_done);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", flex:1 }}>
      <div style={{ width:28, height:28, border:"3px solid rgba(45,122,88,0.2)", borderTopColor:"#2d7a58", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=ZCOOL+KuaiLe&display=swap');
        @keyframes noteIn { from { opacity:0; transform:translateY(-8px) rotate(-1deg); } to { opacity:1; transform:translateY(0) rotate(0deg); } }
      `}</style>

      {/* 便签输入区 */}
      <StickyInput onAdd={handleAdd} />

      {/* 统计面板 */}
      <StatsPanel items={items} />

      {/* 列表区 */}
      <div style={{ flex:1, overflowY:"auto", padding:"0 16px 32px" }}>
        {error && <div style={{ padding:"10px 14px", background:"#fff3f0", borderRadius:10, fontSize:13, color:"#c04040", marginBottom:10 }}>{error}</div>}

        {/* 待完成便签 */}
        {todoItems.length === 0 && doneItems.length === 0 && (
          <div style={{ textAlign:"center", padding:"40px 0", color:"#7a9a85" }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🛒</div>
            <div style={{ fontSize:14, fontFamily:"'Ma Shan Zheng',cursive" }}>在上方写下需要采购的东西吧～</div>
          </div>
        )}

        {todoItems.length > 0 && (
          <>
            <div style={{ fontSize:11, color:"#7a9a85", marginBottom:10, letterSpacing:1 }}>待采购 · {todoItems.length} 项</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              {todoItems.map(item => (
                <StickyNote key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />
              ))}
            </div>
          </>
        )}

        {/* 已完成区 */}
        {doneItems.length > 0 && (
          <>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <button onClick={()=>setShowDone(v=>!v)} style={{ fontSize:11, color:"#7a9a85", background:"none", border:"none", cursor:"pointer", letterSpacing:1, padding:0 }}>
                {showDone ? "▼" : "▶"} 已完成 · {doneItems.length} 项
              </button>
              {showDone && (
                <button onClick={clearDone} style={{ fontSize:11, color:"#e05a3a", background:"none", border:"none", cursor:"pointer", padding:0, fontWeight:600 }}>清空已完成</button>
              )}
            </div>
            {showDone && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {doneItems.map(item => (
                  <StickyNote key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

