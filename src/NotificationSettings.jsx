// src/NotificationSettings.jsx
import { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";
import { BG_COLOR } from "./constants";
import { User, Users, ArrowLeft } from "lucide-react";
import "./animations.css";

const THEME = "#88203a";

export default function NotificationSettings() {
  const { userId } = useParams(); // URLパラメータから対象のユーザーIDを取得 (/notification-settings/:userId)
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentUid = auth.currentUser?.uid;

  useEffect(() => {
    // 🔒 鉄壁のセキュリティーチェック：URLのIDが、今ログインしている自分のIDと違ったら即排除
    if (!currentUid || currentUid !== userId) {
      alert("このページはご本人様以外は閲覧できません。");
      navigate("/mypage"); // マイページへ強制送還
      return;
    }

    const fetchList = async () => {
      try {
        const snap = await getDoc(doc(db, "users", userId));
        if (!snap.exists()) return;
        const data = snap.data();
        
        // マイページで通知オン（follows）に入れたIDの配列を取得
        const ids = data.follows || [];

        const list = await Promise.all(
          ids.map(async (id) => {
            // 1. まず個人ユーザーから探す
            const userSnap = await getDoc(doc(db, "users", id));
            if (userSnap.exists()) {
              return { id, isGroup: false, ...userSnap.data() };
            }
            // 2. なければサークル（groups）から探す
            const groupSnap = await getDoc(doc(db, "groups", id));
            if (groupSnap.exists()) {
              return { id, isGroup: true, ...groupSnap.data() };
            }
            return null;
          })
        );

        setItems(list.filter(Boolean));
      } catch (err) {
        console.error("データの取得に失敗しました", err);
      } finally {
        setLoading(false);
      }
    };

    fetchList();
  }, [userId, currentUid, navigate]);

  // ローディング中、または自分以外の不正アクセスの場合は何も描画しない
  if (loading || currentUid !== userId) {
    return <p style={{ padding: 24, color: "#5A7370", textAlign: "center" }}>読み込み中...</p>;
  }

  return (
    <div style={{ background: BG_COLOR, minHeight: "100vh" }}>
      {/* ── 💡 ヘッダーの全面的書き換え（EventDetailと統一） ── */}
      <div style={{
        background: THEME, // THEME="#88203a" の前提
        padding: "12px 16px", 
        display: "flex", 
        alignItems: "center", 
        position: "sticky", 
        top: 0, 
        zIndex: 100, 
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
      }}>
        {/* 戻るボタン（左端） */}
        <button 
          onClick={() => navigate(-1)} // マイページに戻る
          style={{ 
            background: "rgba(255,255,255,0.15)", 
            border: "none", 
            borderRadius: "50%", 
            width: 36, 
            height: 36, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            color: "white", 
            cursor: "pointer", 
            marginRight: 12 
          }}
        >
          {/* ArrowLeftアイコンを使っていない場合は lucide-react からインポートして使用してください */}
          <ArrowLeft size={18} />
        </button>
        {/* タイトル（中央付近） */}
        <h1 style={{ color: "white", fontSize: 17, fontWeight: 900, margin: 0, flex: 1 }}>
          新着通知設定中のリスト
        </h1>
      </div>

      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8, maxWidth: 720, margin: "0 auto" }}>
        {items.length === 0 ? (
          <p style={{ color: "#5A7370", fontSize: 14, textAlign: "center", padding: "32px 0" }}>通知設定中の対象（ユーザー・サークル）はありません</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              class="event-hover-card"
              style={{
                borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
                background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
              }}
              // 💡 他のページに完全遷移（URL切り替え）
              onClick={() => {
                if (item.isGroup) {
                  navigate(`/groups/${item.id}`);
                } else {
                  navigate(`/users/${item.id}`);
                }
              }}
            >
              {item.avatarUrl ? (
                <img src={item.avatarUrl} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#F9EAED", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.isGroup ? <Users size={18} color={THEME} /> : <User size={18} color={THEME} />}
                </div>
              )}
              
              <div style={{ flex: 1 }}>
                <div  style={{ fontSize: 14, fontWeight: 700, color: "#111", display: "flex", alignItems: "center" }}>
                  <div className="hover-title-underline">
                    {item.displayName}
                    </div>
                  {item.isGroup && (
                    <span style={{ fontSize: 9, background: THEME, color: "white", padding: "2px 6px", borderRadius: 4, marginLeft: 8, fontWeight: 800 }}>
                      サークル
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#5A7370", marginTop: 2 }}>
                  {item.isGroup ? (item.groupType || "団体") : `${item.gakuin || ""} / ${item.gakukei || "未所属"}`}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}