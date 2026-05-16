import { useState, useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Login from "./Login";
import EventList from "./EventList";
import PostEvent from "./PostEvent";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("list"); // "list" | "post"
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>読み込み中...</div>;

  if (!user) return <Login onLogin={() => {}} />;

  return (
    <div style={{ background: "#F4F6F5", minHeight: "100vh", fontFamily: "sans-serif" }}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.badge}>ISCT</span>
          <span style={styles.logoText}>Eventsサイト</span>
        </div>
        <button onClick={() => signOut(auth)} style={styles.logoutBtn}>
          ログアウト
        </button>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(tab === "list" ? styles.tabActive : {}) }}
          onClick={() => setTab("list")}
        >
          📅 イベント一覧
        </button>
        <button
          style={{ ...styles.tab, ...(tab === "post" ? styles.tabActive : {}) }}
          onClick={() => setTab("post")}
        >
          ✏️ イベントを作る
        </button>
      </div>

      {/* Content */}
      {tab === "list" ? (
        <>
          <div style={styles.sectionHeading}>募集中のイベント</div>
          <EventList key={reload} />
        </>
      ) : (
        <PostEvent onPosted={() => { setReload(r => r + 1); setTab("list"); }} />
      )}
    </div>
  );
}

const styles = {
  header: {
    background: "#007A6E",
    padding: "0 16px",
    height: 56,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: { display: "flex", alignItems: "center", gap: 8 },
  badge: {
    background: "#C8A84B",
    color: "#0D1B2A",
    fontWeight: 700,
    fontSize: 13,
    padding: "3px 8px",
    borderRadius: 4,
  },
  logoText: { color: "white", fontWeight: 700, fontSize: 15 },
  logoutBtn: {
    background: "rgba(255,255,255,0.2)",
    color: "white",
    border: "none",
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 12,
    cursor: "pointer",
  },
  tabs: {
    display: "flex",
    background: "white",
    borderBottom: "1px solid #E0E8E7",
  },
  tab: {
    flex: 1,
    padding: "12px 0",
    border: "none",
    background: "none",
    fontSize: 13,
    fontWeight: 600,
    color: "#5A7370",
    cursor: "pointer",
    borderBottom: "2px solid transparent",
  },
  tabActive: {
    color: "#007A6E",
    borderBottom: "2px solid #007A6E",
  },
  sectionHeading: {
    padding: "16px 16px 8px",
    fontSize: 15,
    fontWeight: 700,
    color: "#1A2E2B",
  },
};