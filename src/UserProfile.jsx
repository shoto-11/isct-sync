import { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { GENRE_STYLES, GENRE_EMOJI } from "./constants";
import { BG_COLOR, COMMON_BACK_BTN_STYLE  } from "./constants";
import { User, Building2, Calendar, MapPin, Bell, BellOff,ArrowLeft } from "lucide-react";
export default function UserProfile({ userId, onBack, onEventSelect }) {
  const [profile, setProfile] = useState(null);
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followCount, setFollowCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const currentUid = auth.currentUser?.uid;
  const isOwn = currentUid === userId;

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      const snap = await getDoc(doc(db, "users", userId));
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        const follows = data.follows || [];
        const followers = data.followers || [];
        setFollowCount(follows.length);
        setFollowerCount(followers.length);
        if (currentUid) setIsFollowing(followers.includes(currentUid));
      }
      const q = query(collection(db, "events"), where("createdBy", "==", userId));
      const eventSnap = await getDocs(q);
      setMyEvents(eventSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetchData();
  }, [userId]);

  const handleFollow = async () => {
    if (!currentUid) return;
    const userRef = doc(db, "users", userId);
    const myRef = doc(db, "users", currentUid);
    if (isFollowing) {
      await updateDoc(userRef, { followers: arrayRemove(currentUid) });
      await updateDoc(myRef, { follows: arrayRemove(userId) });
      setIsFollowing(false);
      setFollowerCount(c => c - 1);
    } else {
      await updateDoc(userRef, { followers: arrayUnion(currentUid) });
      await updateDoc(myRef, { follows: arrayUnion(userId) });
      setIsFollowing(true);
      setFollowerCount(c => c + 1);
    }
  };

  if (loading) return <p style={{ padding:24 }}>読み込み中...</p>;
  if (!profile) return <p style={{ padding:24 }}>ユーザーが見つかりません</p>;
    return (
    <div style={s.container}>
      {/* ── 💡 ここから新しいヘッダー ── */}
      <div style={{
        background: "#88203a", 
        padding: "12px 16px", 
        display: "flex", 
        alignItems: "center", 
        position: "sticky", 
        top: 0, 
        zIndex: 100, 
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
      }}>
        <button 
            onClick={onBack}
            style={COMMON_BACK_BTN_STYLE} // 💡 これだけであの綺麗な丸ボタンになります！
            >
            <ArrowLeft size={18} />
        </button>
        {/* タイトル */}
        <h1 style={{ color: "white", fontSize: 17, fontWeight: 900, margin: 0, flex: 1 }}>
          プロフィール詳細
        </h1>
      </div>
        
        <div style={{ maxWidth:720, margin:"0 auto", padding:"0 16px" }}>
        {/* プロフィールヘッダー */}
        <div style={s.profileHeader}>
            {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="avatar" style={s.avatar} />
            ) : (
            <div style={s.avatarPlaceholder}>
            <User size={32} color="#88203a" />
            </div>
            )}

            <div style={s.profileInfo}>
            <h1 style={s.name}>{profile.displayName}</h1>
            <p style={s.subInfo}>{profile.gakuin} / {profile.gakukei}</p>
            <p style={s.subInfo}>{profile.gakunen}</p>
            {profile.organization && (
                <p style={{ ...s.orgInfo, display:"flex", alignItems:"center", gap:4 }}>
                    <Building2 size={13} /> {profile.organization}
                </p>
            )}
            </div>

            {!isOwn && auth.currentUser && (
                <button
                    style={{ 
                    ...s.followBtn, 
                    ...(isFollowing ? s.followingBtn : {}),
                    display: "flex", 
                    alignItems: "center", 
                    gap: 6 
                    }}
                    onClick={handleFollow}
                >
                    {isFollowing ? (
                    <>
                        <BellOff size={14} /> 通知オフにする
                    </>
                    ) : (
                    <>
                        <Bell size={14} /> 通知を受け取る
                    </>
                    )}
                </button>
                )}
        </div>
        {/* 募集中のイベント */}
        <div style={s.sectionHeading}>
        <Calendar size={18} color="#88203a" />
        <span style={s.sectionTitle}>募集中のイベント</span>
        <span style={s.sectionBadge}>全{myEvents.length}件</span>
        </div>

        {myEvents.length === 0 ? (
            <p style={s.empty}>募集中のイベントはありません</p>
        ) : (
            <div style={s.eventList}>
            {myEvents.map(event => {
                const bg = GENRE_STYLES[event.tags?.genre]?.bg || "#F5F5F5";
                const emoji = GENRE_EMOJI[event.tags?.genre] || "📌";
                return (
                <div key={event.id} style={s.eventItem} onClick={() => onEventSelect(event)}>
                    {event.imageUrl ? (
                    <img src={event.imageUrl} alt={event.title} style={s.eventThumb} />
                    ) : (
                    <div style={{ ...s.eventThumb, background:bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>
                        {emoji}
                    </div>
                    )}
                    <div style={s.eventInfo}>
                    <div style={s.eventTitle}>{event.title}</div>
                    <div style={{ ...s.eventMeta, display:"flex", alignItems:"center", gap:6 }}>
                    <Calendar size={11} /> {event.date} <MapPin size={11} /> {event.location}
                    </div>
                    {event.tags?.genre && (
                        <span style={s.eventTag}>{event.tags.genre}</span>
                    )}
                    </div>
                </div>
                );
            })}
            </div>
        )}
        </div>
    </div>
    );
}

const THEME = "#88203a";
const s = {
  container: { background:BG_COLOR, minHeight:"100vh", paddingBottom:40 },
  profileHeader: { background:"white", padding:"20px", display:"flex", alignItems:"flex-start", gap:16, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" },
  backBtn: { background:"none", border:"none", color:THEME, fontSize:14, fontWeight:700, cursor:"pointer", padding:"16px" },
  avatar: { width:80, height:80, borderRadius:"50%", objectFit:"cover", flexShrink:0 },
  avatarPlaceholder: { width:80, height:80, borderRadius:"50%", background:"#F9EAED", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, flexShrink:0 },
  profileInfo: { flex:1 },
  name: { fontSize:20, fontWeight:700, color:"#111", margin:"0 0 4px" },
  subInfo: { fontSize:13, color:"#5A7370", margin:"2px 0" },
  orgInfo: { fontSize:13, color:"#111", fontWeight:600, margin:"4px 0" },
  followBtn: { background:THEME, color:"white", border:"none", borderRadius:999, padding:"8px 20px", fontSize:13, fontWeight:700, cursor:"pointer", flexShrink:0 },
  followingBtn: { background:"white", color:THEME, border:`1.5px solid ${THEME}` },
  followRow: { background:"white", display:"flex", justifyContent:"center", gap:48, padding:"16px", borderTop:"1px solid #F0F0F0", marginBottom:12 },
  followItem: { display:"flex", flexDirection:"column", alignItems:"center", gap:2 },
  followNum: { fontSize:20, fontWeight:700, color:"#111" },
  followLabel: { fontSize:12, color:"#5A7370" },
  followDivider: { width:1, background:"#E0E8E7" },
  sectionHeading: { display:"flex", alignItems:"center", gap:8, padding:"16px 14px 10px", maxWidth:720, margin:"0 auto" },
  sectionTitle: { fontSize:18, fontWeight:700 },
  sectionBadge: { background:"#F9EAED", color:THEME, fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:999 },
  empty: { color:"#5A7370", fontSize:14, textAlign:"center", padding:"32px 0" },
  eventList: { padding:"0 14px", display:"flex", flexDirection:"column", gap:10, maxWidth:720, margin:"0 auto" },
  eventItem: { background:"white", borderRadius:12, padding:"12px", display:"flex", gap:12, alignItems:"center", cursor:"pointer", boxShadow:"0 1px 5px rgba(0,0,0,0.06)" },
  eventThumb: { width:64, height:64, borderRadius:8, objectFit:"cover", flexShrink:0 },
  eventInfo: { flex:1 },
  eventTitle: { fontSize:14, fontWeight:700, color:"#111", marginBottom:4 },
  eventMeta: { fontSize:11, color:"#5A7370", marginBottom:4 },
  eventTag: { background:"#F9EAED", color:THEME, fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:999 },
};