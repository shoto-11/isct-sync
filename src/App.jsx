import { useState, useEffect, useRef } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { useParams } from "react-router-dom";

import Login from "./Login";
import ProfileSetup from "./ProfileSetup";
import GroupSetup from "./GroupSetup";
import EventList from "./EventList";
import PostEvent from "./PostEvent";
import EventDetail from "./EventDetail";
import UserProfile from "./UserProfile";
import Search from "./Search";
import MyPage from "./MyPage";
import Contact from "./Contact";
import AdminPanel from "./AdminPanel";

import logo from "./assets/logo.png";
import { BG_COLOR } from "./constants";
import {
  Search as SearchIcon, User, Menu, Home, PenLine,
  Mail, LogOut, LogIn, Settings, ChevronRight,
} from "lucide-react";
import GroupProfile from "./GroupProfile";

const THEME = "#88203a";

// ─── MainLayout: App の外で定義することで再マウントを防ぐ ────────────
// ─── MainLayout: App の外で定義することで再マウントを防ぐ ────────────
function MainLayout({
  children,
  user, menuProfile, isAdmin,
  menuOpen, setMenuOpen,
  showContact, setShowContact,
  noticeItems, noticeIndex, // ←これらは後ほどEventListへ移動させるためここでは使わなくなります
  navigate,
}) {
  return (
    <div style={{ background: BG_COLOR, minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ── Header ── */}
      <header style={s.header}>
        <div style={s.headerTop}>
          {/* 💡 navigate("/") から window.location.href = "/" に差し替えることで、強制リロードを走らせます */}
          <img 
            src={logo} 
            alt="SYNC" 
            style={{ ...s.logoImg, cursor: "pointer" }} 
            onClick={() => window.location.href = "/"} 
          />
          <div style={s.headerIcons}>
            <button style={s.iconBtn} onClick={() => navigate("/search")}>
              <SearchIcon size={20} /><span>さがす</span>
            </button>
            <button style={s.iconBtn} onClick={() => navigate("/mypage")}>
              <User size={20} /><span>マイページ</span>
            </button>
            <button style={s.iconBtn} onClick={() => setMenuOpen(true)}>
              <Menu size={20} /><span>メニュー</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <div style={{ flex: 1 }}>{children}</div>

      {/* ── FAB ── */}
      <button style={s.fab} onClick={() => {
        if (!user) { navigate("/login"); return; }
        navigate("/post");
      }}>
        ＋ イベントを作る
      </button>

      {/* ── Footer ── */}
      <footer style={s.footer}>
        <img src={logo} alt="SYNC" style={s.footerLogo} />
        <p style={s.footerDesc}>東京科学大学専用イベント募集プラットフォーム</p>
        <div style={s.footerLinks}>
          <button style={s.footerLink} onClick={() => navigate("/")}>ホーム</button>
          <span style={s.footerDivider}>|</span>
          <button style={s.footerLink} onClick={() => navigate("/mypage")}>マイページ</button>
          <span style={s.footerDivider}>|</span>
          <button style={s.footerLink} onClick={() => setShowContact(true)}>お問い合わせ</button>
        </div>
        <p style={s.footerCopy}>© 2026 ISCT Sync. All rights reserved.</p>
      </footer>

      {/* ── Contact overlay ── */}
      {showContact && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: BG_COLOR, overflowY: "auto" }}>
          <Contact onBack={() => setShowContact(false)} />
        </div>
      )}

      {/* ── Menu Overlay ── */}
      {menuOpen && <div style={s.overlay} onClick={() => setMenuOpen(false)} />}

      {/* ── Menu Drawer ── */}
        <div style={{ ...s.menu, transform: menuOpen ? "translateX(0)" : "translateX(100%)" }}>
          
          {/* 💡 ユーザー情報エリアのレイアウト調整 */}
          <div style={{ ...s.menuUserSection, display: "flex", alignItems: "center", gap: 14, padding: "20px 16px" }}>
            
            {/* 💡 アバター画像表示部分 */}
            {menuProfile?.avatarUrl ? (
              <img 
                src={menuProfile.avatarUrl} 
                alt="avatar" 
                style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid rgba(255,255,255,0.4)" }} 
              />
            ) : (
              <div style={s.menuAvatar}>
                <User size={24} color="white" />
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...s.menuUserName, fontSize: 15, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {menuProfile?.displayName || user?.email || "ログインしていません"}
              </div>
              {user && (
                <div style={{ ...s.menuUserEmail, fontSize: 12, color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
                  {user.email}
                </div>
              )}
            </div>
          </div>

        <div style={s.menuItems}>
          {[
            { icon: <Home size={18} />, label: "ホーム", to: "/" },
            { icon: <User size={18} />, label: "マイページ", to: "/mypage" },
            { icon: <PenLine size={18} />, label: "イベントを作る", to: "/post" },
          ].map(({ icon, label, to }) => (
            <button key={to} style={s.menuItem} onClick={() => { navigate(to); setMenuOpen(false); }}>
              <span style={s.menuItemLeft}>{icon}&nbsp; {label}</span>
              <ChevronRight size={16} color="#B0BEC5" />
            </button>
          ))}
          <button style={s.menuItem} onClick={() => { setShowContact(true); setMenuOpen(false); }}>
            <span style={s.menuItemLeft}><Mail size={18} />&nbsp; お問い合わせ</span>
            <ChevronRight size={16} color="#B0BEC5" />
          </button>
          {user ? (
            <button style={{ ...s.menuItem, color: "#C62828" }} onClick={() => { signOut(auth); setMenuOpen(false); }}>
              <span style={{ ...s.menuItemLeft, color: "#C62828" }}><LogOut size={18} />&nbsp; ログアウト</span>
              <ChevronRight size={16} color="#B0BEC5" />
            </button>
          ) : (
            <button style={s.menuItem} onClick={() => { navigate("/login"); setMenuOpen(false); }}>
              <span style={s.menuItemLeft}><LogIn size={18} />&nbsp; ログイン</span>
              <ChevronRight size={16} color="#B0BEC5" />
            </button>
          )}
          {user && isAdmin && (
            <>
              <button style={s.menuItem} onClick={() => { navigate("/admin"); setMenuOpen(false); }}>
                <span style={s.menuItemLeft}><Settings size={18} />&nbsp; 管理者パネル</span>
                <ChevronRight size={16} color="#B0BEC5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── イベント詳細ラッパー ──────────────────────────────────────────
function EventPageWrapper({ user }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => setAuthChecked(true));
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

  useEffect(() => { window.scrollTo(0, 0); }, [eventId]);

  if (loading || !authChecked) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: BG_COLOR }} />
  );
  if (!event) return <p style={{ padding: 24 }}>イベントが見つかりません</p>;

  if (!user) return (
    <div style={{ background: BG_COLOR, minHeight: "100vh" }}>
      <div style={{ padding: "8px 16px", maxWidth: 720, margin: "0 auto" }}>
        <button style={s.textBtn} onClick={() => navigate(-1)}>← 戻る</button>
      </div>
      {event.imageUrl
        ? <img src={event.imageUrl} alt={event.title} style={{ width: "100%", maxWidth: 720, display: "block", margin: "0 auto" }} />
        : <div style={{ width: "100%", maxWidth: 720, aspectRatio: "16/9", background: "#F5F5F5", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80 }}>📌</div>
      }
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#111" }}>{event.title}</h1>
        <div style={{ background: "white", borderRadius: 12, padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
          <span style={{ fontSize: 40 }}>🔒</span>
          <p style={{ fontSize: 15, color: "#5A7370", fontWeight: 600 }}>イベントの詳細を見るにはログインが必要です</p>
          <button style={s.primaryBtn} onClick={() => navigate("/login")}>ログイン</button>
        </div>
      </div>
    </div>
  );

  return <EventDetail event={event} onBack={() => navigate(-1)} />;
}

// ─── ユーザープロフィールラッパー ─────────────────────────────────
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
// ─── 👥 サークルプロフィールラッパー ─────────────────────────────────
function GroupProfileWrapper() {
  const { groupId } = useParams(); // URLからサークルID (:groupId) を引っこ抜く
  const navigate = useNavigate();
  return (
    <GroupProfile
      groupId={groupId}
      onBack={() => navigate(-1)}
      onEventSelect={(event) => navigate(`/events/${event.id}`)}
    />
  );
}
// ─── メイン App ───────────────────────────────────────────────────
export default function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileDone, setProfileDone] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [menuProfile, setMenuProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [noticeItems, setNoticeItems] = useState([{ text: "【新着】イベントを投稿して仲間を集めよう！", link: "" }]);
  const [noticeIndex, setNoticeIndex] = useState(0);
  const [userGroups, setUserGroups] = useState([]);

  // メールリンク処理中フラグ（onAuthStateChanged との競合防止）
  const processingEmailLink = useRef(false);
// 認証状態監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // 💡 【新規追加】グループ用アカウント（一般Gmail等）の個人ログインを大元で完全遮断する
        try {
          const emailClean = u.email ? u.email.toLowerCase() : "";
          const allowedSnap = await getDoc(doc(db, "allowedEmails", emailClean));
          
          if (allowedSnap.exists() && allowedSnap.data().isGroupEmail === true) {
            // 🛑 グループアカウントの侵入を検知した場合、即座にサインアウト
            await signOut(auth);
            
            // ログイン画面（Login.jsx）側にエラーメッセージを伝える
            window.sessionStorage.setItem(
              "login_error", 
              "このアドレスはグループ用として登録されています。個人の学籍メール（m.isct.ac.jp）でログインしてください。"
            );
            
            // 各Stateを初期化して強制的にログイン画面へ送還
            setUser(null);
            setProfileDone(false);
            setMenuProfile(null);
            setUserGroups([]);
            setLoading(false);
            navigate("/login");
            return; // 侵入をここで完全に食い止める
          }
        } catch (checkErr) {
          console.error("App.jsx group account check failed:", checkErr);
        }

        // ⭕ 正常な個人ユーザー（学籍メール等）のみ、以下の既存処理を進める
        setUser(u);
        const snap = await getDoc(doc(db, "users", u.uid));
        const done = snap.exists() && !!snap.data().displayName;
        setProfileDone(done);
        if (snap.exists()) {
          const data = snap.data();
          setMenuProfile(data);
          const groupIds = data.groups || [];
          if (groupIds.length > 0) {
            const groupSnaps = await Promise.all(groupIds.map((id) => getDoc(doc(db, "groups", id))));
            setUserGroups(groupSnaps.filter((s) => s.exists()).map((s) => ({ id: s.id, ...s.data() })));
          } else {
            setUserGroups([]);
          }
        }
        try {
          const configSnap = await getDoc(doc(db, "adminSettings", "config"));
          if (configSnap.exists()) {
            setIsAdmin((configSnap.data().adminUids || []).includes(u.uid));
          }
        } catch (_) {}
      } else {
        // メールリンク処理中は null が来ても無視する
        if (processingEmailLink.current) return;
        setProfileDone(false);
        setMenuProfile(null);
        setUserGroups([]);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [navigate]); // 💡 安全のために依存配列にnavigateを追加
  
  // お知らせ取得
  useEffect(() => {
    const fetchNotice = async () => {
      try {
        const snap = await getDoc(doc(db, "adminSettings", "display"));
        if (snap.exists()) {
          const items = (snap.data().notice?.items || []).filter((i) => i.text);
          if (items.length > 0) setNoticeItems(items);
        }
      } catch (_) {}
    };
    fetchNotice();
  }, []);

  useEffect(() => {
    if (noticeItems.length <= 1) return;
    const timer = setInterval(() => setNoticeIndex((i) => (i + 1) % noticeItems.length), 4000);
    return () => clearInterval(timer);
  }, [noticeItems]);

  const refreshGroups = async () => {
    if (!user) return;
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) return;
    const groupIds = snap.data().groups || [];
    if (groupIds.length > 0) {
      const groupSnaps = await Promise.all(groupIds.map((id) => getDoc(doc(db, "groups", id))));
      setUserGroups(groupSnaps.filter((s) => s.exists()).map((s) => ({ id: s.id, ...s.data() })));
    } else {
      setUserGroups([]);
    }
  };

  // MainLayout に渡す共通 props
  const layoutProps = {
    user, menuProfile, isAdmin,
    menuOpen, setMenuOpen,
    showContact, setShowContact,
    noticeItems, noticeIndex,
    navigate,
  };

  // ローディング
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: THEME }}>
      <img src={logo} alt="SYNC" style={{ height: 60, objectFit: "contain", animation: "pulse 1.5s ease-in-out infinite" }} />
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );

  return (
    <Routes>
      {/* ── 認証・初期設定（ヘッダーなし） ── */}
      <Route path="/login" element={
        user && profileDone ? <Navigate to="/" replace /> : <Login />
      } />
      <Route path="/setup" element={
        !user ? <Navigate to="/login" replace />
          : profileDone ? <Navigate to="/group-setup" replace />
          : <ProfileSetup onComplete={() => setProfileDone(true)} />
      } />
      <Route path="/group-setup" element={
        (() => {
          // メールリンク処理中は個人認証チェックをバイパス（別タブでリンクを開いた場合）
          const processingGroupLink = !!window.localStorage.getItem("groupEmailForVerify");
          if (!processingGroupLink && !user) return <Navigate to="/login" replace />;
          if (!processingGroupLink && !profileDone) return <Navigate to="/setup" replace />;
          return (
            <GroupSetup
              user={user}
              onComplete={async () => { await refreshGroups(); navigate("/"); }}
              onSkip={() => navigate("/")}
            />
          );
        })()
      } />

      {/* ── メインコンテンツ（ヘッダーあり） ── */}
      <Route path="/" element={
        <MainLayout {...layoutProps}>
          {/* 💡 EventListにお知らせデータをバケツリレーで渡します */}
          <EventList 
            user={user} 
            onLoginRequired={() => navigate("/login")} 
            noticeItems={noticeItems}
            noticeIndex={noticeIndex}
          />
        </MainLayout>
      } />
      <Route path="/events/:eventId" element={
        <MainLayout {...layoutProps}>
          <EventPageWrapper user={user} />
        </MainLayout>
      } />
      <Route path="/search" element={
        <MainLayout {...layoutProps}><Search /></MainLayout>
      } />
      <Route path="/mypage" element={
        <MainLayout {...layoutProps}>
          {user
            ? <MyPage user={user} userGroups={userGroups} onEventSelect={(e) => navigate(`/events/${e.id}`)} onGroupsChanged={refreshGroups} />
            : <div style={s.loginPrompt}>
                <p style={s.loginPromptText}>マイページを見るにはログインが必要です</p>
                <button style={s.primaryBtn} onClick={() => navigate("/login")}>ログイン</button>
              </div>
          }
        </MainLayout>
      } />
      <Route path="/post" element={
        <MainLayout {...layoutProps}>
          {user
            ? <PostEvent userGroups={userGroups} onPosted={() => navigate("/")} />
            : <div style={s.loginPrompt}>
                <p style={s.loginPromptText}>イベントを投稿するにはログインが必要です</p>
                <button style={s.primaryBtn} onClick={() => navigate("/login")}>ログイン</button>
              </div>
          }
        </MainLayout>
      } />
      <Route path="/users/:userId" element={
        <MainLayout {...layoutProps}><UserProfileWrapper /></MainLayout>
      } />

      <Route path="/groups/:groupId" element={
        <MainLayout {...layoutProps}><GroupProfileWrapper /></MainLayout>
      } />

      <Route path="/admin" element={<AdminPanel user={user} />} />
      <Route path="/admin/:tab" element={<AdminPanel user={user} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const s = {
  header: { background: THEME, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.3)" },
  headerTop: { display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, padding: "0 40px", maxWidth: 1200, margin: "0 auto", width: "100%" },
  logoImg: { height: 40, objectFit: "contain" },
  headerIcons: { display: "flex", gap: 24, alignItems: "center" },
  iconBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, color: "rgba(255,255,255,0.9)", fontSize: 10, background: "none", border: "none", cursor: "pointer" },
  fab: { position: "fixed", bottom: 24, right: 18, background: THEME, color: "white", border: "none", borderRadius: 999, padding: "12px 20px", fontSize: 14, fontWeight: 900, cursor: "pointer", boxShadow: `0 4px 18px rgba(136,32,58,0.45)`, zIndex: 99 },
  loginPrompt: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", gap: 16 },
  loginPromptText: { fontSize: 15, color: "#5A7370", fontWeight: 600 },
  primaryBtn: { padding: "12px 32px", background: THEME, color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer" },
  textBtn: { background: "none", border: "none", color: THEME, fontSize: 14, fontWeight: 700, cursor: "pointer", padding: "8px 0" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200 },
  menu: { position: "fixed", top: 0, right: 0, bottom: 0, width: 280, background: BG_COLOR, zIndex: 201, boxShadow: "-4px 0 24px rgba(0,0,0,0.15)", transition: "transform 0.3s ease", display: "flex", flexDirection: "column" },
  menuUserSection: { background: THEME, padding: "20px", display: "flex", alignItems: "center", gap: 12 },
  menuAvatar: { width: 48, height: 48, background: "rgba(255,255,255,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  menuUserName: { color: "white", fontSize: 14, fontWeight: 700 },
  menuUserEmail: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2 },
  menuItems: { display: "flex", flexDirection: "column", padding: "8px 16px", flex: 1 },
  menuItem: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 16px", background: "white", border: "none", borderBottom: "1px solid #F0F0F0", fontSize: 14, fontWeight: 600, color: "#1A2E2B", cursor: "pointer", width: "100%", textAlign: "left", borderRadius: 8, marginBottom: 8 },
  menuItemLeft: { display: "flex", alignItems: "center", gap: 8 },
  footer: { background: "#1A1A1A", padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
  footerLogo: { height: 36, objectFit: "contain", opacity: 0.9 },
  footerDesc: { fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center" },
  footerLinks: { display: "flex", alignItems: "center", gap: 8 },
  footerLink: { background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  footerDivider: { color: "rgba(255,255,255,0.3)", fontSize: 12 },
  footerCopy: { fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 8 },
};