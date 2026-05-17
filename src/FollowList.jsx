import { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { BG_COLOR } from "./constants";

const THEME = "#88203a";
const s = {
  container: { background:BG_COLOR, minHeight:"100vh" },
  header: { background:THEME, padding:"16px 20px", display:"flex", alignItems:"center", gap:16 },
  backBtn: { background:"none", border:"none", color:"white", fontSize:14, fontWeight:700, cursor:"pointer" },
  title: { color:"white", fontSize:18, fontWeight:900, margin:0 },
  empty: { color:"#5A7370", fontSize:14, textAlign:"center", padding:"32px 0" },
  list: { padding:"12px 16px", display:"flex", flexDirection:"column", gap:8, maxWidth:720, margin:"0 auto" },
  item: { borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:12, cursor:"pointer" },
  avatar: { width:48, height:48, borderRadius:"50%", objectFit:"cover", flexShrink:0 },
  avatarPlaceholder: { width:48, height:48, borderRadius:"50%", background:"#F9EAED", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 },
  info: { flex:1 },
  name: { fontSize:15, fontWeight:700, color:"#111" },
  sub: { fontSize:12, color:"#5A7370", marginTop:2 },
};

function UserItem({ user, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        ...s.item,
        background: hovered ? "#F8FAFA" : "white",
        transform: hovered ? "translateY(-2px)" : "none",
        boxShadow: hovered ? "0 6px 20px rgba(0,0,0,0.13)" : "0 2px 8px rgba(0,0,0,0.06)",
        transition: "all 0.18s",
        pointerEvents:"auto",
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="avatar" style={s.avatar} />
      ) : (
        <div style={s.avatarPlaceholder}>👤</div>
      )}
      <div style={s.info}>
        <div style={{ ...s.name, textDecoration: hovered ? "underline" : "none" }}>{user.displayName}</div>
        <div style={s.sub}>{user.gakuin} / {user.gakukei}</div>
      </div>
    </div>
  );
}

export default function FollowList({ userId, type, onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDoc(doc(db, "users", userId));
      if (!snap.exists()) return;
      const data = snap.data();
      const ids = type === "follows" ? (data.follows || []) : (data.followers || []);
      const userList = await Promise.all(ids.map(async uid => {
        const userSnap = await getDoc(doc(db, "users", uid));
        if (userSnap.exists()) return { id: uid, ...userSnap.data() };
        return null;
      }));
      setUsers(userList.filter(Boolean));
      setLoading(false);
    };
    fetch();
  }, [userId, type]);

  return (
    <div style={s.container}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>← 戻る</button>
        <h1 style={s.title}>{type === "follows" ? "フォロー中" : "フォロワー"}</h1>
      </div>

      {loading ? (
        <p style={s.empty}>読み込み中...</p>
      ) : users.length === 0 ? (
        <p style={s.empty}>{type === "follows" ? "フォロー中のユーザーはいません" : "フォロワーはいません"}</p>
      ) : (
        <div style={s.list}>
          {users.map(user => (
            <UserItem key={user.id} user={user} onClick={() => navigate(`/users/${user.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}