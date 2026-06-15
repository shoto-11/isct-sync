import { useState, useEffect, useRef } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
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

import AdminLayout from "./admin/AdminLayout";
import AdminNotice from "./admin/AdminNotice";
import AdminCarousel from "./admin/AdminCarousel";
import AdminEvents from "./admin/AdminEvents";
import AdminProxyPost from "./admin/AdminProxyPost";
import AdminUsers from "./admin/AdminUsers";
import AdminGroups from "./admin/AdminGroups";


import NotificationSettings from "./NotificationSettings";
import GroupManage from "./GroupManage";
import Guide from "./Guide"; // 💡 追加

import logo from "./assets/logo.png";
import { BG_COLOR, GENRE_STYLES, GENRE_EMOJI } from "./constants";
import {
  Search as SearchIcon, User, Menu, Home, PenLine,
  Mail, LogOut, LogIn, Settings, ChevronRight, Bell, Megaphone, LockKeyhole, HelpCircle,Calendar
} from "lucide-react";
import GroupProfile from "./GroupProfile";

import CalendarPage from "./CalendarPage";


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
  const [notifications, setNotifications] = useState([]);
  const [showNoticeDropdown, setShowNoticeDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [lastChecked, setLastChecked] = useState(() => {
    return localStorage.getItem(`notices_checked_${user?.uid}`) || "1970-01-01T00:00:00.000Z";
  });

  useEffect(() => {
    if (!user?.uid) return;
    const fetchNotifications = async () => {
      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (!userSnap.exists()) return;
        const follows = userSnap.data().follows || [];
        if (follows.length === 0) { setNotifications([]); return; }

        const q = query(collection(db, "events"), where("createdBy", "in", follows.slice(0, 10)));
        const querySnapshot = await getDocs(q);
        const eventList = [];
        const now = new Date();

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          let isExpired = false;
          if (data.deadline) {
            const deadlineStr = data.deadlineTime ? `${data.deadline}T${data.deadlineTime}` : `${data.deadline}T23:59`;
            if (new Date(deadlineStr) < now) isExpired = true;
          }
          
          // 💡 修正：Firestoreの作成日時(createdAt)をミリ秒（タイムスタンプ）に変換。無ければ開催日を基準に。
          const eventTime = data.createdAt?.toMillis 
            ? data.createdAt.toMillis() 
            : (data.createdAt ? new Date(data.createdAt).getTime() : new Date(`${data.date}T00:00:00.000Z`).getTime());

          if (!isExpired) {
            // 💡 eventTime をデータに含めて登録します
            eventList.push({ id: docSnap.id, eventTime, ...data });
          }
        });

       eventList.sort((a, b) => b.eventTime - a.eventTime);
        setNotifications(eventList);
      } catch (error) {
        console.error("通知のフェッチに失敗しました:", error);
      }
    };
    fetchNotifications();
  }, [user, showNoticeDropdown]);

  // パネル外クリックで閉じる処理
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setShowNoticeDropdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 💡 リストの中に、最後にベルを押した時間（lastChecked）よりも新しいイベントが1件でもある場合のみ赤丸を灯す
  const hasUnread = notifications.some(ev => new Date(ev.eventTime) > new Date(lastChecked));
  
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
          <div style={{ ...s.headerIcons }}>
            <style>{`
              .header-icon-btn {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                background: transparent;
                border: none;
                cursor: pointer;
                color: rgba(255, 255, 255, 0.9);
                padding: 6px;             /* 元の程よいボタン内側の余白 */
                border-radius: 50%;        /* ホバー時に綺麗な円形にする */
                position: relative;
                transition: background-color 0.25s ease, color 0.25s ease;
              }
              .header-icon-btn:hover {
                background-color: rgba(255, 255, 255, 0.15);
                color: #ffffff;
              }
              .header-icon-btn:active {
                background-color: rgba(255, 255, 255, 0.25);
              }
            `}</style>

            {/* 💡 ── 【通知マーク】さがすボタンの左隣へ移動 ── */}
            {user && (
              <div style={{ position: "relative", display: "flex", alignItems: "center" }} ref={dropdownRef}>
                <button
                    className="header-icon-btn"
                    onClick={() => {
                      const nextState = !showNoticeDropdown;
                      setShowNoticeDropdown(nextState);
                      
                      if (nextState && user?.uid) {
                        const nowIso = new Date().toISOString();
                        localStorage.setItem(`notices_checked_${user.uid}`, nowIso);
                        setLastChecked(nowIso);
                      }
                    }}
                  >
                  <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Bell size={22} />
                    {/* 未読の赤丸バッジ */}
                    {hasUnread && (
                      <span style={{
                        position: "absolute", top: -2, right: -2, width: 7, height: 7,
                        background: "#E53935", borderRadius: "50%", border: `1px solid ${THEME}`
                      }} />
                    )}
                  </div>
                </button>

                {/* YouTubeスタイルの通知ドロップダウンメニュー */}
                {showNoticeDropdown && (
                  <div style={{
                    position: window.innerWidth < 500 ? "fixed" : "absolute",
                    top: window.innerWidth < 500 ? 56 : 46,
                    right: window.innerWidth < 500 ? 12 : -10,
                    width: window.innerWidth < 500 ? "calc(100vw - 24px)" : 290,
                    maxWidth: 290,
                    background: "white", 
                    borderRadius: 12, 
                    boxShadow: "0 4px 24px rgba(0,0,0,0.22)",
                    zIndex: 1000, 
                    overflow: "hidden", 
                    border: "1px solid #E3ECEB"
                  }}>
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid #E0E8E7", fontWeight: 900, fontSize: 13, color: "#111", background: "#FAFBFB" }}>
                      新着通知イベント ({notifications.length}件)
                    </div>
                    <div style={{ maxHeight: 280, overflowY: "auto" }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: "24px 16px", fontSize: 12, color: "#7A9591", textAlign: "center" }}>
                          通知設定中の新着募集はありません
                        </div>
                      ) : (
                        notifications.map((ev) => {
                          const bg = GENRE_STYLES[ev.tags?.genre]?.bg || "#F5F5F5";
                          const emoji = GENRE_EMOJI[ev.tags?.genre] || "📌";

                          return (
                            <div
                              key={ev.id}
                              onClick={() => {
                                setShowNoticeDropdown(false);
                                navigate(`/events/${ev.id}`);
                              }}
                              style={{
                                padding: "10px 12px", borderBottom: "1px solid #F0F4F3", cursor: "pointer",
                                display: "flex", alignItems: "center", gap: 10, background: "white", textAlign: "left", transition: "background 0.15s"
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "#F4F7F6"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                            >
                              {ev.imageUrl ? (
                                <img src={ev.imageUrl} alt="" style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                              ) : (
                                <div style={{ width: 44, height: 44, borderRadius: 6, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                                  {emoji}</div>
                              )}

                              <div style={{ flex: 1, minWidth: 0 }}>
                                {new Date(ev.eventTime) > new Date(lastChecked) && (
                                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 800, color: THEME, marginBottom: 2 }}>
                                    <Megaphone size={11} />
                                    <span>新着投稿！</span>
                                  </div>
                                )}
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {ev.title}
                                </div>
                                  <div style={{ fontSize: 11, color: "#5A7370", marginTop: 1, display: "flex", alignItems: "center", gap: 3 }}>
                                    {(() => {
                                      const today = new Date();
                                      today.setHours(0, 0, 0, 0);
                                      const rawDates = [];
                                      if (ev.dates && ev.dates.length > 0) rawDates.push(...ev.dates);
                                      else if (ev.date) rawDates.push({ date: ev.date, startTime: ev.startTime });
                                      const upcoming = rawDates
                                        .filter(d => { if (!d?.date) return false; const ed = new Date(d.date); ed.setHours(0,0,0,0); return ed >= today; })
                                        .sort((a, b) => new Date(a.date) - new Date(b.date));
                                      const first = upcoming[0] || null;
                                      const extra = upcoming.length > 1 ? upcoming.length - 1 : 0;
                                      const had = (ev.dates && ev.dates.length > 0) || !!ev.date;
                                      const fmt = (s) => { const [,m,d] = s.split("-"); const w = ["日","月","火","水","木","金","土"][new Date(s).getDay()]; return `${m}-${d}（${w}）`; };
                                      const label = first
                                        ? `${fmt(first.date)}${first.startTime ? ` ${first.startTime}` : ""}${extra > 0 ? ` ほか${extra}日程` : ""}`
                                        : had ? "日程終了" : "通年募集";
                                      return <><Calendar size={11} color="#5A7370" />{label}</>;
                                    })()}
                                  </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button className="header-icon-btn" onClick={() => window.location.href = "/search"}>
              <SearchIcon size={22} />
            </button>

            {/* 💡 【マイページボタン】 */}
            <button className="header-icon-btn" onClick={() => navigate("/mypage")}>
              <User size={22} />
            </button>

            {/* 💡 【メニューボタン】 */}
            <button className="header-icon-btn" onClick={() => setMenuOpen(true)}>
              <Menu size={22} />
            </button>
            
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <div style={{ flex: 1 }}>{children}</div>

      {/* ── FAB ── */}
      <style>{`
        .fab-btn {
          transition: background-color 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease !important;
        }
        .fab-btn:hover {
          background-color: #6d152c !important; /* 💡 ホバー時にテーマカラーより少しだけ深い（濃い）赤色に変化 */
          box-shadow: 0 6px 20px rgba(136,32,58,0.55) !important; /* 💡 浮遊感を増すために影を少し強く */
        }
        .fab-btn:active {
          background-color: #570f22 !important;
          transform: scale(0.96) !important; /* 💡 クリックした瞬間にキュッと少し縮んで押し込まれた感を演出 */
          box-shadow: 0 2px 8px rgba(136,32,58,0.4) !important;
        }
      `}</style>
      <button className="fab-btn" style={s.fab} onClick={() => {
        //if (!user) { navigate("/login"); return; }
        navigate("/post");
      }}>
        ＋ 募集する
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
          <button style={s.footerLink} onClick={() => navigate("/contact")}>お問い合わせ</button>
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
          {/* 💡 元のボタン構造を壊さず、ホバーだけを綺麗に枠内に吸い付かせるスタイルインジェクション */}
          <style>{`
            .menu-drawer-btn {
              display: flex !important;
              align-items: center !important;
              justify-content: space-between !important;
              width: 100% !important;
              box-sizing: border-box !important;
              padding: 16px 14px !important;       /* 内側の余白を均等化 */
              background: #ffffff !important;      /* ベースは綺麗な白 */
              border: none !important;
              border-bottom: 1px solid #F0F0F0 !important; /* 区切り線 */
              font-size: 14px !important;
              font-weight: 600 !important;
              color: #1A2E2B !important;
              cursor: pointer !important;
              text-align: left !important;
              border-radius: 8px !important;       /* 白いボタンの角丸 */
              margin-bottom: 8px !important;       /* ボタン同士の間隔 */
              transition: background-color 0.15s ease, transform 0.1s ease !important;
            }
            
            /* 💡 ホバーした際、ボタンの白い枠の内側だけがズレなく完璧にグレーに染まります */
            .menu-drawer-btn:hover {
              background-color: #F4F6F6 !important; /* 押しやすい上品な極薄グレー */
            }
            
            /* 💡 クリックした瞬間 */
            .menu-drawer-btn:active {
              background-color: #EAECEB !important;
              transform: scale(0.985) !important;   /* わずかに弾むようなクリックフィードバック */
            }
          `}</style>

          {[
            { icon: <Home size={18} />, label: "ホーム", to: "/" },
            { icon: <User size={18} />, label: "マイページ", to: "/mypage" },
            { icon: <PenLine size={18} />, label: "募集する", to: "/post" },
          ].map(({ icon, label, to }) => (
            <button key={to} className="menu-drawer-btn" onClick={() => { navigate(to); setMenuOpen(false); }}>
              <span style={s.menuItemLeft}>{icon}&nbsp; {label}</span>
              <ChevronRight size={16} color="#B0BEC5" />
            </button>
          ))}
          
          <button className="menu-drawer-btn" onClick={() => { navigate("/contact"); setMenuOpen(false); }}>
            <span style={s.menuItemLeft}><Mail size={18} />&nbsp; お問い合わせ</span>
            <ChevronRight size={16} color="#B0BEC5" />
          </button>
          
          {user ? (
            <button className="menu-drawer-btn" style={{ color: "#C62828" }} onClick={() => { signOut(auth); setMenuOpen(false); }}>
              <span style={{ ...s.menuItemLeft, color: "#C62828" }}><LogOut size={18} />&nbsp; ログアウト</span>
              <ChevronRight size={16} color="#B0BEC5" />
            </button>
          ) : (
            <button className="menu-drawer-btn" onClick={() => { navigate("/login"); setMenuOpen(false); }}>
              <span style={s.menuItemLeft}><LogIn size={18} />&nbsp; ログイン</span>
              <ChevronRight size={16} color="#B0BEC5" />
            </button>
          )}
          
          {user && isAdmin && (
            <button className="menu-drawer-btn" onClick={() => { navigate("/admin"); setMenuOpen(false); }}>
              <span style={s.menuItemLeft}><Settings size={18} />&nbsp; 管理者パネル</span>
              <ChevronRight size={16} color="#B0BEC5" />
            </button>
          )}

          <button className="menu-drawer-btn" onClick={() => { navigate("/guide"); setMenuOpen(false); }}>
  <span style={s.menuItemLeft}><HelpCircle size={18} />&nbsp; 使い方ガイド</span>
  <ChevronRight size={16} color="#B0BEC5" />
</button>

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
        {/*<button style={s.textBtn} onClick={() => navigate(-1)}>← 戻る</button>*/}
      </div>
      {event.imageUrl
        ? <img src={event.imageUrl} alt={event.title} style={{ width: "100%", maxWidth: 720, display: "block", margin: "0 auto" }} />
        : <div style={{ width: "100%", maxWidth: 720, aspectRatio: "16/9", background: "#F5F5F5", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80 }}>📌</div>
      }
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111" }}>{event.title}</h1>
        <div style={{ background: "white", borderRadius: 12, padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
          <div style={{ padding: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LockKeyhole size={52} color={THEME} strokeWidth={1.5} />
          </div>
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
  let isProcessing = false; // ← 追加

  const unsubscribe = onAuthStateChanged(auth, async (u) => {
    if (u) {
      if (isProcessing) return; // ← 追加
      isProcessing = true; // ← 追加

      // App.jsx の onAuthStateChanged 内
      try {
        const emailClean = u.email ? u.email.toLowerCase() : "";
        const domain = emailClean.split("@")[1];
        
        // 学籍メール（m.isct.ac.jp）はチェック不要
        if (domain !== "m.isct.ac.jp") {
          const allowedSnap = await getDoc(doc(db, "allowedEmails", emailClean));
          if (allowedSnap.exists() && allowedSnap.data().isGroupEmail === true) {
            await signOut(auth);
            window.sessionStorage.setItem("login_error", "このアドレスはグループ用として登録されています。個人の学籍メール（m.isct.ac.jp）でログインしてください。");
            setUser(null); setProfileDone(false); setMenuProfile(null); setUserGroups([]);
            setLoading(false); navigate("/login");
            return;
          }
        }
      } catch (checkErr) {
        console.error("App.jsx group account check failed:", checkErr);
      }

      try {
        const bannedSnap = await getDoc(doc(db, "bannedUsers", u.uid));
        if (bannedSnap.exists()) {
          await signOut(auth);
          window.sessionStorage.setItem("login_error", "このアカウントは利用停止中です。詳細は管理者にお問い合わせください。");
          setUser(null); setProfileDone(false); setMenuProfile(null); setUserGroups([]);
          setLoading(false); navigate("/login");
          return;
        }
      } catch (banErr) {
        console.error("App.jsx ban check failed:", banErr);
      }

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

      isProcessing = false; // ← 追加

    } else {
      if (processingEmailLink.current) return;
      isProcessing = false; // ← 追加
      setProfileDone(false);
      setMenuProfile(null);
      setUserGroups([]);
    }
    setLoading(false);
  });
  return unsubscribe;
}, [navigate]);

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
          {/* 💡 user={user} をきっちり追加して、コンポーネント側でカード表示を制御できるようにします */}
          <PostEvent user={user} userGroups={userGroups} onPosted={(id) => navigate(`/events/${id}`)} />
        </MainLayout>
      } />
      
      <Route path="/users/:userId" element={
        <MainLayout {...layoutProps}><UserProfileWrapper /></MainLayout>
      } />

      <Route path="/groups/:groupId" element={
        <MainLayout {...layoutProps}>
          <GroupProfileWrapper />
        </MainLayout>
      } />

      <Route path="/groups/:groupId/manage" element={
        <MainLayout {...layoutProps}>
          {/* 💡 マイページから渡されていた navigate 処理をそのまま連動させます */}
          <GroupManage onEventSelect={(event) => navigate(`/events/${event.id}`)} />
        </MainLayout>
      } />

      <Route path="/admin" element={<Navigate to="/admin/notice" replace />} />
      <Route path="/admin/notice" element={<AdminLayout user={user}><AdminNotice /></AdminLayout>} />
      <Route path="/admin/carousel" element={<AdminLayout user={user}><AdminCarousel /></AdminLayout>} />
      <Route path="/admin/events" element={<AdminLayout user={user}><AdminEvents /></AdminLayout>} />
      <Route path="/admin/proxy_post" element={<AdminLayout user={user}><AdminProxyPost /></AdminLayout>} />
      <Route path="/admin/users" element={<AdminLayout user={user}><AdminUsers /></AdminLayout>} />
      <Route path="/admin/groups" element={<AdminLayout user={user}><AdminGroups /></AdminLayout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/notification-settings/:userId" element={
        <MainLayout {...layoutProps}>
          <NotificationSettings />
        </MainLayout>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/contact" element={
        <MainLayout {...layoutProps}>
          <Contact onBack={() => navigate(-1)} />
        </MainLayout>
      } />
      <Route path="/guide" element={<MainLayout {...layoutProps}><Guide /></MainLayout>} />

      <Route path="/calendar" element={
        <MainLayout {...layoutProps}>
          <CalendarPage onEventSelect={(event) => navigate(`/events/${event.id}`)} />
        </MainLayout>
      } />

    </Routes>
  );
}

const s = {
  header: { background: THEME, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.3)" },
  headerTop: { display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, padding: "0 40px", maxWidth: 1200, margin: "0 auto", width: "100%" },
  logoImg: { height: 40, objectFit: "contain" },
  headerIcons: { display: "flex", gap: 12, alignItems: "center" },
  iconBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, color: "rgba(255,255,255,0.9)", fontSize: 10, background: "none", border: "none", cursor: "pointer" },
  fab: { position: "fixed", bottom: 24, right: 18, background: THEME, color: "white", border: "none", borderRadius: 999, padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 18px rgba(136,32,58,0.45)`, zIndex: 99 },
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