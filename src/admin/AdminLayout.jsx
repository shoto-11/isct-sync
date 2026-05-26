import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom";
import { Settings } from "lucide-react";
import { THEME } from "../constants";

const TABS = [
  { id: "notice", label: "お知らせ", path: "/admin/notice" },
  { id: "carousel", label: "PR広告", path: "/admin/carousel" },
  { id: "events", label: "イベント管理", path: "/admin/events" },
  { id: "proxy_post", label: "イベント代打投稿", path: "/admin/proxy_post" },
  { id: "users", label: "登録者一覧", path: "/admin/users" },
  { id: "groups", label: "グループ一覧", path: "/admin/groups" },
];

export default function AdminLayout({ user, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!user) { setLoading(false); return; }
      const configSnap = await getDoc(doc(db, "adminSettings", "config"));
      if (!configSnap.exists()) { setLoading(false); return; }
      const adminUids = configSnap.data().adminUids || [];
      setIsAdmin(adminUids.includes(user.uid));
      setLoading(false);
    };
    check();
  }, [user]);

  if (loading) return <p style={{ padding: 24 }}>読み込み中...</p>;
  if (!user) return <p style={{ padding: 24 }}>ログインが必要です</p>;
  if (!isAdmin) return <p style={{ padding: 24 }}>管理者権限がありません</p>;

  const activeTab = TABS.find(t => location.pathname === t.path)?.id || "notice";

  return (
    <div style={{ background: "#F4F6F5", minHeight: "100vh" }}>
      {/* ヘッダー */}
      <div style={{ background: THEME, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ color: "white", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <Settings size={20} /> 管理者パネル
        </h1>
        <button
          style={{ background: "none", border: "1px solid white", color: "white", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13 }}
          onClick={() => navigate("/")}
        >
          ← サイトに戻る
        </button>
      </div>

      {/* タブ */}
      <div style={{ display: "flex", background: "white", borderBottom: "1px solid #E0E8E7", overflowX: "auto" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            style={{
              padding: "12px 20px", border: "none", background: "none", fontSize: 13, fontWeight: 600,
              color: activeTab === t.id ? THEME : "#5A7370",
              borderBottom: activeTab === t.id ? `2px solid ${THEME}` : "2px solid transparent",
              cursor: "pointer", whiteSpace: "nowrap"
            }}
            onClick={() => navigate(t.path)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>
        {children}
      </div>
    </div>
  );
}
