import { useState, useEffect } from "react";
import { db, auth, storage } from "./firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function MyPage({ onEventSelect }) {
  const [profile, setProfile] = useState(null);
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    const fetchData = async () => {
      if (!uid) return;
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        setDisplayName(data.displayName || "");
        setAvatarUrl(data.avatarUrl || null);
      }
      const q = query(collection(db, "events"), where("createdBy", "==", uid));
      const eventSnap = await getDocs(q);
      setMyEvents(eventSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const storageRef = ref(storage, `avatars/${uid}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    setAvatarUrl(url);
    await updateDoc(doc(db, "users", uid), { avatarUrl: url });
    setUploading(false);
  };

  const handleSaveProfile = async () => {
    await updateDoc(doc(db, "users", uid), { displayName });
    setProfile(prev => ({ ...prev, displayName }));
    setEditMode(false);
  };

  if (loading) return <p style={{ padding:24, color:"#5A7370" }}>読み込み中...</p>;

  return (
    <div style={s.container}>

      {/* ── プロフィールヘッダー ── */}
      <div style={s.profileHeader}>
        {/* アイコン */}
        <div style={s.avatarWrap}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" style={s.avatar} />
          ) : (
            <div style={s.avatarPlaceholder}>
              <span style={{ fontSize:36 }}>👤</span>
            </div>
          )}
          <button style={s.avatarEditBtn} onClick={() => document.getElementById("avatarInput").click()}>
            {uploading ? "..." : "📷"}
          </button>
          <input id="avatarInput" type="file" accept="image/*" style={{ display:"none" }} onChange={handleAvatarChange} />
        </div>

        {/* 名前 */}
        {editMode ? (
          <div style={s.editRow}>
            <input
              style={s.editInput}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
            <button style={s.saveBtn} onClick={handleSaveProfile}>保存</button>
            <button style={s.cancelBtn} onClick={() => setEditMode(false)}>キャンセル</button>
          </div>
        ) : (
          <div style={s.nameRow}>
            <h2 style={s.name}>{profile?.displayName}</h2>
            <button style={s.editBtn} onClick={() => setEditMode(true)}>✏️ 編集</button>
          </div>
        )}

        <p style={s.email}>{auth.currentUser?.email}</p>

        {/* フォロー・フォロワー */}
        <div style={s.followRow}>
          <div style={s.followItem}>
            <span style={s.followNum}>0</span>
            <span style={s.followLabel}>フォロー</span>
          </div>
          <div style={s.followDivider} />
          <div style={s.followItem}>
            <span style={s.followNum}>0</span>
            <span style={s.followLabel}>フォロワー</span>
          </div>
        </div>
      </div>

      {/* ── 基本情報 ── */}
      <div style={s.infoBox}>
        <div style={s.infoRow}>
          <span style={s.infoLabel}>🏫 学院</span>
          <span style={s.infoValue}>{profile?.gakuin}</span>
        </div>
        <div style={s.infoDivider} />
        <div style={s.infoRow}>
          <span style={s.infoLabel}>📚 学系</span>
          <span style={s.infoValue}>{profile?.gakukei}</span>
        </div>
        <div style={s.infoDivider} />
        <div style={s.infoRow}>
          <span style={s.infoLabel}>🎓 学年</span>
          <span style={s.infoValue}>{profile?.gakunen}</span>
        </div>
        <div style={s.infoDivider} />
        <div style={s.infoRow}>
          <span style={s.infoLabel}>👤 性別</span>
          <span style={s.infoValue}>{profile?.gender}</span>
        </div>
      </div>

      {/* ── タブ ── */}
      <div style={s.tabs}>
        {[
          { id:"info", label:"募集中" },
          { id:"liked", label:"いいね" },
          { id:"joined", label:"参加予定" },
          { id:"history", label:"閲覧履歴" },
        ].map(t => (
          <button
            key={t.id}
            style={{ ...s.tab, ...(activeTab === t.id ? s.tabActive : {}) }}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── タブコンテンツ ── */}
      <div style={s.tabContent}>
        {activeTab === "info" && (
          myEvents.length === 0 ? (
            <p style={s.empty}>まだ募集中のイベントはありません</p>
          ) : (
            myEvents.map(event => (
              <div key={event.id} style={s.eventItem} onClick={() => onEventSelect(event)}>
                {event.imageUrl && <img src={event.imageUrl} alt={event.title} style={s.eventThumb} />}
                <div style={s.eventInfo}>
                  <div style={s.eventTitle}>{event.title}</div>
                  <div style={s.eventMeta}>📅 {event.date} 📍 {event.location}</div>
                </div>
              </div>
            ))
          )
        )}
        {activeTab === "liked" && <p style={s.empty}>いいねしたイベントはありません</p>}
        {activeTab === "joined" && <p style={s.empty}>参加予定のイベントはありません</p>}
        {activeTab === "history" && <p style={s.empty}>閲覧履歴はありません</p>}
      </div>

    </div>
  );
}

const THEME = "#88203a";
const s = {
  container: { background:"#F4F6F5", minHeight:"100vh", paddingBottom:40 },
  profileHeader: { background:"white", padding:"24px 20px", display:"flex", flexDirection:"column", alignItems:"center", gap:10, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" },
  avatarWrap: { position:"relative", width:90, height:90 },
  avatar: { width:90, height:90, borderRadius:"50%", objectFit:"cover" },
  avatarPlaceholder: { width:90, height:90, borderRadius:"50%", background:"#F4F6F5", display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid #E0E8E7" },
  avatarEditBtn: { position:"absolute", bottom:0, right:0, background:THEME, color:"white", border:"none", borderRadius:"50%", width:28, height:28, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
  nameRow: { display:"flex", alignItems:"center", gap:8 },
  name: { fontSize:20, fontWeight:900, color:"#111", margin:0 },
  editBtn: { background:"none", border:`1px solid ${THEME}`, color:THEME, borderRadius:6, padding:"3px 10px", fontSize:12, fontWeight:700, cursor:"pointer" },
  editRow: { display:"flex", alignItems:"center", gap:8, width:"100%" },
  editInput: { flex:1, padding:"8px 12px", border:"1.5px solid #D0DDD9", borderRadius:8, fontSize:14, outline:"none" },
  saveBtn: { padding:"8px 14px", background:THEME, color:"white", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" },
  cancelBtn: { padding:"8px 14px", background:"#F4F6F5", color:"#5A7370", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" },
  email: { fontSize:12, color:"#5A7370", margin:0 },
  followRow: { display:"flex", gap:24, alignItems:"center" },
  followItem: { display:"flex", flexDirection:"column", alignItems:"center", gap:2 },
  followNum: { fontSize:18, fontWeight:900, color:"#111" },
  followLabel: { fontSize:11, color:"#5A7370" },
  followDivider: { width:1, height:30, background:"#E0E8E7" },
  infoBox: { background:"white", margin:"12px 14px", borderRadius:12, padding:"16px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", display:"flex", flexDirection:"column", gap:10 },
  infoRow: { display:"flex", justifyContent:"space-between", alignItems:"center" },
  infoLabel: { fontSize:13, color:"#5A7370", fontWeight:600 },
  infoValue: { fontSize:13, fontWeight:700, color:"#111" },
  infoDivider: { height:1, background:"#F0F0F0" },
  tabs: { display:"flex", background:"white", borderBottom:"1px solid #E0E8E7", margin:"0 0 12px" },
  tab: { flex:1, padding:"12px 0", border:"none", background:"none", fontSize:13, fontWeight:600, color:"#5A7370", cursor:"pointer", borderBottom:"2px solid transparent" },
  tabActive: { color:THEME, borderBottom:`2px solid ${THEME}` },
  tabContent: { padding:"0 14px" },
  empty: { color:"#5A7370", fontSize:14, textAlign:"center", padding:"32px 0" },
  eventItem: { background:"white", borderRadius:10, padding:"12px", display:"flex", gap:12, alignItems:"center", marginBottom:8, cursor:"pointer", boxShadow:"0 1px 5px rgba(0,0,0,0.06)" },
  eventThumb: { width:60, height:60, borderRadius:8, objectFit:"cover", flexShrink:0 },
  eventInfo: { flex:1 },
  eventTitle: { fontSize:14, fontWeight:700, color:"#111", marginBottom:4 },
  eventMeta: { fontSize:11, color:"#5A7370" },
};