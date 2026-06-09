import { useState, useEffect, useCallback, useRef } from "react";

// ─── 常量 ──────────────────────────────────────────────────────
const UNITS = ["个", "克", "斤", "袋", "瓶", "盒", "罐", "束", "块", "片", "颗", "升", "毫升", "包"];

// 鲜货超期天数阈值
const WARN_DAYS  = 3;
const ALERT_DAYS = 5;

function daysSince(dateStr) {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
}

function freshnessColor(item) {
  if (item.type !== "fresh") return null;
  if (item.status === "empty") return null;
  const d = daysSince(item.added_date);
  if (d >= ALERT_DAYS) return "#e05a3a";
  if (d >= WARN_DAYS)  return "#e09030";
  return null;
}

function freshnessLabel(item) {
  if (item.type !== "fresh" || item.status === "empty") return null;
  const d = daysSince(item.added_date);
  if (d >= ALERT_DAYS) return `入库${d}天 ⚠`;
  if (d >= WARN_DAYS)  return `入库${d}天`;
  if (d > 0)           return `入库${d}天`;
  return "今天入库";
}

// ─── 解析购物便签为条目数组（复用逻辑） ──────────────────────
function parseItems(content) {
  return content
    .split(/[、，,\n]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

// ─── 添加/编辑食材弹窗 ────────────────────────────────────────
function ItemFormSheet({ item, onSave, onClose }) {
  const isEdit = !!item?.id;
  const [name,   setName]   = useState(item?.name   ?? "");
  const [qty,    setQty]    = useState(item?.qty     ?? "");
  const [unit,   setUnit]   = useState(item?.unit    ?? "个");
  const [type,   setType]   = useState(item?.type    ?? "fresh");
  const [status, setStatus] = useState(item?.status  ?? "ok");
  const nameRef = useRef(null);

  useEffect(() => { setTimeout(() => nameRef.current?.focus(), 100); }, []);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      ...(item ?? {}),
      name: name.trim(),
      qty:  qty === "" ? null : Number(qty),
      unit,
      type,
      status,
      added_date: item?.added_date ?? new Date().toISOString().slice(0, 10),
    });
    onClose();
  };

  const inputStyle = {
    padding:"10px 12px", borderRadius:10,
    border:"1.5px solid rgba(45,122,88,0.2)",
    background:"#fff", fontSize:14, color:"#1a3a2a",
    outline:"none", fontFamily:"inherit", width:"100%",
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:500, display:"flex", alignItems:"flex-end" }}
      onClick={onClose}>
      <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.4)", backdropFilter:"blur(3px)" }} />
      <div style={{
        position:"relative", width:"100%", background:"#f4faf7",
        borderRadius:"20px 20px 0 0", padding:"16px 20px 40px",
        animation:"slideUp 0.3s cubic-bezier(.22,.68,0,1.2) both", zIndex:1,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ width:36, height:4, borderRadius:2, background:"rgba(45,122,88,0.2)", margin:"0 auto 16px" }} />
        <div style={{ fontSize:15, fontWeight:700, color:"#1a3a2a", marginBottom:16 }}>
          {isEdit ? "编辑食材" : "添加食材"}
        </div>

        {/* 名称 */}
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, color:"#7a9a85", marginBottom:5 }}>食材名称</div>
          <input ref={nameRef} value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSave()}
            placeholder="如：土豆、五花肉" style={inputStyle} />
        </div>

        {/* 数量 + 单位 */}
        <div style={{ display:"flex", gap:10, marginBottom:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:"#7a9a85", marginBottom:5 }}>数量（可留空）</div>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)}
              placeholder="—" style={inputStyle} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:"#7a9a85", marginBottom:5 }}>单位</div>
            <select value={unit} onChange={e => setUnit(e.target.value)}
              style={{ ...inputStyle, appearance:"none" }}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {/* 类型 */}
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, color:"#7a9a85", marginBottom:8 }}>类型</div>
          <div style={{ display:"flex", gap:8 }}>
            {[["fresh","🥬 鲜货","几天内需用完"],["dry","🫙 耐储","调料/干货/罐头"]].map(([v, label, sub]) => (
              <button key={v} onClick={() => setType(v)} style={{
                flex:1, padding:"10px 0", borderRadius:12, border:"none", cursor:"pointer",
                background: type === v ? (v === "fresh" ? "#e8f5ee" : "#fdf5e0") : "rgba(255,255,255,0.7)",
                outline: type === v ? `2px solid ${v === "fresh" ? "#2d7a58" : "#c4882d"}` : "2px solid transparent",
                transition:"all 0.15s",
              }}>
                <div style={{ fontSize:13, fontWeight:600, color: type === v ? (v === "fresh" ? "#2d7a58" : "#a07030") : "#888" }}>{label}</div>
                <div style={{ fontSize:10, color:"#aaa", marginTop:2 }}>{sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 状态（编辑时才显示） */}
        {isEdit && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11, color:"#7a9a85", marginBottom:8 }}>库存状态</div>
            <div style={{ display:"flex", gap:8 }}>
              {[["ok","充足","#2d7a58"],["low","不多了","#e09030"],["empty","已用完","#aaa"]].map(([v, label, color]) => (
                <button key={v} onClick={() => setStatus(v)} style={{
                  flex:1, padding:"8px 0", borderRadius:10, border:"none", cursor:"pointer",
                  background: status === v ? color + "18" : "rgba(255,255,255,0.7)",
                  outline: status === v ? `2px solid ${color}` : "2px solid transparent",
                  fontSize:12, fontWeight: status === v ? 600 : 400,
                  color: status === v ? color : "#aaa",
                  transition:"all 0.15s",
                }}>{label}</button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{
            flex:1, padding:13, borderRadius:14, border:"1px solid #ddd",
            background:"#fff", color:"#888", fontSize:14, cursor:"pointer",
          }}>取消</button>
          <button onClick={handleSave} disabled={!name.trim()} style={{
            flex:2, padding:13, borderRadius:14, border:"none",
            background: name.trim() ? "linear-gradient(135deg,#2d7a58,#3a9068)" : "#ccc",
            color:"#fff", fontSize:14, fontWeight:700,
            cursor: name.trim() ? "pointer" : "not-allowed",
          }}>{isEdit ? "保存" : "添加"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── 暂存区：处理单条待入库记录 ──────────────────────────────
function PendingItemRow({ pending, existingItems, onAddNew, onMerge, onIgnore }) {
  const [expanded, setExpanded] = useState(false);
  const [qty,      setQty]      = useState("");
  const [unit,     setUnit]     = useState("个");
  const [type,     setType]     = useState("fresh");

  // 检查库存里有没有同名的
  const matched = existingItems.filter(i =>
    i.name.includes(pending.name) || pending.name.includes(i.name)
  );

  const handleAddNew = () => {
    onAddNew({
      name: pending.name,
      qty:  qty === "" ? null : Number(qty),
      unit, type,
      status: "ok",
      added_date: new Date().toISOString().slice(0, 10),
    });
  };

  return (
    <div style={{
      background:"rgba(255,255,255,0.85)", borderRadius:14, marginBottom:8,
      border:"1.5px solid rgba(45,122,88,0.15)", overflow:"hidden",
    }}>
      {/* 行头 */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px" }}>
        <span style={{ fontSize:18 }}>🛒</span>
        <span style={{ flex:1, fontSize:14, fontWeight:600, color:"#1a3a2a" }}>{pending.name}</span>
        {matched.length > 0 && (
          <span style={{ fontSize:10, color:"#e09030", background:"#fdf5e0", padding:"2px 7px", borderRadius:10 }}>
            已有同名
          </span>
        )}
        <button onClick={() => setExpanded(v => !v)} style={{
          padding:"5px 12px", borderRadius:20, border:"none",
          background:"rgba(45,122,88,0.1)", color:"#2d7a58",
          fontSize:12, fontWeight:600, cursor:"pointer",
        }}>{expanded ? "收起" : "处理"}</button>
        <button onClick={onIgnore} style={{
          width:28, height:28, borderRadius:"50%", border:"none",
          background:"transparent", color:"#ccc", fontSize:14,
          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
        }}
          onMouseEnter={e => e.currentTarget.style.color="#e05a3a"}
          onMouseLeave={e => e.currentTarget.style.color="#ccc"}
        >✕</button>
      </div>

      {/* 展开的处理区 */}
      {expanded && (
        <div style={{ padding:"0 14px 14px", borderTop:"1px solid rgba(45,122,88,0.08)" }}>

          {/* 数量 + 单位 + 类型 */}
          <div style={{ display:"flex", gap:8, marginTop:12, marginBottom:12 }}>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)}
              placeholder="数量（可留空）"
              style={{ flex:2, padding:"8px 10px", borderRadius:8, border:"1.5px solid rgba(45,122,88,0.2)", background:"#fff", fontSize:13, color:"#1a3a2a", outline:"none", fontFamily:"inherit" }} />
            <select value={unit} onChange={e => setUnit(e.target.value)}
              style={{ flex:1, padding:"8px 6px", borderRadius:8, border:"1.5px solid rgba(45,122,88,0.2)", background:"#fff", fontSize:13, outline:"none", fontFamily:"inherit" }}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <select value={type} onChange={e => setType(e.target.value)}
              style={{ flex:1.5, padding:"8px 6px", borderRadius:8, border:"1.5px solid rgba(45,122,88,0.2)", background:"#fff", fontSize:13, outline:"none", fontFamily:"inherit" }}>
              <option value="fresh">🥬 鲜货</option>
              <option value="dry">🫙 耐储</option>
            </select>
          </div>

          {/* 操作按钮 */}
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={handleAddNew} style={{
              flex:1, padding:"9px 0", borderRadius:10, border:"none",
              background:"linear-gradient(135deg,#2d7a58,#3a9068)", color:"#fff",
              fontSize:13, fontWeight:700, cursor:"pointer",
            }}>+ 加入库存</button>
            {matched.map(m => (
              <button key={m.id} onClick={() => onMerge(m, qty === "" ? null : Number(qty), unit)} style={{
                flex:1, padding:"9px 0", borderRadius:10, border:"none",
                background:"#fdf5e0", color:"#a07030",
                fontSize:12, fontWeight:600, cursor:"pointer",
              }}>追加到「{m.name}」</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 单个食材卡片 ─────────────────────────────────────────────
function PantryItemCard({ item, onEdit, onDelete, onAdjustQty, onSetStatus }) {
  const fc   = freshnessColor(item);
  const flbl = freshnessLabel(item);
  const isEmpty = item.status === "empty";

  const statusColor = { ok:"#2d7a58", low:"#e09030", empty:"#bbb" };
  const statusLabel = { ok:"充足", low:"不多了", empty:"用完" };

  // 快捷 -1 / +1
  const canAdjust = item.qty !== null && item.qty !== undefined;

  return (
    <div style={{
      background: isEmpty ? "rgba(245,245,242,0.9)" : "rgba(255,255,255,0.88)",
      borderRadius:14, padding:"12px 14px",
      border: fc ? `1.5px solid ${fc}40` : "1px solid rgba(255,255,255,0.9)",
      boxShadow: fc ? `0 2px 10px ${fc}20` : "0 2px 10px rgba(45,122,88,0.06)",
      opacity: isEmpty ? 0.6 : 1,
      transition:"all 0.2s",
      display:"flex", alignItems:"center", gap:12,
    }}>
      {/* 类型图标 */}
      <div style={{
        width:42, height:42, borderRadius:12, flexShrink:0,
        background: item.type === "fresh"
          ? (fc ? fc + "18" : "rgba(45,122,88,0.08)")
          : "rgba(160,112,48,0.08)",
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:22,
      }}>
        {item.type === "fresh" ? "🥬" : "🫙"}
      </div>

      {/* 信息 */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:14, fontWeight:600, color: isEmpty ? "#aaa" : "#1a3a2a" }}>
            {item.name}
          </span>
          {fc && (
            <span style={{ fontSize:10, color:fc, fontWeight:600 }}>
              {fc === "#e05a3a" ? "⚠ 尽快用" : "注意"}
            </span>
          )}
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:3, flexWrap:"wrap" }}>
          {/* 数量显示 + 快捷调整 */}
          {canAdjust ? (
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <button onClick={() => onAdjustQty(item, -1)} style={{
                width:20, height:20, borderRadius:"50%", border:"1px solid rgba(45,122,88,0.3)",
                background:"transparent", color:"#2d7a58", fontSize:12,
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                fontWeight:700, lineHeight:1, padding:0,
              }}>−</button>
              <span style={{ fontSize:13, fontWeight:700, color: isEmpty ? "#bbb" : "#1a3a2a", minWidth:20, textAlign:"center" }}>
                {item.qty}
              </span>
              <button onClick={() => onAdjustQty(item, 1)} style={{
                width:20, height:20, borderRadius:"50%", border:"none",
                background:"rgba(45,122,88,0.12)", color:"#2d7a58", fontSize:12,
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                fontWeight:700, lineHeight:1, padding:0,
              }}>+</button>
              <span style={{ fontSize:11, color:"#aaa" }}>{item.unit}</span>
            </div>
          ) : (
            <span style={{ fontSize:12, color:"#bbb" }}>未记录数量</span>
          )}

          {/* 新鲜度 */}
          {flbl && (
            <span style={{ fontSize:10, color: fc ?? "#bbb" }}>{flbl}</span>
          )}
        </div>
      </div>

      {/* 右侧：状态 + 操作 */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
        {/* 状态切换（循环）*/}
        <button onClick={() => {
          const order = ["ok","low","empty"];
          const next  = order[(order.indexOf(item.status) + 1) % 3];
          onSetStatus(item, next);
        }} style={{
          padding:"3px 10px", borderRadius:10, border:"none", cursor:"pointer", fontSize:11, fontWeight:600,
          background: statusColor[item.status] + "18",
          color: statusColor[item.status],
          transition:"all 0.2s",
        }}>{statusLabel[item.status]}</button>

        {/* 编辑 / 删除 */}
        <div style={{ display:"flex", gap:4 }}>
          <button onClick={() => onEdit(item)} style={{
            width:26, height:26, borderRadius:8, border:"none",
            background:"rgba(45,122,88,0.08)", color:"#2d7a58",
            fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
          }}>✎</button>
          <button onClick={() => onDelete(item.id)} style={{
            width:26, height:26, borderRadius:8, border:"none",
            background:"transparent", color:"#ddd",
            fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
          }}
            onMouseEnter={e => e.currentTarget.style.color="#e05a3a"}
            onMouseLeave={e => e.currentTarget.style.color="#ddd"}
          >✕</button>
        </div>
      </div>
    </div>
  );
}

// ─── 主页面 ────────────────────────────────────────────────────
export default function PantryPage({ supabase }) {
  const [items,       setItems]       = useState([]);
  const [pending,     setPending]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [showForm,    setShowForm]    = useState(false);
  const [editItem,    setEditItem]    = useState(null);
  const [showEmpty,   setShowEmpty]   = useState(false);
  const [pendingOpen, setPendingOpen] = useState(true);
  // 搜索 + 筛选
  const [search,      setSearch]      = useState("");
  const [filter,      setFilter]      = useState("all"); // all | warn | fresh | dry | empty | pending
  const searchRef = useRef(null);

  // ── 加载 ──
  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const [{ data: its, error: e1 }, { data: pds, error: e2 }] = await Promise.all([
        supabase.from("pantry_items").select("*").order("type").order("added_date"),
        supabase.from("pantry_pending").select("*").eq("handled", false).order("created_at"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      setItems(its ?? []);
      setPending(pds ?? []);
    } catch { setError("加载失败，请重试"); }
    finally { setLoading(false); }
  }, [supabase]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── 实时订阅 ──
  useEffect(() => {
    const ch = supabase.channel("pantry-rt")
      .on("postgres_changes", { event:"*", schema:"public", table:"pantry_items" },   loadAll)
      .on("postgres_changes", { event:"*", schema:"public", table:"pantry_pending" }, loadAll)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [supabase, loadAll]);

  // ── 添加食材 ──
  const handleAdd = async (data) => {
    const { error } = await supabase.from("pantry_items").insert(data);
    if (!error) loadAll();
  };

  // ── 编辑食材 ──
  const handleEdit = async (data) => {
    const { id, ...rest } = data;
    await supabase.from("pantry_items").update(rest).eq("id", id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...rest } : i));
  };

  // ── 删除 ──
  const handleDelete = async (id) => {
    setItems(prev => prev.filter(i => i.id !== id));
    await supabase.from("pantry_items").delete().eq("id", id);
  };

  // ── 快捷数量调整 ──
  const handleAdjustQty = async (item, delta) => {
    const newQty = Math.max(0, (item.qty ?? 0) + delta);
    const newStatus = newQty === 0 ? "empty" : item.status === "empty" ? "ok" : item.status;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, qty: newQty, status: newStatus } : i));
    await supabase.from("pantry_items").update({ qty: newQty, status: newStatus }).eq("id", item.id);
  };

  // ── 设置状态 ──
  const handleSetStatus = async (item, status) => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status } : i));
    await supabase.from("pantry_items").update({ status }).eq("id", item.id);
  };

  // ── 暂存：加入库存（新建） ──
  const handlePendingAddNew = async (pendingItem, data) => {
    await supabase.from("pantry_items").insert(data);
    await supabase.from("pantry_pending").update({ handled: true }).eq("id", pendingItem.id);
    loadAll();
  };

  // ── 暂存：追加到已有同名食材 ──
  const handlePendingMerge = async (pendingItem, existingItem, addQty, unit) => {
    const newQty = addQty ? (existingItem.qty ?? 0) + addQty : existingItem.qty;
    await supabase.from("pantry_items").update({
      qty: newQty, status: "ok",
      added_date: new Date().toISOString().slice(0, 10),
    }).eq("id", existingItem.id);
    await supabase.from("pantry_pending").update({ handled: true }).eq("id", pendingItem.id);
    loadAll();
  };

  // ── 暂存：忽略 ──
  const handlePendingIgnore = async (pendingItem) => {
    setPending(prev => prev.filter(p => p.id !== pendingItem.id));
    await supabase.from("pantry_pending").update({ handled: true }).eq("id", pendingItem.id);
  };

  // ── 派生数据 ──
  const isWarn = (i) =>
    i.status !== "empty" && (i.status === "low" || (i.type === "fresh" && daysSince(i.added_date) >= WARN_DAYS));

  const warnCount  = items.filter(isWarn).length;
  const freshCount = items.filter(i => i.type === "fresh" && i.status !== "empty").length;
  const dryCount   = items.filter(i => i.type === "dry"   && i.status !== "empty").length;
  const emptyCount = items.filter(i => i.status === "empty").length;

  // ── 搜索 + 筛选后的列表 ──
  const applySearchFilter = (list) => {
    let result = list;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q));
    }
    switch (filter) {
      case "warn":    return result.filter(isWarn);
      case "fresh":   return result.filter(i => i.type === "fresh" && i.status !== "empty");
      case "dry":     return result.filter(i => i.type === "dry"   && i.status !== "empty");
      case "empty":   return result.filter(i => i.status === "empty");
      default:        return result;
    }
  };

  const isFiltering = filter !== "all" || search.trim() !== "";

  // 筛选后再分组（搜索/筛选时扁平展示，不分组）
  const filteredItems = applySearchFilter(items)
    .sort((a, b) => {
      // 用完的沉底
      if (a.status === "empty" && b.status !== "empty") return 1;
      if (b.status === "empty" && a.status !== "empty") return -1;
      // 鲜货优先
      if (a.type !== b.type) return a.type === "fresh" ? -1 : 1;
      // 同类型按入库日期升序
      return new Date(a.added_date) - new Date(b.added_date);
    });

  // 分组（无筛选时用）
  const freshItems = items.filter(i => i.type === "fresh" && i.status !== "empty")
    .sort((a, b) => new Date(a.added_date) - new Date(b.added_date));
  const dryItems   = items.filter(i => i.type === "dry"   && i.status !== "empty")
    .sort((a, b) => new Date(a.added_date) - new Date(b.added_date));
  const emptyItems = items.filter(i => i.status === "empty");

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", flex:1 }}>
      <div style={{ width:28, height:28, border:"3px solid rgba(45,122,88,0.2)", borderTopColor:"#2d7a58", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
    </div>
  );

  // 筛选 tab 配置
  const filterTabs = [
    { id:"all",     label:"全部",   count: items.filter(i=>i.status!=="empty").length, color:"#2d7a58" },
    { id:"warn",    label:"需注意", count: warnCount,  color:"#e09030" },
    { id:"fresh",   label:"🥬 鲜货", count: freshCount, color:"#2d7a58" },
    { id:"dry",     label:"🫙 耐储", count: dryCount,   color:"#a07030" },
    { id:"empty",   label:"已用完", count: emptyCount, color:"#bbb"    },
    { id:"pending", label:"待入库", count: pending.length, color:"#2d7a58" },
  ];

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", position:"relative" }}>

      {/* ── 顶部摘要卡（可点击筛选） ── */}
      <div style={{ padding:"0 16px 10px", display:"flex", gap:8, flexShrink:0 }}>
        {[
          { fid:"all",   label:"现有食材", value: freshCount + dryCount, color:"#2d7a58" },
          { fid:"warn",  label:"需要注意", value: warnCount,  color: warnCount > 0 ? "#e09030" : "#1a3a2a", active_color:"#e09030" },
          { fid:"pending", label:"待入库", value: pending.length, color: pending.length > 0 ? "#2d7a58" : "#1a3a2a" },
        ].map(({ fid, label, value, color, active_color }) => {
          const active = filter === fid;
          return (
            <div key={fid} onClick={() => setFilter(f => f === fid ? "all" : fid)} style={{
              flex:1, background: active ? (active_color ?? color) + "18" : "rgba(255,255,255,0.7)",
              borderRadius:12, padding:"10px 14px", backdropFilter:"blur(8px)",
              border: active ? `1.5px solid ${active_color ?? color}` : "1px solid rgba(255,255,255,0.9)",
              cursor:"pointer", transition:"all 0.2s",
            }}>
              <div style={{ fontSize:20, fontWeight:700, color: active ? (active_color ?? color) : color }}>{value}</div>
              <div style={{ fontSize:11, color:"#7a9a85", marginTop:1 }}>{label}</div>
            </div>
          );
        })}
      </div>

      {/* ── 搜索框 ── */}
      <div style={{ padding:"0 16px 8px", flexShrink:0 }}>
        <div style={{
          display:"flex", alignItems:"center", gap:8,
          background:"rgba(255,255,255,0.85)", borderRadius:12, padding:"8px 12px",
          border: search ? "1.5px solid rgba(45,122,88,0.35)" : "1px solid rgba(255,255,255,0.9)",
          backdropFilter:"blur(8px)", transition:"border 0.2s",
        }}>
          <span style={{ fontSize:15, color:"#7a9a85", flexShrink:0 }}>🔍</span>
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索食材名称…"
            style={{
              flex:1, background:"transparent", border:"none", outline:"none",
              fontSize:14, color:"#1a3a2a", fontFamily:"inherit",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{
              background:"none", border:"none", color:"#bbb", fontSize:16,
              cursor:"pointer", padding:0, lineHeight:1, flexShrink:0,
            }}>×</button>
          )}
        </div>
      </div>

      {/* ── 筛选 Tab ── */}
      <div style={{ overflowX:"auto", display:"flex", gap:6, padding:"0 16px 10px", flexShrink:0 }}>
        {filterTabs.map(({ id, label, count, color }) => {
          const active = filter === id;
          return (
            <button key={id} onClick={() => setFilter(f => f === id ? "all" : id)} style={{
              flexShrink:0, padding:"5px 12px", borderRadius:20, border:"none", cursor:"pointer",
              background: active ? color : "rgba(255,255,255,0.7)",
              color: active ? "#fff" : "#7a9a85",
              fontSize:11, fontWeight: active ? 700 : 400,
              boxShadow: active ? `0 2px 8px ${color}40` : "none",
              transition:"all 0.2s",
              opacity: count === 0 ? 0.45 : 1,
            }}>
              {label} {count > 0 && <span style={{ opacity:0.8 }}>· {count}</span>}
            </button>
          );
        })}
      </div>

      {/* ── 滚动内容区 ── */}
      <div style={{ flex:1, overflowY:"auto", padding:"0 16px 80px" }}>

        {error && (
          <div style={{ padding:"10px 14px", background:"#fff3f0", borderRadius:10, fontSize:13, color:"#c04040", marginBottom:10, display:"flex", justifyContent:"space-between" }}>
            {error}
            <button onClick={loadAll} style={{ fontSize:12, color:"#2d7a58", background:"none", border:"none", cursor:"pointer" }}>重试</button>
          </div>
        )}

        {/* ── 搜索/筛选状态：扁平列表 ── */}
        {isFiltering ? (
          <>
            {/* 筛选为 pending 时展示暂存区 */}
            {filter === "pending" ? (
              pending.length === 0 ? (
                <div style={{ textAlign:"center", padding:"52px 0", color:"#7a9a85" }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>✓</div>
                  <div style={{ fontSize:14 }}>没有待入库的食材</div>
                </div>
              ) : pending.map(p => (
                <PendingItemRow
                  key={p.id}
                  pending={p}
                  existingItems={items}
                  onAddNew={(data) => handlePendingAddNew(p, data)}
                  onMerge={(existing, qty, unit) => handlePendingMerge(p, existing, qty, unit)}
                  onIgnore={() => handlePendingIgnore(p)}
                />
              ))
            ) : (
              <>
                {filteredItems.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"52px 0", color:"#7a9a85" }}>
                    <div style={{ fontSize:28, marginBottom:8 }}>◎</div>
                    <div style={{ fontSize:14 }}>
                      {search ? `没有找到「${search}」` : "该分类下暂无食材"}
                    </div>
                    {search && (
                      <button onClick={() => setSearch("")} style={{
                        marginTop:10, fontSize:12, color:"#2d7a58", background:"none", border:"none", cursor:"pointer",
                      }}>清除搜索</button>
                    )}
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {/* 搜索时显示分组标签 */}
                    {!search && filter === "warn" && (
                      <div style={{ fontSize:11, color:"#e09030", marginBottom:4, fontWeight:600 }}>
                        ⚠ 不多了或入库过久，建议尽快使用
                      </div>
                    )}
                    {filteredItems.map(item => (
                      <PantryItemCard key={item.id} item={item}
                        onEdit={setEditItem}
                        onDelete={handleDelete}
                        onAdjustQty={handleAdjustQty}
                        onSetStatus={handleSetStatus}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          /* ── 默认分组视图 ── */
          <>
            {/* 暂存区 */}
            {pending.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <button onClick={() => setPendingOpen(v => !v)} style={{
                  display:"flex", alignItems:"center", gap:6, marginBottom:10,
                  background:"none", border:"none", cursor:"pointer", padding:0,
                }}>
                  <span style={{ fontSize:11, color:"#2d7a58", fontWeight:700, letterSpacing:1 }}>
                    {pendingOpen ? "▼" : "▶"} 待入库 · {pending.length} 项
                  </span>
                  <span style={{ fontSize:10, color:"#aaa" }}>从购物清单同步</span>
                </button>
                {pendingOpen && pending.map(p => (
                  <PendingItemRow
                    key={p.id}
                    pending={p}
                    existingItems={items}
                    onAddNew={(data) => handlePendingAddNew(p, data)}
                    onMerge={(existing, qty, unit) => handlePendingMerge(p, existing, qty, unit)}
                    onIgnore={() => handlePendingIgnore(p)}
                  />
                ))}
              </div>
            )}

            {/* 空态 */}
            {items.length === 0 && pending.length === 0 && (
              <div style={{ textAlign:"center", padding:"60px 0", color:"#7a9a85" }}>
                <div style={{ fontSize:36, marginBottom:10 }}>🫙</div>
                <div style={{ fontSize:14 }}>还没有食材记录</div>
                <div style={{ fontSize:12, color:"#aaa", marginTop:4 }}>点右下角 + 手动添加，或从购物清单同步</div>
              </div>
            )}

            {/* 鲜货 */}
            {freshItems.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, color:"#7a9a85", marginBottom:10, letterSpacing:1, display:"flex", alignItems:"center", gap:6 }}>
                  🥬 鲜货 · {freshItems.length} 项
                  {freshItems.some(i => freshnessColor(i)) && (
                    <span style={{ fontSize:10, color:"#e09030" }}>· 有食材需要尽快用</span>
                  )}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {freshItems.map(item => (
                    <PantryItemCard key={item.id} item={item}
                      onEdit={setEditItem} onDelete={handleDelete}
                      onAdjustQty={handleAdjustQty} onSetStatus={handleSetStatus}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 耐储 */}
            {dryItems.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, color:"#7a9a85", marginBottom:10, letterSpacing:1 }}>
                  🫙 耐储 · {dryItems.length} 项
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {dryItems.map(item => (
                    <PantryItemCard key={item.id} item={item}
                      onEdit={setEditItem} onDelete={handleDelete}
                      onAdjustQty={handleAdjustQty} onSetStatus={handleSetStatus}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 已用完（折叠） */}
            {emptyItems.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <button onClick={() => setShowEmpty(v => !v)} style={{
                  fontSize:11, color:"#bbb", background:"none", border:"none",
                  cursor:"pointer", letterSpacing:1, padding:0,
                }}>
                  {showEmpty ? "▼" : "▶"} 已用完 · {emptyItems.length} 项
                </button>
                {showEmpty && (
                  <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:10 }}>
                    {emptyItems.map(item => (
                      <PantryItemCard key={item.id} item={item}
                        onEdit={setEditItem} onDelete={handleDelete}
                        onAdjustQty={handleAdjustQty} onSetStatus={handleSetStatus}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <button onClick={() => setShowForm(true)} style={{
        position:"absolute", bottom:20, right:20,
        width:52, height:52, borderRadius:"50%",
        background:"#2d7a58", color:"#fff",
        border:"none", fontSize:28, fontWeight:300,
        cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
        boxShadow:"0 4px 20px rgba(45,122,88,0.45)", transition:"transform 0.15s", zIndex:100,
      }}
        onMouseEnter={e => e.currentTarget.style.transform="scale(1.08)"}
        onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}
      >+</button>

      {showForm && (
        <ItemFormSheet onSave={handleAdd} onClose={() => setShowForm(false)} />
      )}
      {editItem && (
        <ItemFormSheet
          item={editItem}
          onSave={(data) => { handleEdit(data); setEditItem(null); }}
          onClose={() => setEditItem(null)}
        />
      )}
    </div>
  );
}
