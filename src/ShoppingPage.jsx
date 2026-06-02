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

// ─── 确认对话框（替换 confirm()） ─────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center",
    }} onClick={onCancel}>
      <div style={{
        background:"#fff", borderRadius:16, padding:"20px 24px", maxWidth:280, width:"90%",
        boxShadow:"0 8px 32px rgba(0,0,0,0.18)",
      }} onClick={e => e.stopPropagation()}>
        <p style={{ fontSize:14, color:"#333", margin:"0 0 16px", lineHeight:1.6 }}>{message}</p>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onCancel} style={{
            padding:"7px 16px", borderRadius:20, border:"1px solid #ddd",
            background:"#fff", color:"#666", fontSize:13, cursor:"pointer",
          }}>取消</button>
          <button onClick={onConfirm} style={{
            padding:"7px 16px", borderRadius:20, border:"none",
            background:"#e05a3a", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer",
          }}>确认清空</button>
        </div>
      </div>
    </div>
  );
}

// ─── 便签输入组件（去掉金额，只写内容） ───────────────────────
function StickyInput({ onAdd }) {
  const [text,  setText]  = useState("");
  const [color, setColor] = useState(0);

  const handleAdd = () => {
    const t = text.trim();
    if (!t) return;
    // 新增时不传 amount，金额等购物完成后填写
    onAdd({ content: t, color_idx: color });
    setText("");
  };

  const handleKey = (e) => {
    // Ctrl/Cmd + Enter 快捷提交
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleAdd();
  };

  const c = NOTE_COLORS[color];

  return (
    <div style={{ padding:"16px", flexShrink:0 }}>
      <div style={{
        background: c.bg,
        borderRadius: "2px 16px 16px 16px",
        padding: "16px",
        boxShadow: `3px 4px 12px ${c.shadow}, 0 1px 3px rgba(0,0,0,0.08)`,
        border: `1px solid ${c.border}`,
        position: "relative",
        transition: "background 0.3s, border 0.3s, box-shadow 0.3s",
      }}>
        {/* 折角 */}
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
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder={"写下要买的东西…\n例如：五花肉 2斤、西兰花 3颗"}
          rows={3}
          style={{
            width:"100%", background:"transparent", border:"none", outline:"none", resize:"none",
            fontSize:15, lineHeight:"28px", color:"#2a2a2a",
            fontFamily:"'Ma Shan Zheng','ZCOOL KuaiLe','Noto Sans SC',cursive",
            paddingTop:4, paddingLeft:4, position:"relative", zIndex:1,
            letterSpacing:"0.3px",
          }}
        />

        {/* 颜色选择 + 保存按钮 */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:8, position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", gap:5 }}>
            {NOTE_COLORS.map((nc, i) => (
              <button key={i} onClick={() => setColor(i)} style={{
                width:18, height:18, borderRadius:"50%",
                border: i===color ? "2px solid #333" : "2px solid transparent",
                background: nc.bg, cursor:"pointer", outline:"none",
                boxShadow: i===color ? "0 0 0 1px rgba(0,0,0,0.3)" : "none",
                transition:"transform 0.15s", transform: i===color ? "scale(1.2)" : "scale(1)",
                padding:0,
              }} />
            ))}
          </div>

          {/* 提示文字 */}
          <span style={{ fontSize:11, color:"#bbb", flex:1 }}>买完后再填金额 ✦</span>

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

// ─── 完成后填写金额的内联气泡 ──────────────────────────────────
function AmountBubble({ color, onSave, onSkip }) {
  const [val, setVal] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSave = () => {
    // 允许跳过（不填金额直接完成）
    onSave(val ? Number(val) : null);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") onSkip();
  };

  return (
    <div style={{
      marginTop:8, background:"rgba(255,255,255,0.85)", backdropFilter:"blur(8px)",
      borderRadius:12, padding:"10px 12px", border:`1px solid ${color.border}`,
      boxShadow:`0 4px 16px ${color.shadow}`,
      animation:"noteIn 0.2s cubic-bezier(.22,.68,0,1.2) both",
    }}>
      <div style={{ fontSize:11, color:"#7a9a85", marginBottom:6 }}>💰 买了多少钱？（可跳过）</div>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <div style={{
          display:"flex", alignItems:"center", gap:4,
          background:"rgba(255,255,255,0.9)", borderRadius:8,
          padding:"5px 10px", border:"1px solid rgba(0,0,0,0.1)", flex:1,
        }}>
          <span style={{ fontSize:13, color:"#888" }}>¥</span>
          <input
            ref={inputRef}
            type="number"
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={handleKey}
            placeholder="输入金额"
            style={{
              background:"transparent", border:"none", outline:"none",
              fontSize:14, color:"#333", width:"100%", fontFamily:"inherit",
            }}
          />
        </div>
        <button onClick={onSkip} style={{
          padding:"5px 10px", borderRadius:8, border:"1px solid #ddd",
          background:"#fff", color:"#aaa", fontSize:12, cursor:"pointer",
        }}>跳过</button>
        <button onClick={handleSave} style={{
          padding:"5px 14px", borderRadius:8, border:"none",
          background:"#2d7a58", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer",
          boxShadow:"0 2px 8px rgba(45,122,88,0.3)",
        }}>确认</button>
      </div>
    </div>
  );
}

// ─── 单张便签 ──────────────────────────────────────────────────
function StickyNote({ item, onComplete, onToggleBack, onDelete, onUpdateAmount }) {
  const c = NOTE_COLORS[item.color_idx ?? 0];
  const [pressing, setPressing] = useState(false);
  // 控制是否显示金额气泡（勾选完成后弹出）
  const [showAmountBubble, setShowAmountBubble] = useState(false);

  const handleCheckClick = () => {
    if (item.is_done) {
      // 已完成 → 撤回
      onToggleBack(item);
    } else {
      // 未完成 → 触发完成流程，弹出金额气泡
      setShowAmountBubble(true);
    }
  };

  const handleAmountSave = (amount) => {
    setShowAmountBubble(false);
    onComplete(item, amount); // 传入金额（可能为 null）
  };

  const handleAmountSkip = () => {
    setShowAmountBubble(false);
    onComplete(item, null); // 不填金额直接完成
  };

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
      // 展开金额气泡时撑开，不截断
      gridColumn: showAmountBubble ? "1 / -1" : undefined,
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

      <div style={{ position:"relative", zIndex:1 }}>
        <p style={{
          fontSize:14, lineHeight:"26px", color: item.is_done ? "#999" : "#2a2a2a",
          fontFamily:"'Ma Shan Zheng','ZCOOL KuaiLe','Noto Sans SC',cursive",
          textDecoration: item.is_done ? "line-through" : "none",
          textDecorationColor:"#aaa", margin:0, paddingLeft:4, whiteSpace:"pre-wrap",
          wordBreak:"break-all", letterSpacing:"0.3px",
        }}>{item.content}</p>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:10, color:"#bbb" }}>{formatDate(item.created_at)}</span>
            {item.amount > 0 && (
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
            {item.is_done ? (
                // 已完成：用不显眼的文字链接代替大按钮，避免误触
                <button onClick={() => onToggleBack(item)} style={{
                  fontSize: 11,
                  color: "#bbb",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 6px",
                  textDecoration: "underline",
                }}>撤回</button>
              ) : (
                // 未完成：正常的勾选圆圈
                <button onClick={handleCheckClick} style={{
                  width: 28, height: 28, borderRadius: "50%",
                  border: `1.5px solid ${c.border}`,
                  background: "rgba(255,255,255,0.6)",
                  color: c.line,
                  fontSize: 14, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                }}>○</button>
              )}
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

        {/* 金额填写气泡（勾选完成后显示） */}
        {showAmountBubble && (
          <AmountBubble
            color={c}
            onSave={handleAmountSave}
            onSkip={handleAmountSkip}
          />
        )}
      </div>
    </div>
  );
}

// ─── 统计面板 ──────────────────────────────────────────────────
function StatsPanel({ items }) {
  const [view, setView] = useState("week");

  // 统计已完成且有金额的
  const withAmount = items.filter(i => i.is_done && i.amount > 0);

  const grouped = {};
  withAmount.forEach(item => {
    const key = view === "week" ? getWeekKey(item.created_at) : getMonthKey(item.created_at);
    if (!grouped[key]) grouped[key] = { total:0, count:0 };
    grouped[key].total += Number(item.amount);
    grouped[key].count += 1;
  });

  const sortedKeys = Object.keys(grouped).sort((a,b) => b.localeCompare(a));
  const grandTotal = Object.values(grouped).reduce((s,g) => s+g.total, 0);
  const pendingTotal = items.filter(i => !i.is_done && i.amount > 0).reduce((s,i) => s+Number(i.amount), 0);

  if (items.length === 0) return null;

  return (
    <div style={{ margin:"0 16px 16px", background:"rgba(255,255,255,0.6)", backdropFilter:"blur(12px)", borderRadius:16, border:"1px solid rgba(255,255,255,0.9)", overflow:"hidden" }}>
      <div style={{ padding:"12px 16px 10px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid rgba(45,122,88,0.08)" }}>
        <div>
          <div style={{ fontSize:11, color:"#7a9a85", letterSpacing:1, marginBottom:2 }}>采购支出统计</div>
          <div style={{ fontSize:20, fontWeight:700, color:"#1a3a2a" }}>
            ¥{grandTotal.toFixed(0)}
            <span style={{ fontSize:12, color:"#7a9a85", fontWeight:400 }}> 已完成</span>
          </div>
          {pendingTotal > 0 && <div style={{ fontSize:12, color:"#e09030", marginTop:2 }}>待采购 ¥{pendingTotal.toFixed(0)}</div>}
        </div>
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
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [showDone, setShowDone] = useState(false);
  const [confirm,  setConfirm]  = useState(false); // 替代 window.confirm

  const loadItems = useCallback(async () => {
    setError(null);
    try {
      const { data, error } = await supabase
        .from("shopping_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setItems(data ?? []);
    } catch { setError("加载失败，请检查网络"); }
    finally { setLoading(false); }
  }, [supabase]);

  useEffect(() => { loadItems(); }, [loadItems]);

  // Realtime 订阅：统一走这里更新，handleAdd 不再手动 setItems
  useEffect(() => {
    const ch = supabase.channel("shopping-rt")
      .on("postgres_changes", { event:"*", schema:"public", table:"shopping_items" }, loadItems)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [supabase, loadItems]);

  // 新增：不再传入金额
  const handleAdd = async ({ content, color_idx }) => {
    await supabase
      .from("shopping_items")
      .insert({
        content,
        color_idx: color_idx ?? 0,
        amount: null,      // 金额初始为空
        is_done: false,
      });
    // 不手动 setItems，realtime 会触发 loadItems
  };

  // 完成：同时写入 is_done=true 和金额
  const handleComplete = async (item, amount) => {
    // 乐观更新，立即反映在 UI
    setItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, is_done: true, amount: amount ?? i.amount } : i
    ));
    await supabase
      .from("shopping_items")
      .update({ is_done: true, amount: amount ?? item.amount })
      .eq("id", item.id);
  };

  // 撤回完成状态
  const handleToggleBack = async (item) => {
    setItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, is_done: false } : i
    ));
    await supabase
      .from("shopping_items")
      .update({ is_done: false })
      .eq("id", item.id);
  };

  const deleteItem = async (id) => {
    setItems(prev => prev.filter(i => i.id !== id));
    await supabase.from("shopping_items").delete().eq("id", id);
  };

  const clearDone = async () => {
    const ids = items.filter(i => i.is_done).map(i => i.id);
    if (!ids.length) return;
    setConfirm(false);
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
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>

      {/* 确认对话框 */}
      {confirm && (
        <ConfirmDialog
          message={`清空 ${doneItems.length} 条已完成记录？数据会保留在统计中。`}
          onConfirm={clearDone}
          onCancel={() => setConfirm(false)}
        />
      )}

      <StickyInput onAdd={handleAdd} />
      <StatsPanel items={items} />

      <div style={{ flex:1, overflowY:"auto", padding:"0 16px 32px" }}>
        {error && (
          <div style={{ padding:"10px 14px", background:"#fff3f0", borderRadius:10, fontSize:13, color:"#c04040", marginBottom:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            {error}
            <button onClick={loadItems} style={{ fontSize:12, color:"#2d7a58", background:"none", border:"none", cursor:"pointer" }}>重试</button>
          </div>
        )}

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
                <StickyNote
                  key={item.id}
                  item={item}
                  onComplete={handleComplete}
                  onToggleBack={handleToggleBack}
                  onDelete={deleteItem}
                />
              ))}
            </div>
          </>
        )}

        {doneItems.length > 0 && (
          <>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <button onClick={()=>setShowDone(v=>!v)} style={{ fontSize:11, color:"#7a9a85", background:"none", border:"none", cursor:"pointer", letterSpacing:1, padding:0 }}>
                {showDone ? "▼" : "▶"} 已完成 · {doneItems.length} 项
              </button>
              {showDone && (
                <button onClick={() => setConfirm(true)} style={{ fontSize:11, color:"#e05a3a", background:"none", border:"none", cursor:"pointer", padding:0, fontWeight:600 }}>清空已完成</button>
              )}
            </div>
            {showDone && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {doneItems.map(item => (
                  <StickyNote
                    key={item.id}
                    item={item}
                    onComplete={handleComplete}
                    onToggleBack={handleToggleBack}
                    onDelete={deleteItem}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
