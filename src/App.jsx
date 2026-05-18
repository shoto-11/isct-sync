import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Login from "./Login";
import EventList from "./EventList";
import PostEvent from "./PostEvent";
import ProfileSetup from "./ProfileSetup";
import logo from "./assets/logo.png";
import MyPage from "./MyPage";
import Contact from "./Contact";
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import EventDetail from "./EventDetail";
import UserProfile from "./UserProfile";
import Search from "./Search";
import { BG_COLOR } from "./constants";
import AdminPanel from "./AdminPanel";
import { Search as SearchIcon, User, Menu, Home, PenLine, Mail, LogOut, LogIn, Settings, ChevronRight } from "lucide-react";

function EventPageWrapper({ user }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      setAuthChecked(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDoc(doc(db, "events", eventId));
      if (snap.exists()) setEvent({ id: snap.id, ...snap.data() });
      setLoading(false);
    };
    fetch();
  }, [eventId]);

    useEffect(() => {
      window.scrollTo(0, 0);
    }, [eventId]);

  if (loading || !authChecked) return (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:BG_COLOR  }}>
  </div>
);
  if (!event) return <p style={{ padding:24 }}>イベントが見つかりません</p>;

  if (!user) return (
    <div style={{ background:BG_COLOR, minHeight:"100vh" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 16px", maxWidth:720, margin:"0 auto", width:"100%" }}>
        <button style={{ background:"none", border:"none", color:"#88203a", fontSize:14, fontWeight:700, cursor:"pointer", padding:"8px 0" }} onClick={() => navigate(-1)}>← 戻る</button>
      </div>
      {event.imageUrl ? (
        <img src={event.imageUrl} alt={event.title} style={{ width:"100%", height:"auto", maxWidth:720, display:"block", margin:"0 auto" }} />
      ) : (
        <div style={{ 
          width:"100%", 
          maxWidth:720, 
          aspectRatio:"16/9", 
          background: event.tags?.genre ? 
            ({"#起業・ビジネス":"#E3F2FD","#キャリア・就活":"#E8F5E9","#文化・芸術":"#FFF3E0","#スポーツ・交流":"#F3E5F5","#スキルアップ":"#E0F2F1","#研究・産学連携":"#FFF8E7"}[event.tags.genre] || "#F5F5F5") 
            : "#F5F5F5", 
          margin:"0 auto", 
          display:"flex", 
          alignItems:"center", 
          justifyContent:"center", 
          fontSize:80 
        }}>
          {{"#起業・ビジネス":"💼","#キャリア・就活":"🎓","#文化・芸術":"🎨","#スポーツ・交流":"⚽","#スキルアップ":"📚","#研究・産学連携":"🔬"}[event.tags?.genre] || "📌"}
        </div>
      )}
      <div style={{ maxWidth:720, margin:"0 auto", padding:"20px 16px", display:"flex", flexDirection:"column", gap:16 }}>
        <h1 style={{ fontSize:24, fontWeight:900, color:"#111" }}>{event.title}</h1>
        <div style={{ background:"white", borderRadius:12, padding:"16px", boxShadow:"0 2px 8px rgba(0,0,0,0.07)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:20 }}>📅</span>
            <div>
              <div style={{ fontSize:11, color:"#5A7370", fontWeight:700, marginBottom:2 }}>イベント日時</div>
              <div style={{ fontSize:15, fontWeight:700, color:"#111" }}>
                {event.date}{event.startTime && ` ${event.startTime}`}{event.endTime && ` 〜 ${event.endTime}`}
              </div>
            </div>
          </div>
        </div>
        <div style={{ background:"white", borderRadius:12, padding:"32px 20px", boxShadow:"0 2px 8px rgba(0,0,0,0.07)", display:"flex", flexDirection:"column", alignItems:"center", gap:16, textAlign:"center" }}>
          <span style={{ fontSize:40 }}>🔒</span>
          <p style={{ fontSize:15, color:"#5A7370", fontWeight:600 }}>イベントの詳細を見るにはログインが必要です</p>
          <button style={{ padding:"12px 40px", background:"#88203a", color:"white", border:"none", borderRadius:8, fontSize:15, fontWeight:700, cursor:"pointer" }} onClick={() => navigate('/')}>
            ログイン
          </button>
        </div>
      </div>
    </div>
  );

  return <EventDetail event={event} onBack={() => navigate(-1)} />;
}

function UserProfileWrapper() {
  const { userId } = useParams();
  const navigate = useNavigate();
  return (
    <UserProfile
      userId={userId}
      onBack={() => navigate(-1)}
      onEventSelect={(event) => navigate(`/events/${event.id}`)}
    />
  );
}

export default function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileDone, setProfileDone] = useState(false);
  const [tab, setTab] = useState("home");
  const [reload, setReload] = useState(0);
  const [showLogin, setShowLogin] = useState(false);
  const [pendingEvent, setPendingEvent] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [menuProfile, setMenuProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [noticeItems, setNoticeItems] = useState([]);
const [noticeIndex, setNoticeIndex] = useState(0);

  // メールリンクからのログイン処理
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem("emailForSignIn");
      if (!email) {
        email = window.prompt("確認のためメールアドレスを入力してください");
      }
      signInWithEmailLink(auth, email, window.location.href)
        .then(() => {
          window.localStorage.removeItem("emailForSignIn");
          window.history.replaceState({}, "", "/");
        })
        .catch(err => console.error(err));
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      const wasLoggedOut = !user && u;
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        const done = snap.exists();
        setProfileDone(done);
        setShowLogin(false);
        const userDoc = await getDoc(doc(db, "users", u.uid));
        if (userDoc.exists()) setMenuProfile(userDoc.data());
        // 管理者チェック
          const configSnap = await getDoc(doc(db, "adminSettings", "config"));
          if (configSnap.exists()) {
            const adminUids = configSnap.data().adminUids || [];
            setIsAdmin(adminUids.includes(u.uid));
          }
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

  useEffect(() => {
    if (tab === "post") {
      window.history.pushState({ tab: "post" }, "");
    }
  }, [tab]);

  useEffect(() => {
    const onPopState = (e) => {
      if (tab === "post") setTab("home");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [tab]);

  useEffect(() => {
      const fetchNotice = async () => {
        const snap = await getDoc(doc(db, "adminSettings", "display"));
        if (snap.exists()) {
          const items = snap.data().notice?.items || [];
          const filtered = items.filter(i => i.text);
          setNoticeItems(filtered.length > 0 ? filtered : [{ text:"【新着】イベントを投稿して仲間を集めよう！", link:"" }]);
        }
      };
      fetchNotice();
    }, []);

    useEffect(() => {
      if (noticeItems.length <= 1) return;
      const timer = setInterval(() => {
        setNoticeIndex(i => (i + 1) % noticeItems.length);
      }, 4000);
      return () => clearInterval(timer);
    }, [noticeItems]);

    if (loading) return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#88203a" }}>
        <img src={logo} alt="SYNC" style={{ height:60, objectFit:"contain", animation:"pulse 1.5s ease-in-out infinite" }} />
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      </div>
    );

  if (showLogin) return (
    <Login onBack={() => {
      setPendingEvent(null);
      setShowLogin(false);
    }} />
  );

  if (user && !profileDone) return (
    <ProfileSetup onComplete={() => setProfileDone(true)} />
  );

  return (
    <div style={{ background:BG_COLOR, minHeight:"100vh", display:"flex", flexDirection:"column" }}>

      {/* ── Header ── */}
      <header style={s.header}>
        <div style={s.headerTop}>
          <img
            src={logo}
            alt="SYNC"
            style={{ ...s.logoImg, cursor:"pointer" }}
            onClick={() => { navigate('/'); window.location.reload(); }}
          />
          <div style={s.headerIcons}>
            <button style={s.iconBtn} onClick={() => navigate('/search')}>
              <SearchIcon size={20} />
              <span>さがす</span>
            </button>
            <button style={s.iconBtn} onClick={() => navigate('/mypage')}>
              <User size={20} />
              <span>マイページ</span>
            </button>
            <button style={s.iconBtn} onClick={() => setMenuOpen(true)}>
              <Menu size={20} />
              <span>メニュー</span>
            </button>
          </div>
        </div>
      </header>
      {/* ── Notice ── */}
        <div style={{ ...s.noticeBar, overflow:"hidden", height:48, cursor: noticeItems[noticeIndex]?.link ? "pointer" : "default" }} onClick={() => noticeItems[noticeIndex]?.link && window.open(noticeItems[noticeIndex].link, "_blank")}>
          <div style={{ maxWidth:1200, margin:"0 auto", width:"100%", display:"flex", alignItems:"center", height:"100%" }}>
            <div style={s.noticeIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#007A6E" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div style={{ flex:1, overflow:"hidden", position:"relative", height:"100%", display:"flex", alignItems:"center" }}>
              {noticeItems.map((item, i) => (
                <div key={i} style={{
                  position:"absolute",
                  width:"100%",
                  opacity: i === noticeIndex ? 1 : 0,
                  transform: i === noticeIndex ? "translateY(0)" : i < noticeIndex ? "translateY(-100%)" : "translateY(100%)",
                  transition:"all 0.5s ease",
                  fontSize:13,
                  fontWeight:600,
                  color:"#1A2E2B",
                  whiteSpace:"nowrap",
                  overflow:"hidden",
                  textOverflow:"ellipsis",
                }}>{item.text}</div>
              ))}
            </div>
            <div style={{ color:"#B0BEC5", fontSize:16, flexShrink:0 }}>›</div>
          </div>
        </div>
      {/* ── お問い合わせ ── */}
        {showContact && (
          <div style={{ position:"fixed", inset:0, zIndex:300, background:"#F4F6F5", overflowY:"auto" }}>
            <Contact onBack={() => setShowContact(false)} />
          </div>
        )}
                {/* ── Content ── */}
        <Routes>
          <Route path="/" element={
            <EventList
              user={user}
              pendingEvent={pendingEvent}
              onPendingEventClear={() => setPendingEvent(null)}
              onLoginRequired={(event) => {
                setPendingEvent(event);
                setShowLogin(true);
              }}
            />
          } />
          <Route path="/events/:eventId" element={<EventPageWrapper user={user} />} />
          <Route path="/post" element={
            user ? (
              <PostEvent onPosted={() => { navigate('/'); }} />
            ) : (
              <div style={s.loginPrompt}>
                <p style={s.loginPromptText}>イベントを投稿するにはログインが必要です</p>
                <button style={s.loginPromptBtn} onClick={() => setShowLogin(true)}>ログイン</button>
              </div>
            )
          } />
          <Route path="/mypage" element={
            user ? (
              <MyPage onEventSelect={(event) => navigate(`/events/${event.id}`)} />
            ) : (
              <div style={s.loginPrompt}>
                <p style={s.loginPromptText}>マイページを見るにはログインが必要です</p>
                <button style={s.loginPromptBtn} onClick={() => setShowLogin(true)}>ログイン</button>
              </div>
            )
          } />
          <Route path="/users/:userId" element={<UserProfileWrapper />} />
          <Route path="/search" element={<Search />} />
          <Route path="/admin" element={<AdminPanel user={user} />} />
          <Route path="/admin/:tab" element={<AdminPanel user={user} />} />
        </Routes>

      {/* ── FAB ── */}
      <button data-fab style={s.fab} onClick={() => {
          if (!user) {
            sessionStorage.setItem("pendingPost", "1");
            setShowLogin(true);
            return;
          }
          navigate('/post');
        }}>
          ＋ イベントを作る
        </button>
      {/* ── Footer ── */}
      <div style={{ flex:1 }} />
      {tab !== "post" && (
        <footer style={s.footer}>
          <img src={logo} alt="SYNC" style={s.footerLogo} />
          <p style={s.footerDesc}>東京科学大学専用イベント募集プラットフォーム</p>
          <div style={s.footerLinks}>
            <button style={s.footerLink} onClick={() => setTab("home")}>ホーム</button>
            <span style={s.footerDivider}>|</span>
            <button style={s.footerLink} onClick={() => setTab("mypage")}>マイページ</button>
            <span style={s.footerDivider}>|</span>
            <button style={s.footerLink} onClick={() => setShowContact(true)}>お問い合わせ</button>
          </div>
          <p style={s.footerCopy}>© 2026 ISCT Sync. All rights reserved.</p>
        </footer>
      )}

      {/* ── メニュー オーバーレイ ── */}
        {menuOpen && (
          <div style={s.overlay} onClick={() => setMenuOpen(false)} />
        )}

        {/* ── メニュー ── */}
        <div style={{ ...s.menu, transform: menuOpen ? "translateX(0)" : "translateX(100%)" }}>
          {/* ユーザー情報 */}
          <div style={s.menuUserSection}>
            <div style={s.menuAvatar}>
              {menuProfile?.avatarUrl ? (
                <img src={menuProfile.avatarUrl} alt="avatar" style={{ width:48, height:48, borderRadius:"50%", objectFit:"cover" }} />
              ) : (
                <User size={24} color="white" />
              )}
            </div>
            <div>
              <div style={s.menuUserName}>{menuProfile?.displayName || user?.email || "ログインしていません"}</div>
              {user && <div style={s.menuUserEmail}>{user.email}</div>}
            </div>
          </div>

          {/* メニュー項目 */}
          <div style={s.menuItems}>
            <button style={s.menuItem} onClick={() => { navigate('/'); setMenuOpen(false); }}>
              <span style={s.menuItemLeft}><Home size={18} />&nbsp; ホーム</span>
              <ChevronRight size={16} color="#B0BEC5" />
            </button>
            <button style={s.menuItem} onClick={() => { navigate('/mypage'); setMenuOpen(false); }}>
              <span style={s.menuItemLeft}><User size={18} />&nbsp; マイページ</span>
              <ChevronRight size={16} color="#B0BEC5" />
            </button>
            <button style={s.menuItem} onClick={() => { navigate('/post'); setMenuOpen(false); }}>
              <span style={s.menuItemLeft}><PenLine size={18} />&nbsp; イベントを作る</span>
              <ChevronRight size={16} color="#B0BEC5" />
            </button>
            <div style={s.menuDivider} />
            <button style={s.menuItem} onClick={() => { setShowContact(true); setMenuOpen(false); }}>
              <span style={s.menuItemLeft}><Mail size={18} />&nbsp; お問い合わせ</span>
              <ChevronRight size={16} color="#B0BEC5" />
            </button>
            <div style={s.menuDivider} />
            {user ? (
              <button style={{ ...s.menuItem, color:"#C62828" }} onClick={() => { signOut(auth); setMenuOpen(false); }}>
                <span style={{ ...s.menuItemLeft, color:"#C62828" }}><LogOut size={18} />&nbsp; ログアウト</span>
                <ChevronRight size={16} color="#B0BEC5" />
              </button>
            ) : (
              <button style={s.menuItem} onClick={() => { setShowLogin(true); setMenuOpen(false); }}>
                <span style={s.menuItemLeft}><LogIn size={18} />&nbsp; ログイン</span>
                <ChevronRight size={16} color="#B0BEC5" />
              </button>
            )}
            <div style={s.menuDivider} />
            {user && isAdmin && (
              <button style={s.menuItem} onClick={() => { navigate('/admin'); setMenuOpen(false); }}>
                <span style={s.menuItemLeft}><Settings size={18} />&nbsp; 管理者パネル</span>
                <ChevronRight size={16} color="#B0BEC5" />
              </button>
            )}
          </div>
        </div>

    </div>
  );
}

const THEME = "#88203a";
const s = {
  header: { background: THEME, position:"sticky", top:0, zIndex:100, boxShadow:"0 2px 12px rgba(0,0,0,0.3)" },
  headerTop: { display:"flex", alignItems:"center", justifyContent:"space-between", height:60, padding:"0 40px", maxWidth:1200, margin:"0 auto", width:"100%" },
  logoImg: { height:40, objectFit:"contain" },
  headerIcons: { display:"flex", gap:24, alignItems:"center" },
  iconBtn: { display:"flex", flexDirection:"column", alignItems:"center", gap:2, color:"rgba(255,255,255,0.9)", fontSize:10, background:"none", border:"none", cursor:"pointer" },
  navTabs: { display:"flex", borderTop:"1px solid rgba(255,255,255,0.1)", padding:"0 40px", maxWidth:1200, margin:"0 auto" },
  navTab: { flex:1, textAlign:"center", padding:"10px 0", color:"rgba(255,255,255,0.6)", fontSize:13, fontWeight:500, cursor:"pointer", background:"none", border:"none", borderBottom:"2px solid transparent" },
  navTabActive: { color:"white", borderBottom:"2px solid #F5A623" },
  noticeBar: { background:"white", borderLeft:`4px solid ${THEME}`, margin: window.innerWidth > 768 ? "12px 100px" : "12px 14px", borderRadius:6, padding:"10px 14px", display:"flex", alignItems:"center", gap:10, boxShadow:"0 1px 4px rgba(0,0,0,0.07)", overflow:"hidden", height:48 },
  noticeIcon: { background:"#F9EAED", borderRadius:"50%", width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  noticeText: { fontSize:12.5, color:"#5A7370", flex:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  fab: { position:"fixed", bottom:24, right:18, background:THEME, color:"white", border:"none", borderRadius:999, padding:"12px 20px", fontSize:14, fontWeight:900, cursor:"pointer", boxShadow:`0 4px 18px rgba(136,32,58,0.45)`, zIndex:99 },
  loginPrompt: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 24px", gap:16 },
  loginPromptText: { fontSize:15, color:"#5A7370", fontWeight:600 },
  loginPromptBtn: { padding:"12px 32px", background:THEME, color:"white", border:"none", borderRadius:8, fontSize:15, fontWeight:700, cursor:"pointer" },
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:200 },
  menu: { position:"fixed", top:0, right:0, bottom:0, width:280, background:BG_COLOR, zIndex:201, boxShadow:"-4px 0 24px rgba(0,0,0,0.15)", transition:"transform 0.3s ease", display:"flex", flexDirection:"column" },
  menuHeader: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", background:THEME },
  menuCloseBtn: { background:"none", border:"none", color:"white", fontSize:18, cursor:"pointer", fontWeight:700 },
  menuItems: { display:"flex", flexDirection:"column", padding:"8px 16px", flex:1 },
  menuItem: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 16px", background:"white", border:"none", borderBottom:"1px solid #F0F0F0", fontSize:14, fontWeight:600, color:"#1A2E2B", cursor:"pointer", width:"100%", textAlign:"left", borderRadius:8, marginBottom:8 },
  menuDivider: { height:8, background:BG_COLOR },
menuIcon: { fontSize:18, width:24, textAlign:"center" },

  menuUserSection: { background:THEME, padding:"20px", display:"flex", alignItems:"center", gap:12 },
menuAvatar: { fontSize:32, width:48, height:48, background:"rgba(255,255,255,0.2)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
menuUserName: { color:"white", fontSize:14, fontWeight:700 },
menuUserEmail: { color:"rgba(255,255,255,0.7)", fontSize:11, marginTop:2 },
menuItemLeft: { display:"flex", alignItems:"center", gap:8 },
menuChevron: { color:"#B0BEC5", fontSize:18 },
footer: { background:"#1A1A1A", padding:"32px 24px", display:"flex", flexDirection:"column", alignItems:"center", gap:12, marginTop:0 },
footerLogo: { height:36, objectFit:"contain", opacity:0.9 },
footerDesc: { fontSize:12, color:"rgba(255,255,255,0.5)", textAlign:"center" },
footerLinks: { display:"flex", alignItems:"center", gap:8 },
footerLink: { background:"none", border:"none", color:"rgba(255,255,255,0.7)", fontSize:13, fontWeight:600, cursor:"pointer" },
footerDivider: { color:"rgba(255,255,255,0.3)", fontSize:12 },
footerCopy: { fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:8 },
};