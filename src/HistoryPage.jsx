import { useState, useEffect, useCallback } from "react";

const STATUS_LABEL = { pending:"待处理", confirmed:"备餐中", completed:"已完成", cancelled:"已取消" };
const STATUS_COLOR = { pending:"#e09030", confirmed:"#2d7a58", completed:"#7a9a85", cancelled:"#cc4444" };

export default function HistoryPage({ supabase }) {
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [filter,   setFilter]   = useState("all"); // all | completed | cancelled

  const loadOrders = useCallback(async () => {
    setError(null); setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .in("status", ["completed", "cancelled"])
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      setOrders(data ?? []);
    } catch {
      setError("加载失败，请重试");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  const completedCount  = orders.filter(o => o.status === "completed").length;
  const cancelledCount  = orders.filter(o => o.status === "cancelled").length;
  const totalRevenue    = orders.filter(o => o.status === "completed").reduce((s, o) => s + Number(o.total_amount), 0);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", flex:1 }}>
      <div style={{ width:28, height:28, border:"3px solid rgba(45,122,88,0.2)", borderTopColor:"#2d7a58", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* 统计卡片 */}
      <div style={{ padding:"0 16px 12px", display:"flex", gap:10, flexShrink:0 }}>
        <div style={{ flex:1, background:"rgba(255,255,255,0.75)", borderRadius:12, padding:"10px 14px", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.9)" }}>
          <div style={{ fontSize:20, fontWeight:700, color:"#2d7a58" }}>{completedCount}</div>
          <div style={{ fontSize:11, color:"#7a9a85", marginTop:1 }}>已完成</div>
        </div>
        <div style={{ flex:1, background:"rgba(255,255,255,0.75)", borderRadius:12, padding:"10px 14px", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.9)" }}>
          <div style={{ fontSize:20, fontWeight:700, color:"#cc4444" }}>{cancelledCount}</div>
          <div style={{ fontSize:11, color:"#7a9a85", marginTop:1 }}>已取消</div>
        </div>
        <div style={{ flex:2, background:"rgba(255,255,255,0.75)", borderRadius:12, padding:"10px 14px", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.9)" }}>
          <div style={{ fontSize:20, fontWeight:700, color:"#1a3a2a" }}>¥{totalRevenue.toFixed(0)}</div>
          <div style={{ fontSize:11, color:"#7a9a85", marginTop:1 }}>完成订单总额</div>
        </div>
      </div>

      {/* 筛选 Tab */}
      <div style={{ padding:"0 16px 10px", display:"flex", gap:8, flexShrink:0 }}>
        {[["all","全部"], ["completed","已完成"], ["cancelled","已取消"]].map(([v, label]) => (
          <button key={v} onClick={() => setFilter(v)} style={{
            padding:"6px 14px", borderRadius:20, border:"none", cursor:"pointer", fontSize:12,
            background: filter === v ? "#2d7a58" : "rgba(255,255,255,0.7)",
            color: filter === v ? "#fff" : "#5a8a70",
            fontWeight: filter === v ? 600 : 400,
            boxShadow: filter === v ? "0 2px 8px rgba(45,122,88,0.25)" : "none",
            transition:"all 0.2s",
          }}>{label}</button>
        ))}
        <button onClick={loadOrders} style={{ marginLeft:"auto", padding:"6px 10px", borderRadius:20, border:"1px solid rgba(45,122,88,0.2)", background:"transparent", color:"#7a9a85", fontSize:13, cursor:"pointer" }}>↻</button>
      </div>

      {/* 列表 */}
      <div style={{ flex:1, overflowY:"auto", padding:"0 16px 32px" }}>
        {error && (
          <div style={{ padding:"12px 14px", background:"#fff3f0", borderRadius:12, border:"1px solid #fcc", display:"flex", justifyContent:"space-between", marginBottom:10 }}>
            <span style={{ fontSize:13, color:"#c04040" }}>{error}</span>
            <button onClick={loadOrders} style={{ fontSize:12, color:"#2d7a58", border:"none", background:"none", cursor:"pointer" }}>重试</button>
          </div>
        )}

        {filtered.length === 0 && !error && (
          <div style={{ textAlign:"center", padding:"52px 0", color:"#7a9a85" }}>
            <div style={{ fontSize:32, marginBottom:10 }}>◎</div>
            <div style={{ fontSize:14 }}>暂无历史订单</div>
          </div>
        )}

        {filtered.map(order => (
          <div key={order.id} onClick={() => setExpanded(expanded === order.id ? null : order.id)} style={{
            background:"rgba(255,255,255,0.78)", backdropFilter:"blur(12px)",
            borderRadius:16, marginBottom:10, overflow:"hidden",
            border:"1px solid rgba(255,255,255,0.9)",
            boxShadow:"0 2px 10px rgba(45,122,88,0.07)", cursor:"pointer",
          }}>
            <div style={{ padding:"13px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:11, color:"#aaa", marginBottom:3 }}>{order.order_no}</div>
                <div style={{ fontSize:13, fontWeight:600, color:"#1a3a2a" }}>
                  共 {order.order_items?.reduce((s,i)=>s+i.quantity,0) ?? 0} 件 · ¥{order.total_amount}
                </div>
                <div style={{ fontSize:11, color:"#bbb", marginTop:2 }}>
                  {new Date(order.created_at).toLocaleString("zh-CN")}
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:12, fontWeight:600, color:STATUS_COLOR[order.status], background:STATUS_COLOR[order.status]+"18", padding:"3px 10px", borderRadius:20 }}>
                  {STATUS_LABEL[order.status]}
                </span>
                <span style={{ color:"#ccc", fontSize:11 }}>{expanded === order.id ? "▲" : "▼"}</span>
              </div>
            </div>
            {expanded === order.id && (
              <div style={{ borderTop:"1px solid #f0f5f2", padding:"10px 16px 14px" }}>
                {order.order_items?.map((oi, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", fontSize:13, color:"#3a5a46", borderBottom: i < order.order_items.length-1 ? "1px dashed rgba(0,0,0,0.05)" : "none" }}>
                    <span>{oi.item_name} × {oi.quantity}</span>
                    <span style={{ fontWeight:600, color:"#2d7a58" }}>¥{(oi.item_price * oi.quantity).toFixed(2)}</span>
                  </div>
                ))}
                {order.note && <div style={{ marginTop:8, fontSize:12, color:"#aaa", fontStyle:"italic" }}>备注：{order.note}</div>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
