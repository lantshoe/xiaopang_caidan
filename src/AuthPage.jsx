import { useState } from "react";

// ─── 登录页 ───────────────────────────────────────────────────
export default function AuthPage({ supabase }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleGoogleLogin = async () => {
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) { setError(error.message); setLoading(false); }
  };

  return (
    <div style={{
      height:"100dvh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      background:"linear-gradient(160deg,#e8f5ee 0%,#f0faf4 40%,#e4f2f8 100%)",
      fontFamily:"'Noto Sans SC','PingFang SC',sans-serif",
      padding:"0 32px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;600;700&family=Noto+Serif+SC:wght@700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes floatUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .login-card{animation:floatUp 0.5s ease both;}
        .google-btn:active{transform:scale(0.97);}
      `}</style>

      <div className="login-card" style={{ width:"100%", maxWidth:360, textAlign:"center" }}>
        {/* Logo */}
        <div style={{ width:80, height:80, borderRadius:24, background:"linear-gradient(135deg,#2d7a58,#5db88a)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px", boxShadow:"0 8px 32px rgba(45,122,88,0.35)", fontSize:40 }}>
          🍽
        </div>

        <h1 style={{ fontSize:26, fontWeight:700, color:"#1a3a2a", fontFamily:"'Noto Serif SC',serif", marginBottom:8 }}>
          欢迎回来
        </h1>
        <p style={{ fontSize:14, color:"#7a9a85", marginBottom:40, lineHeight:1.6 }}>
          登录后即可点单、管理菜单和采购
        </p>

        {/* Google 登录按钮 */}
        <button
          className="google-btn"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{ width:"100%", padding:"14px 20px", background:"#fff", border:"1.5px solid rgba(45,122,88,0.2)", borderRadius:16, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:12, boxShadow:"0 4px 20px rgba(0,0,0,0.08)", transition:"box-shadow 0.2s" }}
          onMouseEnter={e=>{ if(!loading) e.currentTarget.style.boxShadow="0 6px 24px rgba(0,0,0,0.14)"; }}
          onMouseLeave={e=>e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,0.08)"}
        >
          {loading
            ? <div style={{ width:20, height:20, border:"2px solid #eee", borderTopColor:"#2d7a58", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
            : <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
          }
          <span style={{ fontSize:15, fontWeight:600, color:"#1a3a2a" }}>
            {loading ? "跳转中…" : "使用 Google 账号登录"}
          </span>
        </button>

        {error && (
          <div style={{ marginTop:16, padding:"10px 14px", background:"#fff3f0", borderRadius:10, border:"1px solid #fcc", fontSize:13, color:"#c04040" }}>
            {error}
          </div>
        )}

        <p style={{ marginTop:32, fontSize:11, color:"#b0c8bc", lineHeight:1.6 }}>
          仅限内部成员使用 · 登录信息安全加密
        </p>
      </div>
    </div>
  );
}
