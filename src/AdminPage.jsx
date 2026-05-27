import { useState, useEffect, useRef, useCallback } from "react";

// ─── 常量 ─────────────────────────────────────────────────────
const STATUS_FLOW = ["pending", "confirmed", "completed"];
const STATUS_LABEL = { pending: "待处理", confirmed: "备餐中", completed: "已完成", cancelled: "已取消" };
const STATUS_COLOR = { pending: "#e09030", confirmed: "#2d7a58", completed: "#7a9a85", cancelled: "#aaa" };
const STATUS_NEXT  = { pending: "开始备餐", confirmed: "完成出餐", completed: null };
const STATUS_BG    = { pending: "#fff8ee", confirmed: "#f0faf5", completed: "#f5f5f5", cancelled: "#f9f9f9" };

// ─── AdminPage 组件（传入 supabase 实例）─────────────────────
export default function AdminPage({ supabase }) {
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [expanded, setExpanded]     = useState(null);
  const [updating, setUpdating]     = useState(null);   // 正在更新的 order id
  const [newOrderIds, setNewOrderIds] = useState(new Set()); // 新到订单高亮
  const audioRef = useRef(null);

  // ── 加载订单（带明细）──
  const loadOrders = useCallback(async () => {
    setError(null);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .in("status", ["pending", "confirmed"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      setOrders(data ?? []);
    } catch (e) {
      setError("加载失败，请重试");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // ── Supabase Realtime 订阅 ──
  useEffect(() => {
    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        async (payload) => {
          // 拉取新订单的完整数据（含明细）
          const { data } = await supabase
            .from("orders")
            .select("*, order_items(*)")
            .eq("id", payload.new.id)
            .single();
          if (data) {
            setOrders(prev => [data, ...prev]);
            setNewOrderIds(prev => new Set([...prev, data.id]));
            // 播放提示音
            audioRef.current?.play().catch(() => {});
            // 3秒后取消高亮
            setTimeout(() => {
              setNewOrderIds(prev => {
                const next = new Set(prev);
                next.delete(data.id);
                return next;
              });
            }, 4000);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          setOrders(prev => prev
            .map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o)
            .filter(o => ["pending", "confirmed"].includes(o.status))
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  // ── 更新订单状态 ──
  const updateStatus = async (order, nextStatus) => {
    setUpdating(order.id);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: nextStatus })
        .eq("id", order.id);
      if (error) throw error;
      if (nextStatus === "completed") {
        setOrders(prev => prev.filter(o => o.id !== order.id));
        setExpanded(null);
      } else {
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: nextStatus } : o));
      }
    } catch {
      alert("更新失败，请重试");
    } finally {
      setUpdating(null);
    }
  };

  // ── Pending 订单数量 badge ──
  const pendingCount = orders.filter(o => o.status === "pending").length;

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", flex:1 }}>
      <div style={{ width:28, height:28, border:"3px solid rgba(45,122,88,0.2)", borderTopColor:"#2d7a58", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
    </div>
  );

  if (error) return (
    <div style={{ margin:16, padding:"14px 16px", background:"#fff3f0", borderRadius:12, border:"1px solid #fcc", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <span style={{ fontSize:13, color:"#c04040" }}>{error}</span>
      <button onClick={loadOrders} style={{ fontSize:12, color:"#2d7a58", border:"none", background:"none", cursor:"pointer", fontWeight:600 }}>重试</button>
    </div>
  );

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"12px 16px 32px" }}>
      {/* 提示音（静音的短音频，靠 JS 触发） */}
      <audio ref={audioRef} src="https://cdn.pixabay.com/download/audio/2022/03/15/audio_8cb3eb1d8e.mp3?filename=notification-sound-7062.mp3" preload="auto" />

      {/* 顶部统计 */}
      <div style={{ display:"flex", gap:10, marginBottom:16 }}>
        {[
          { label:"待处理", count: orders.filter(o=>o.status==="pending").length,   color:"#e09030", bg:"#fff8ee" },
          { label:"备餐中", count: orders.filter(o=>o.status==="confirmed").length, color:"#2d7a58", bg:"#f0faf5" },
        ].map(s => (
          <div key={s.label} style={{ flex:1, background:s.bg, borderRadius:12, padding:"12px 16px", border:`1px solid ${s.color}22` }}>
            <div style={{ fontSize:22, fontWeight:700, color:s.color }}>{s.count}</div>
            <div style={{ fontSize:12, color:"#888", marginTop:2 }}>{s.label}</div>
          </div>
        ))}
        <button onClick={loadOrders} style={{ width:44, height:44, borderRadius:12, border:"1.5px solid rgba(45,122,88,0.2)", background:"rgba(255,255,255,0.7)", cursor:"pointer", fontSize:18, alignSelf:"center" }}>↻</button>
      </div>

      {orders.length === 0 ? (
        <div style={{ textAlign:"center", padding:"48px 0", color:"#7a9a85" }}>
          <div style={{ fontSize:32, marginBottom:10 }}>✓</div>
          <div style={{ fontSize:14 }}>暂无进行中的订单</div>
        </div>
      ) : (
        // pending 在前，confirmed 在后
        [...orders].sort((a,b) => {
          if (a.status === b.status) return new Date(b.created_at) - new Date(a.created_at);
          return a.status === "pending" ? -1 : 1;
        }).map(order => {
          const isNew = newOrderIds.has(order.id);
          const isExpanded = expanded === order.id;
          const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1];
          const busy = updating === order.id;

          return (
            <div key={order.id} style={{
              background: STATUS_BG[order.status],
              borderRadius:16, marginBottom:10, overflow:"hidden",
              border: isNew ? "2px solid #e09030" : `1px solid ${STATUS_COLOR[order.status]}22`,
              boxShadow: isNew ? "0 0 0 4px rgba(224,144,48,0.15)" : "0 2px 8px rgba(0,0,0,0.06)",
              transition:"box-shadow 0.4s, border 0.4s",
            }}>
              {/* 新订单横幅 */}
              {isNew && (
                <div style={{ background:"#e09030", color:"#fff", fontSize:12, fontWeight:700, padding:"4px 16px", letterSpacing:1 }}>
                  🔔 新订单
                </div>
              )}

              {/* 订单头 */}
              <div onClick={() => setExpanded(isExpanded ? null : order.id)} style={{ padding:"12px 14px", display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
                {/* 状态圆点 */}
                <div style={{ width:10, height:10, borderRadius:"50%", background:STATUS_COLOR[order.status], flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:"#1a3a2a" }}>{order.order_no}</span>
                    <span style={{ fontSize:11, fontWeight:600, color:STATUS_COLOR[order.status], background:STATUS_COLOR[order.status]+"18", padding:"2px 8px", borderRadius:10 }}>
                      {STATUS_LABEL[order.status]}
                    </span>
                  </div>
                  <div style={{ fontSize:12, color:"#888", marginTop:2 }}>
                    共 {order.order_items?.reduce((s,i)=>s+i.quantity,0) ?? 0} 件 · ¥{order.total_amount}
                    <span style={{ marginLeft:8 }}>{new Date(order.created_at).toLocaleTimeString("zh-CN", { hour:"2-digit", minute:"2-digit" })}</span>
                  </div>
                </div>
                <span style={{ color:"#ccc", fontSize:12, flexShrink:0 }}>{isExpanded ? "▲" : "▼"}</span>
              </div>

              {/* 展开明细 */}
              {isExpanded && (
                <div style={{ borderTop:"1px solid rgba(0,0,0,0.05)", padding:"10px 14px 14px" }}>
                  {order.order_items?.map((oi, i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:13, color:"#3a5a46", borderBottom: i < order.order_items.length-1 ? "1px dashed rgba(0,0,0,0.06)" : "none" }}>
                      <span style={{ fontWeight:500 }}>{oi.item_name}</span>
                      <span style={{ color:"#888" }}>× {oi.quantity}　<span style={{ color:"#2d7a58", fontWeight:600 }}>¥{(oi.item_price * oi.quantity).toFixed(2)}</span></span>
                    </div>
                  ))}
                  {order.note && <div style={{ marginTop:8, fontSize:12, color:"#aaa", fontStyle:"italic" }}>备注：{order.note}</div>}

                  {/* 操作按钮 */}
                  <div style={{ display:"flex", gap:8, marginTop:14 }}>
                    {nextStatus && (
                      <button onClick={() => updateStatus(order, nextStatus)} disabled={busy} style={{
                        flex:1, padding:"10px 0",
                        background: busy ? "#ccc" : nextStatus === "completed" ? "#2d7a58" : "#e09030",
                        color:"#fff", border:"none", borderRadius:12,
                        fontSize:14, fontWeight:700, cursor: busy ? "not-allowed" : "pointer",
                        boxShadow: busy ? "none" : "0 3px 12px rgba(0,0,0,0.15)",
                      }}>
                        {busy ? "处理中..." : STATUS_NEXT[order.status]}
                      </button>
                    )}
                    <button onClick={() => updateStatus(order, "cancelled")} disabled={busy} style={{
                      padding:"10px 16px", background:"transparent",
                      color:"#aaa", border:"1px solid #ddd", borderRadius:12,
                      fontSize:13, cursor: busy ? "not-allowed" : "pointer",
                    }}>取消</button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
