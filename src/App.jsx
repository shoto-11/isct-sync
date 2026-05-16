import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Login from "./Login";
import EventList from "./EventList";
import PostEvent from "./PostEvent";
import ProfileSetup from "./ProfileSetup";
import logo from "./assets/logo.png";
import MyPage from "./MyPage";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileDone, setProfileDone] = useState(false);
  const [tab, setTab] = useState("home");
  const [reload, setReload] = useState(0);
  const [showLogin, setShowLogin] = useState(false);
  const [pendingEvent, setPendingEvent] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      const wasLoggedOut = !user && u;
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        const done = snap.exists();
        setProfileDone(done);
        setShowLogin(false);
        if (wasLoggedOut && done && !pendingEvent) {
          if (sessionStorage.getItem("pendingPost")) {
            sessionStorage.removeItem("pendingPost");
            setTab("post");
          }
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);
  // 投稿ページの戻るボタン対応
  useEffect(() => {
    if (tab === "post") {
      window.history.pushState({ tab: "post" }, "");
    }
  }, [tab]);

  useEffect(() => {
    const onPopState = (e) => {
      if (tab === "post") {
        setTab("home");
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [tab]);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", color:"#111", fontSize:16 }}>
      読み込み中...
    </div>
  );

  // ログイン画面
if (showLogin) return (
  <Login onBack={() => {
    setPendingEvent(null);
    setShowLogin(false);
  }} />
);
  // プロフィール未設定
  if (user && !profileDone) return (
    <ProfileSetup onComplete={() => setProfileDone(true)} />
  );

  return (
    <div style={{ background:"#F4F6F5", minHeight:"100vh" }}>

      {/* ── Header ── */}
      <header style={s.header}>
        <div style={s.headerTop}>
          <img
            src={logo}
            alt="SYNC"
            style={{ ...s.logoImg, cursor:"pointer" }}
            onClick={() => {
              setTab("home");
              setReload(r => r + 1);
            }}
          />
          <div style={s.headerIcons}>
            <button style={s.iconBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <span>さがす</span>
            </button>
            {user ? (
              <button style={s.iconBtn} onClick={() => signOut(auth)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span>ログアウト</span>
              </button>
            ) : (
              <button style={s.iconBtn} onClick={() => setShowLogin(true)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span>ログイン</span>
              </button>
            )}
            <button style={s.iconBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              <span>メニュー</span>
            </button>
          </div>
        </div>
        <div style={s.navTabs}>
          {["home","search","mypage"].map((t, i) => (
            <button
              key={t}
              style={{ ...s.navTab, ...(tab===t ? s.navTabActive : {}) }}
              onClick={() => setTab(t)}
            >
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
        user ? (
          <PostEvent onPosted={() => { setReload(r => r+1); setTab("home"); }} />
        ) : (
          <div style={s.loginPrompt}>
            <p style={s.loginPromptText}>イベントを投稿するにはログインが必要です</p>
            <button style={s.loginPromptBtn} onClick={() => setShowLogin(true)}>ログイン</button>
          </div>
        )
      ) : tab === "mypage" ? (
        user ? (
          <MyPage onEventSelect={(event) => {
            setPendingEvent(event);
            setTab("home");
          }} />
        ) : (
          <div style={s.loginPrompt}>
            <p style={s.loginPromptText}>マイページを見るにはログインが必要です</p>
            <button style={s.loginPromptBtn} onClick={() => setShowLogin(true)}>ログイン</button>
          </div>
        )
      ) : (
        <EventList
          key={reload}
          user={user}
          pendingEvent={pendingEvent}
          onPendingEventClear={() => setPendingEvent(null)}
          onLoginRequired={(event) => {
            setPendingEvent(event);
            setShowLogin(true);
          }}
        />
      )}

      {/* ── FAB ── */}
        {tab !== "post" && tab !== "mypage" && (
          <button data-fab style={s.fab} onClick={() => {
            if (!user) {
              sessionStorage.setItem("pendingPost", "1");
              setShowLogin(true);
              return;
            }
            setTab("post");
          }}>
            ＋ イベントを作る
          </button>
        )}

    </div>
  );
}
const THEME = "#88203a";

const s = {
  header: { background: THEME, position:"sticky", top:0, zIndex:100, boxShadow:"0 2px 12px rgba(0,0,0,0.3)" },
  headerTop: { display:"flex", alignItems:"center", justifyContent:"space-between", height:60, padding:"0 16px" },
  logoImg: { height:40, objectFit:"contain" },
  headerIcons: { display:"flex", gap:20, alignItems:"center" },
  iconBtn: { display:"flex", flexDirection:"column", alignItems:"center", gap:2, color:"rgba(255,255,255,0.9)", fontSize:10, background:"none", border:"none", cursor:"pointer" },
  navTabs: { display:"flex", borderTop:"1px solid rgba(255,255,255,0.1)" },
  navTab: { flex:1, textAlign:"center", padding:"10px 0", color:"rgba(255,255,255,0.6)", fontSize:13, fontWeight:500, cursor:"pointer", background:"none", border:"none", borderBottom:"2px solid transparent" },
  navTabActive: { color:"white", borderBottom:"2px solid #F5A623" },
  noticeBar: { background:"white", borderLeft:`4px solid ${THEME}`, margin:"12px 14px", borderRadius:6, padding:"10px 14px", display:"flex", alignItems:"center", gap:10, boxShadow:"0 1px 4px rgba(0,0,0,0.07)" },
  noticeIcon: { background:"#F9EAED", borderRadius:"50%", width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  noticeText: { fontSize:12.5, color:"#5A7370", flex:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  fab: { position:"fixed", bottom:24, right:18, background:THEME, color:"white", border:"none", borderRadius:999, padding:"12px 20px", fontSize:14, fontWeight:900, cursor:"pointer", boxShadow:`0 4px 18px rgba(136,32,58,0.45)`, zIndex:99 },
  loginPrompt: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 24px", gap:16 },
  loginPromptText: { fontSize:15, color:"#5A7370", fontWeight:600 },
  loginPromptBtn: { padding:"12px 32px", background:THEME, color:"white", border:"none", borderRadius:8, fontSize:15, fontWeight:700, cursor:"pointer" },
};