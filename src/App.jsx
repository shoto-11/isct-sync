import { useState, useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Login from "./Login";
import EventList from "./EventList";
import PostEvent from "./PostEvent";
import logo from "./assets/logo.png";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("home");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", color:"#007A6E", fontSize:16 }}>
      読み込み中...
    </div>
  );

  if (!user) return <Login />;

  return (
    <div style={{ background:"#F4F6F5", minHeight:"100vh", paddingBottom:80 }}>

      {/* ── Header ── */}
      <header style={s.header}>
        <div style={s.headerTop}>
          {/* ロゴ画像 */}
          <img src={logo} alt="SYNC" style={s.logoImg} />

          <div style={s.headerIcons}>
            <button style={s.iconBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <span>さがす</span>
            </button>
            <button style={s.iconBtn} onClick={() => signOut(auth)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>ログアウト</span>
            </button>
            <button style={s.iconBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              <span>メニュー</span>
            </button>
          </div>
        </div>
        <div style={s.navTabs}>
          {["home","search","mypage"].map((t, i) => (
            <button key={t} style={{ ...s.navTab, ...(tab===t ? s.navTabActive : {}) }} onClick={() => setTab(t)}>
              {["イベント","さがす","マイページ"][i]}
            </button>
          ))}
        </div>
      </header>

      {/* ── Notice ── */}
      <div style={s.noticeBar}>
        <div style={s.noticeIcon}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#007A6E" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div style={s.noticeText}>【新着】イベントを投稿して仲間を集めよう！</div>
        <div style={{ color:"#B0BEC5", fontSize:16 }}>›</div>
      </div>

      {/* ── Content ── */}
      {tab === "post" ? (
        <PostEvent onPosted={() => { setReload(r => r+1); setTab("home"); }} />
      ) : (
        <EventList key={reload} />
      )}

      {/* ── FAB ── */}
      <button style={s.fab} onClick={() => setTab("post")}>
        ＋ イベントを作る
      </button>

      {/* ── Bottom Nav ── */}
      <div style={s.bottomNav}>
        {[
          { id:"home", label:"ホーム", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/></svg> },
          { id:"search", label:"さがす", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> },
          { id:"post", label:"投稿", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> },
          { id:"mypage", label:"マイページ", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
        ].map(item => (
          <button key={item.id} style={{ ...s.bottomNavItem, ...(tab===item.id ? s.bottomNavActive : {}) }} onClick={() => setTab(item.id)}>
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

    </div>
  );
}

const s = {
  header: { background:"#111", position:"sticky", top:0, zIndex:100, boxShadow:"0 2px 12px rgba(0,0,0,0.3)" },
  headerTop: { display:"flex", alignItems:"center", justifyContent:"space-between", height:60, padding:"0 16px" },
  logoImg: { height:40, objectFit:"contain" },
  headerIcons: { display:"flex", gap:20, alignItems:"center" },
  iconBtn: { display:"flex", flexDirection:"column", alignItems:"center", gap:2, color:"rgba(255,255,255,0.9)", fontSize:10, background:"none", border:"none", cursor:"pointer" },
  navTabs: { display:"flex", borderTop:"1px solid rgba(255,255,255,0.1)" },
  navTab: { flex:1, textAlign:"center", padding:"10px 0", color:"rgba(255,255,255,0.6)", fontSize:13, fontWeight:500, cursor:"pointer", background:"none", border:"none", borderBottom:"2px solid transparent" },
  navTabActive: { color:"white", borderBottom:"2px solid #F5A623" },
  noticeBar: { background:"white", borderLeft:"4px solid #F5A623", margin:"12px 14px", borderRadius:6, padding:"10px 14px", display:"flex", alignItems:"center", gap:10, boxShadow:"0 1px 4px rgba(0,0,0,0.07)" },
  noticeIcon: { background:"#FFF8E7", borderRadius:"50%", width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  noticeText: { fontSize:12.5, color:"#5A7370", flex:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  fab: { position:"fixed", bottom:88, right:18, background:"#F5A623", color:"#111", border:"none", borderRadius:999, padding:"12px 20px", fontSize:14, fontWeight:900, cursor:"pointer", boxShadow:"0 4px 18px rgba(245,166,35,0.45)", zIndex:99 },
  bottomNav: { position:"fixed", bottom:0, left:0, right:0, background:"white", borderTop:"1px solid #E0E8E7", display:"flex", padding:"8px 0 20px", zIndex:100, boxShadow:"0 -2px 12px rgba(0,0,0,0.06)" },
  bottomNavItem: { flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, cursor:"pointer", background:"none", border:"none", color:"#B0BEC5", fontSize:10 },
  bottomNavActive: { color:"#F5A623" },
};