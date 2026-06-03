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

// ─── 解析便签文本为条目数组 ────────────────────────────────────
function parseItems(content) {
  return content
    .split(/[、，,\n]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

// ─── 确认对话框 ───────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center",
    }} onClick={onCancel}>
      <div style={{
        background:"#fff", borderRadius:16, padding:"20px 24px", maxWidth:280, width:"90%",
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

// ─── 底部弹窗：新增 / 编辑便签 ───────────────────────────────
function AddSheet({ onAdd, onClose, editItem, onEdit }) {
  const isEdit = !!editItem;
  const [text,  setText]  = useState(isEdit ? editItem.content : "");
  const [color, setColor] = useState(isEdit ? (editItem.color_idx ?? 0) : 0);
  const textRef = useRef(null);

  useEffect(() => { setTimeout(() => textRef.current?.focus(), 100); }, []);

  const handleSubmit = () => {
    const t = text.trim();
    if (!t) return;
    if (isEdit) {
      onEdit({ ...editItem, content: t, color_idx: color });
    } else {
      onAdd({ content: t, color_idx: color });
    }
    onClose();
  };

  const handleKey = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleSubmit();
    if (e.key === "Escape") onClose();
  };

  const c = NOTE_COLORS[color];

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:500, display:"flex", alignItems:"flex-end",
    }} onClick={onClose}>
      <div style={{
        position:"absolute", inset:0, background:"rgba(0,0,0,0.4)", backdropFilter:"blur(3px)",
      }} />
      <div style={{
        position:"relative", width:"100%", background:"#f4faf7",
        borderRadius:"20px 20px 0 0", padding:"16px 16px 40px",
        animation:"slideUp 0.3s cubic-bezier(.22,.68,0,1.2) both", zIndex:1,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ width:36, height:4, borderRadius:2, background:"rgba(45,122,88,0.2)", margin:"0 auto 16px" }} />
        <div style={{ fontSize:14, fontWeight:700, color:"#1a3a2a", marginBottom:12 }}>
          {isEdit ? "修改便签" : "新建采购便签"}
        </div>
        <div style={{
          background:c.bg, border:`1px solid ${c.border}`,
          borderRadius:"2px 16px 16px 16px", padding:"14px 14px 12px",
          position:"relative", marginBottom:12, transition:"background 0.3s, border 0.3s",
        }}>
          <div style={{
            position:"absolute", top:0, left:0, width:0, height:0, borderStyle:"solid",
            borderWidth:"16px 16px 0 0", borderColor:`${c.border} transparent transparent transparent`,
          }} />
          <div style={{
            position:"absolute", inset:0, borderRadius:"inherit", overflow:"hidden", pointerEvents:"none",
            backgroundImage:`repeating-linear-gradient(transparent, transparent 27px, ${c.line}40 27px, ${c.line}40 28px)`,
            backgroundPositionY:"36px",
          }} />
          <textarea
            ref={textRef} value={text}
            onChange={e => setText(e.target.value)} onKeyDown={handleKey}
            placeholder={"写下要买的东西…\n多样东西用顿号或换行分隔\n例如：五花肉 2斤、西兰花 3颗"}
            rows={4}
            style={{
              width:"100%", background:"transparent", border:"none", outline:"none", resize:"none",
              fontSize:15, lineHeight:"28px", color:"#2a2a2a",
              fontFamily:"'Ma Shan Zheng','ZCOOL KuaiLe','Noto Sans SC',cursive",
              paddingTop:4, paddingLeft:4, position:"relative", zIndex:1, letterSpacing:"0.3px",
            }}
          />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ display:"flex", gap:6 }}>
            {NOTE_COLORS.map((nc, i) => (
              <button key={i} onClick={() => setColor(i)} style={{
                width:20, height:20, borderRadius:"50%",
                border: i===color ? "2px solid #333" : "2px solid transparent",
                background:nc.bg, cursor:"pointer", outline:"none",
                boxShadow: i===color ? "0 0 0 1px rgba(0,0,0,0.3)" : "none",
                transform: i===color ? "scale(1.2)" : "scale(1)",
                transition:"transform 0.15s", padding:0,
              }} />
            ))}
          </div>
          <div style={{ flex:1 }} />
          <button onClick={onClose} style={{
            padding:"8px 16px", borderRadius:20, border:"1px solid #ddd",
            background:"#fff", color:"#888", fontSize:13, cursor:"pointer",
          }}>取消</button>
          <button onClick={handleSubmit} disabled={!text.trim()} style={{
            padding:"8px 20px", borderRadius:20,
            background: text.trim() ? "#2d7a58" : "#ccc",
            color:"#fff", border:"none", fontSize:13, fontWeight:700,
            cursor: text.trim() ? "pointer" : "not-allowed", transition:"all 0.2s",
          }}>{isEdit ? "保存修改 ✦" : "贴上去 ✦"}</button>
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

  const handleSave = () => { onSave(val ? Number(val) : null); };
  const handleKey  = (e) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") onSkip();
  };

  return (
    <div style={{
      marginTop:10, background:"rgba(255,255,255,0.9)", backdropFilter:"blur(8px)",
      borderRadius:12, padding:"10px 12px", border:`1px solid ${color.border}`,
      animation:"noteIn 0.2s cubic-bezier(.22,.68,0,1.2) both",
    }}>
      <div style={{ fontSize:11, color:"#7a9a85", marginBottom:6 }}>💰 买了多少钱？（可跳过）</div>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <div style={{
          display:"flex", alignItems:"center", gap:4, background:"rgba(255,255,255,0.9)",
          borderRadius:8, padding:"5px 10px", border:"1px solid rgba(0,0,0,0.1)", flex:1,
        }}>
          <span style={{ fontSize:13, color:"#888" }}>¥</span>
          <input
            ref={inputRef} type="number" value={val}
            onChange={e => setVal(e.target.value)} onKeyDown={handleKey}
            placeholder="输入金额"
            style={{ background:"transparent", border:"none", outline:"none", fontSize:14, color:"#333", width:"100%", fontFamily:"inherit" }}
          />
        </div>
        <button onClick={onSkip} style={{
          padding:"5px 10px", borderRadius:8, border:"1px solid #ddd",
          background:"#fff", color:"#aaa", fontSize:12, cursor:"pointer",
        }}>跳过</button>
        <button onClick={handleSave} style={{
          padding:"5px 14px", borderRadius:8, border:"none",
          background:"#2d7a58", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer",
        }}>确认</button>
      </div>
    </div>
  );
}

// ─── 单张便签 ──────────────────────────────────────────────────
// 子条目状态：0 = 未处理，1 = 已买，2 = 跳过（缺货/没买到）
function StickyNote({ item, onComplete, onToggleBack, onDelete, onOpenEdit }) {
  const c = NOTE_COLORS[item.color_idx ?? 0];
  const subItems = parseItems(item.content);
  const isMulti  = subItems.length > 1;

  // 0=未处理 1=已买 2=跳过
  const [subState, setSubState] = useState(() => new Array(subItems.length).fill(0));
  const [showAmountBubble, setShowAmountBubble] = useState(false);

  // 循环切换：0→1→2→0；已完成整张时不可操作
  const cycleSub = (i) => {
    if (item.is_done) return;
    setSubState(prev => {
      const next = [...prev];
      next[i] = (next[i] + 1) % 3;
      // 全部都处理过（已买或跳过）→ 弹金额气泡
      const updated = next;
      if (updated.every(s => s !== 0)) setShowAmountBubble(true);
      return updated;
    });
  };

  // 单条便签：点整张触发完成
  const handleSingleCheck = () => {
    if (!item.is_done) setShowAmountBubble(true);
  };

  // 长按编辑（未完成时）
  const pressTimer = useRef(null);
  const handlePressStart = (e) => {
    if (item.is_done) return;
    pressTimer.current = setTimeout(() => {
      onOpenEdit(item);
    }, 600);
  };
  const handlePressEnd = () => clearTimeout(pressTimer.current);

  // 删除二步确认
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteTimer = useRef(null);
  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (confirmDelete) {
      clearTimeout(deleteTimer.current);
      onDelete(item.id);
    } else {
      setConfirmDelete(true);
      deleteTimer.current = setTimeout(() => setConfirmDelete(false), 3000);
    }
  };
  useEffect(() => () => {
    clearTimeout(pressTimer.current);
    clearTimeout(deleteTimer.current);
  }, []);

  const doneCount    = subState.filter(s => s === 1).length;
  const skippedCount = subState.filter(s => s === 2).length;
  const allHandled   = isMulti && subState.every(s => s !== 0);

  // 子条目状态对应的视觉
  const subIcon = (s) => {
    if (s === 1) return { bg:"#2d7a58", border:"#2d7a58", text:"✓", color:"#fff" };
    if (s === 2) return { bg:"#f0f0ec", border:"#ccc",    text:"✕", color:"#bbb" };
    return null; // 未处理：空圆圈
  };

  return (
    <div
      style={{
        background: item.is_done ? "#f5f5f0" : c.bg,
        border: `1px solid ${item.is_done ? "#e0e0d8" : c.border}`,
        borderRadius: "2px 14px 14px 14px",
        padding:"14px 14px 12px",
        boxShadow: item.is_done
          ? "1px 2px 6px rgba(0,0,0,0.06)"
          : `2px 4px 12px ${c.shadow}, 0 1px 3px rgba(0,0,0,0.07)`,
        position:"relative", overflow:"hidden",
        transition:"all 0.35s ease",
        opacity: item.is_done ? 0.65 : 1,
        animation: "noteIn 0.3s cubic-bezier(.22,.68,0,1.2) both",
        cursor: (!isMulti && !item.is_done) ? "pointer" : "default",
        userSelect:"none", WebkitUserSelect:"none",
      }}
      onClick={!isMulti ? handleSingleCheck : undefined}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
    >
      {/* 折角 */}
      <div style={{
        position:"absolute", top:0, left:0, width:0, height:0, borderStyle:"solid",
        borderWidth:"14px 14px 0 0",
        borderColor:`${item.is_done ? "#e0e0d8" : c.border} transparent transparent transparent`,
      }} />

      {/* 线条背景 */}
      {!item.is_done && (
        <div style={{
          position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden",
          backgroundImage:`repeating-linear-gradient(transparent, transparent 27px, ${c.line}35 27px, ${c.line}35 28px)`,
          backgroundPositionY:"36px",
        }} />
      )}

      {/* 编辑提示（未完成时右上角显示） */}
      {!item.is_done && (
        <div style={{
          position:"absolute", top:6, right:44, fontSize:9, color:`${c.line}99`,
          letterSpacing:0.3, pointerEvents:"none",
        }}>长按编辑</div>
      )}

      <div style={{ position:"relative", zIndex:1 }}>

        {/* ── 多条目 ── */}
        {isMulti ? (
          <div style={{ marginBottom:8 }}>
            {subItems.map((line, i) => {
              const st   = item.is_done ? 1 : subState[i];
              const icon = subIcon(st);
              return (
                <div
                  key={i}
                  onClick={(e) => { e.stopPropagation(); cycleSub(i); }}
                  style={{
                    display:"flex", alignItems:"center", gap:10,
                    padding:"6px 0",
                    borderBottom: i < subItems.length-1 ? `1px dashed ${c.line}50` : "none",
                    cursor: item.is_done ? "default" : "pointer",
                    WebkitTapHighlightColor:"transparent",
                  }}
                >
                  {/* 状态圆圈（整张已完成时隐藏） */}
                  {!item.is_done && (
                    <div style={{
                      width:20, height:20, borderRadius:"50%", flexShrink:0,
                      border:`1.5px solid ${icon ? icon.border : c.line}`,
                      background: icon ? icon.bg : "rgba(255,255,255,0.55)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:10, color: icon ? icon.color : "transparent",
                      transition:"all 0.2s",
                    }}>
                      {icon?.text}
                    </div>
                  )}
                  <span style={{
                    fontSize:14, lineHeight:1.65, flex:1,
                    fontFamily:"'Ma Shan Zheng','ZCOOL KuaiLe','Noto Sans SC',cursive",
                    letterSpacing:"0.3px",
                    color: (st === 1) ? "#bbb" : (st === 2) ? "#ccc" : (item.is_done ? "#bbb" : "#2a2a2a"),
                    textDecoration: (st !== 0 || item.is_done) ? "line-through" : "none",
                    textDecorationColor: st === 2 ? "#ddd" : "#aaa",
                    transition:"all 0.25s",
                    fontStyle: st === 2 ? "italic" : "normal",
                  }}>{line}</span>
                  {/* 跳过标签 */}
                  {st === 2 && !item.is_done && (
                    <span style={{
                      fontSize:9, color:"#bbb", background:"rgba(0,0,0,0.05)",
                      borderRadius:6, padding:"1px 5px", flexShrink:0,
                    }}>缺货</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* ── 单条目 ── */
          <p style={{
            fontSize:14, lineHeight:"26px",
            color: item.is_done ? "#999" : "#2a2a2a",
            fontFamily:"'Ma Shan Zheng','ZCOOL KuaiLe','Noto Sans SC',cursive",
            textDecoration: item.is_done ? "line-through" : "none",
            textDecorationColor:"#aaa", margin:0, paddingLeft:4,
            whiteSpace:"pre-wrap", wordBreak:"break-all", letterSpacing:"0.3px",
          }}>{item.content}</p>
        )}

        {/* ── 底部 meta ── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:6 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:10, color:"#bbb" }}>{formatDate(item.created_at)}</span>

            {/* 多条进度 */}
            {isMulti && !item.is_done && (doneCount > 0 || skippedCount > 0) && !allHandled && (
              <span style={{ fontSize:11, color:c.line, fontWeight:600 }}>
                {doneCount}/{subItems.length} 已买
                {skippedCount > 0 && <span style={{ color:"#bbb", fontWeight:400 }}> · {skippedCount} 缺货</span>}
              </span>
            )}

            {/* 金额标签 */}
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

          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            {item.is_done ? (
              <button onClick={() => onToggleBack(item)} style={{
                fontSize:11, color:"#bbb", background:"none", border:"none",
                cursor:"pointer", padding:"4px 6px", textDecoration:"underline",
              }}>撤回</button>
            ) : (
              !isMulti && (
                <div style={{
                  width:26, height:26, borderRadius:"50%",
                  border:`1.5px solid ${c.border}`,
                  background:"rgba(255,255,255,0.6)", color:c.line,
                  fontSize:14, display:"flex", alignItems:"center", justifyContent:"center",
                  pointerEvents:"none",
                }}>○</div>
              )
            )}
            <button
              onClick={handleDeleteClick}
              title={confirmDelete ? "再次点击确认删除" : "删除"}
              style={{
                height:28, borderRadius:14, border:"none",
                background: confirmDelete ? "#e05a3a" : "rgba(255,255,255,0.5)",
                color: confirmDelete ? "#fff" : "#ccc",
                fontSize: confirmDelete ? 11 : 14,
                fontWeight: confirmDelete ? 600 : 400,
                cursor:"pointer",
                padding: confirmDelete ? "0 10px" : "0",
                width: confirmDelete ? "auto" : 28,
                display:"flex", alignItems:"center", justifyContent:"center",
                transition:"all 0.2s", whiteSpace:"nowrap",
              }}
              onMouseEnter={e => { if (!confirmDelete) e.currentTarget.style.color="#e05a3a"; }}
              onMouseLeave={e => { if (!confirmDelete) e.currentTarget.style.color="#ccc"; }}
            >{confirmDelete ? "确认删除" : "✕"}</button>
          </div>
        </div>

        {/* 金额气泡 */}
        {showAmountBubble && (
          <AmountBubble
            color={c}
            onSave={(amount) => { setShowAmountBubble(false); onComplete(item, amount); }}
            onSkip={() => { setShowAmountBubble(false); onComplete(item, null); }}
          />
        )}
      </div>
    </div>
  );
}

// ─── 顶部统计摘要栏 ───────────────────────────────────────────
function StatsSummary({ items }) {
  const [view, setView] = useState("week");

  const now = Date.now();
  const currentKey = view === "week" ? getWeekKey(now) : getMonthKey(now);

  const spent = items
    .filter(i => i.is_done && i.amount > 0)
    .filter(i => view === "all" || (view === "week" ? getWeekKey(i.created_at) : getMonthKey(i.created_at)) === currentKey)
    .reduce((s, i) => s + Number(i.amount), 0);

  const pendingTotal = items.filter(i => !i.is_done && i.amount > 0).reduce((s, i) => s + Number(i.amount), 0);
  const todoCount    = items.filter(i => !i.is_done).length;

  if (items.length === 0) return null;

  const periodLabel = view === "week" ? "本周" : view === "month" ? "本月" : "累计";

  return (
    <div style={{ margin:"0 16px 14px", display:"flex", gap:8, alignItems:"stretch" }}>
      <div style={{
        flex:2, background:"rgba(255,255,255,0.65)", backdropFilter:"blur(12px)",
        borderRadius:14, padding:"10px 14px", border:"1px solid rgba(255,255,255,0.9)",
        display:"flex", flexDirection:"column", justifyContent:"space-between",
      }}>
        <div style={{ fontSize:10, color:"#7a9a85", letterSpacing:0.5 }}>{periodLabel}已花</div>
        <div style={{ fontSize:22, fontWeight:700, color:"#1a3a2a", marginTop:2 }}>
          ¥{spent.toFixed(0)}
        </div>
        <div style={{ display:"flex", gap:4, marginTop:6 }}>
          {[["week","按周"],["month","按月"],["all","累计"]].map(([v,l]) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding:"2px 8px", borderRadius:10, border:"none", cursor:"pointer", fontSize:10,
              background: view===v ? "#2d7a58" : "rgba(45,122,88,0.08)",
              color: view===v ? "#fff" : "#7a9a85", transition:"all 0.2s",
            }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{
          flex:1, background:"rgba(255,255,255,0.65)", backdropFilter:"blur(12px)",
          borderRadius:14, padding:"8px 12px", border:"1px solid rgba(255,255,255,0.9)",
        }}>
          <div style={{ fontSize:10, color:"#7a9a85" }}>待买项</div>
          <div style={{ fontSize:18, fontWeight:700, color:"#1a3a2a", marginTop:2 }}>{todoCount}</div>
        </div>
        <div style={{
          flex:1, background:"rgba(255,255,255,0.65)", backdropFilter:"blur(12px)",
          borderRadius:14, padding:"8px 12px", border:"1px solid rgba(255,255,255,0.9)",
        }}>
          <div style={{ fontSize:10, color:"#7a9a85" }}>预算待购</div>
          <div style={{ fontSize:18, fontWeight:700, color: pendingTotal > 0 ? "#e09030" : "#1a3a2a", marginTop:2 }}>
            {pendingTotal > 0 ? `¥${pendingTotal.toFixed(0)}` : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 主组件 ────────────────────────────────────────────────────
export default function ShoppingPage({ supabase }) {
  const [items,        setItems]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [showDone,     setShowDone]     = useState(false);
  const [confirm,      setConfirm]      = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editItem,     setEditItem]     = useState(null); // 正在编辑的便签

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

  useEffect(() => {
    const ch = supabase.channel("shopping-rt")
      .on("postgres_changes", { event:"*", schema:"public", table:"shopping_items" }, loadItems)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [supabase, loadItems]);

  const handleAdd = async ({ content, color_idx }) => {
    await supabase.from("shopping_items").insert({
      content, color_idx: color_idx ?? 0, amount: null, is_done: false,
    });
  };

  // 编辑保存：更新 content 和 color_idx，同时重置完成状态
  const handleEdit = async (updated) => {
    setItems(prev => prev.map(i => i.id === updated.id ? { ...i, content: updated.content, color_idx: updated.color_idx } : i));
    await supabase.from("shopping_items")
      .update({ content: updated.content, color_idx: updated.color_idx })
      .eq("id", updated.id);
  };

  const handleComplete = async (item, amount) => {
    setItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, is_done: true, amount: amount ?? i.amount } : i
    ));
    await supabase.from("shopping_items")
      .update({ is_done: true, amount: amount ?? item.amount })
      .eq("id", item.id);
  };

  const handleToggleBack = async (item) => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_done: false } : i));
    await supabase.from("shopping_items").update({ is_done: false }).eq("id", item.id);
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
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", position:"relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=ZCOOL+KuaiLe&display=swap');
        @keyframes noteIn  { from { opacity:0; transform:translateY(-8px) rotate(-1deg); } to { opacity:1; transform:translateY(0) rotate(0deg); } }
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes slideUp { from { transform:translateY(100%); opacity:0; } to { transform:translateY(0); opacity:1; } }
      `}</style>

      {confirm && (
        <ConfirmDialog
          message={`清空 ${doneItems.length} 条已完成记录？`}
          onConfirm={clearDone}
          onCancel={() => setConfirm(false)}
        />
      )}

      {/* 新增 或 编辑 弹窗 */}
      {(showAddSheet || editItem) && (
        <AddSheet
          onAdd={handleAdd}
          onEdit={handleEdit}
          editItem={editItem}
          onClose={() => { setShowAddSheet(false); setEditItem(null); }}
        />
      )}

      <div style={{ padding:"12px 0 0", flexShrink:0 }}>
        <StatsSummary items={items} />
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"0 16px 80px" }}>
        {error && (
          <div style={{ padding:"10px 14px", background:"#fff3f0", borderRadius:10, fontSize:13, color:"#c04040", marginBottom:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            {error}
            <button onClick={loadItems} style={{ fontSize:12, color:"#2d7a58", background:"none", border:"none", cursor:"pointer" }}>重试</button>
          </div>
        )}

        {todoItems.length === 0 && doneItems.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 0", color:"#7a9a85" }}>
            <div style={{ fontSize:36, marginBottom:10 }}>🛒</div>
            <div style={{ fontSize:14, fontFamily:"'Ma Shan Zheng',cursive" }}>点右下角 + 添加采购项</div>
          </div>
        )}

        {todoItems.length > 0 && (
          <>
            <div style={{ fontSize:11, color:"#7a9a85", marginBottom:10, letterSpacing:1 }}>
              待采购 · {todoItems.length} 项
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
              {todoItems.map(item => (
                <StickyNote key={item.id} item={item}
                  onComplete={handleComplete}
                  onToggleBack={handleToggleBack}
                  onDelete={deleteItem}
                  onOpenEdit={setEditItem}
                />
              ))}
            </div>
          </>
        )}

        {doneItems.length > 0 && (
          <>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <button onClick={() => setShowDone(v => !v)} style={{
                fontSize:11, color:"#7a9a85", background:"none", border:"none",
                cursor:"pointer", letterSpacing:1, padding:0,
              }}>
                {showDone ? "▼" : "▶"} 已完成 · {doneItems.length} 项
              </button>
              {showDone && (
                <button onClick={() => setConfirm(true)} style={{
                  fontSize:11, color:"#e05a3a", background:"none", border:"none",
                  cursor:"pointer", padding:0, fontWeight:600,
                }}>清空已完成</button>
              )}
            </div>
            {showDone && (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {doneItems.map(item => (
                  <StickyNote key={item.id} item={item}
                    onComplete={handleComplete}
                    onToggleBack={handleToggleBack}
                    onDelete={deleteItem}
                    onOpenEdit={setEditItem}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <button
        onClick={() => setShowAddSheet(true)}
        style={{
          position:"absolute", bottom:20, right:20,
          width:52, height:52, borderRadius:"50%",
          background:"#2d7a58", color:"#fff",
          border:"none", fontSize:28, fontWeight:300,
          cursor:"pointer", lineHeight:1,
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:"0 4px 20px rgba(45,122,88,0.45)",
          transition:"transform 0.15s", zIndex:100,
        }}
        onMouseEnter={e => e.currentTarget.style.transform="scale(1.08)"}
        onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}
      >+</button>
    </div>
  );
}
