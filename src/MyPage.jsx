import { useState, useEffect } from "react";
import { db, auth, storage } from "./firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const GENRE_STYLES = {
  "#起業・ビジネス": { bg:"#E3F2FD" },
  "#キャリア・就活": { bg:"#E8F5E9" },
  "#文化・芸術":     { bg:"#FFF3E0" },
  "#スポーツ・交流": { bg:"#F3E5F5" },
  "#スキルアップ":   { bg:"#E0F2F1" },
  "#研究・産学連携": { bg:"#FFF8E7" },
};

const GENRE_EMOJI = {
  "#起業・ビジネス": "💼",
  "#キャリア・就活": "🎓",
  "#文化・芸術":     "🎨",
  "#スポーツ・交流": "⚽",
  "#スキルアップ":   "📚",
  "#研究・産学連携": "🔬",
};

const GAKUIN = {
  "理学院": ["数学系", "物理学系", "化学系", "地球惑星科学系"],
  "工学院": ["機械系", "システム制御系", "電気電子系", "情報通信系", "経営工学系"],
  "物質理工学院": ["材料系", "応用化学系"],
  "情報理工学院": ["数理・計算科学系", "情報工学系"],
  "生命理工学院": ["生命理工学系"],
  "環境・社会理工学院": ["建築学系", "土木・環境工学系", "融合理工学系"],
};

const GAKUNEN = [
  "学部1年", "学部2年", "学部3年", "学部4年",
  "修士1年", "修士2年",
  "博士1年", "博士2年", "博士3年",
  "教員",
];

const GENDER = ["男", "女", "回答しない"];

export default function MyPage({ onEventSelect }) {
  const [profile, setProfile] = useState(null);
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  // 編集用state
  const [editName, setEditName] = useState("");
  const [editGakuin, setEditGakuin] = useState("");
  const [editGakukei, setEditGakukei] = useState("");
  const [editGakunen, setEditGakunen] = useState("");
  const [editGender, setEditGender] = useState("");
  const [likedEvents, setLikedEvents] = useState([]);
const [joinedEvents, setJoinedEvents] = useState([]);
const [followCount, setFollowCount] = useState(0);
const [followerCount, setFollowerCount] = useState(0);

// 履歴用state
  const [history, setHistory] = useState([]);

  const uid = auth.currentUser?.uid;

  useEffect(() => {
  const fetchData = async () => {
    if (!uid) return;
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const data = snap.data();
      setProfile(data);
      setFollowCount((data.follows || []).length);
        setFollowerCount((data.followers || []).length);
      setAvatarUrl(data.avatarUrl || null);
      setEditName(data.displayName || "");
      setEditGakuin(data.gakuin || "");
      setEditGakukei(data.gakukei || "");
      setEditGakunen(data.gakunen || "");
      setEditGender(data.gender || "");
    }
    const q = query(collection(db, "events"), where("createdBy", "==", uid));
    const eventSnap = await getDocs(q);
    setMyEvents(eventSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    // 履歴を取得
    const key = `history_${uid}`;
    const hist = JSON.parse(localStorage.getItem(key) || "[]");
    setHistory(hist);
    // いいね・参加予定のイベント取得
    const statsSnap = await getDocs(collection(db, "eventStats"));
    const eventsSnap = await getDocs(collection(db, "events"));
    const allEvents = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const liked = [];
    const joined = [];

    statsSnap.docs.forEach(d => {
    const data = d.data();
    const event = allEvents.find(e => e.id === data.eventId);
    if (!event) return;
    if ((data.likes || []).some(l => l.uid === uid)) liked.push(event);
    if ((data.joins || []).some(j => j.uid === uid)) joined.push(event);
    });

    setLikedEvents(liked);
    setJoinedEvents(joined);
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
    const updated = {
      displayName: editName,
      gakuin: editGakuin,
      gakukei: editGakukei,
      gakunen: editGakunen,
      gender: editGender,
    };
    await updateDoc(doc(db, "users", uid), updated);
    setProfile(prev => ({ ...prev, ...updated }));
    setEditMode(false);
  };

  if (loading) return <p style={{ padding:24, color:"#5A7370" }}>読み込み中...</p>;

  return (
    <div style={s.outer}>
      <div style={s.container}>

        {/* ── プロフィールヘッダー ── */}
        <div style={s.profileHeader}>
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

          <div style={s.nameRow}>
            <h2 style={s.name}>{profile?.displayName}</h2>
            <button style={s.editBtn} onClick={() => setEditMode(!editMode)}>
              {editMode ? "✕ 閉じる" : "✏️ 編集"}
            </button>
          </div>

          <p style={s.email}>{auth.currentUser?.email}</p>

          <div style={s.followRow}>
            <div style={s.followItem}>
                <span style={s.followNum}>{followCount}</span>
                <span style={s.followLabel}>フォロー</span>
            </div>
            <div style={s.followDivider} />
            <div style={s.followItem}>
                <span style={s.followNum}>{followerCount}</span>
                <span style={s.followLabel}>フォロワー</span>
            </div>
            </div>
        </div>

        {/* ── プロフィール編集 ── */}
        {editMode && (
          <div style={s.editBox}>
            <h3 style={s.editTitle}>プロフィール編集</h3>

            <div style={s.editSection}>
              <label style={s.editLabel}>表示名</label>
              <input
                style={s.editInput}
                value={editName}
                onChange={e => setEditName(e.target.value)}
              />
            </div>

            <div style={s.editSection}>
              <label style={s.editLabel}>学院</label>
              <div style={s.optionGrid}>
                {Object.keys(GAKUIN).map(g => (
                  <button
                    key={g}
                    style={{ ...s.optionBtn, ...(editGakuin === g ? s.optionBtnActive : {}) }}
                    onClick={() => { setEditGakuin(g); setEditGakukei(""); }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {editGakuin && (
              <div style={s.editSection}>
                <label style={s.editLabel}>学系</label>
                <div style={s.optionGrid}>
                  {GAKUIN[editGakuin].map(k => (
                    <button
                      key={k}
                      style={{ ...s.optionBtn, ...(editGakukei === k ? s.optionBtnActive : {}) }}
                      onClick={() => setEditGakukei(k)}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={s.editSection}>
              <label style={s.editLabel}>学年・教職員</label>
              <div style={s.optionGrid}>
                {GAKUNEN.map(g => (
                  <button
                    key={g}
                    style={{ ...s.optionBtn, ...(editGakunen === g ? s.optionBtnActive : {}) }}
                    onClick={() => setEditGakunen(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div style={s.editSection}>
              <label style={s.editLabel}>性別</label>
              <div style={s.optionGrid}>
                {GENDER.map(g => (
                  <button
                    key={g}
                    style={{ ...s.optionBtn, ...(editGender === g ? s.optionBtnActive : {}) }}
                    onClick={() => setEditGender(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div style={s.editBtnRow}>
              <button style={s.cancelBtn} onClick={() => setEditMode(false)}>キャンセル</button>
              <button style={s.saveBtn} onClick={handleSaveProfile}>保存する</button>
            </div>
          </div>
        )}

        {/* ── 基本情報 ── */}
        {!editMode && (
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
        )}

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
                myEvents.map(event => {
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
                        <div style={s.eventMeta}>📅 {event.date} 📍 {event.location}</div>
                    </div>
                    </div>
                );
                })
            )
            )}
            {activeTab === "liked" && (
                likedEvents.length === 0 ? (
                    <p style={s.empty}>いいねしたイベントはありません</p>
                ) : (
                    likedEvents.map(event => {
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
                            <div style={s.eventMeta}>📅 {event.date} 📍 {event.location}</div>
                        </div>
                        </div>
                    );
                    })
                )
                )}

                {activeTab === "joined" && (
                joinedEvents.length === 0 ? (
                    <p style={s.empty}>参加予定のイベントはありません</p>
                ) : (
                    joinedEvents.map(event => {
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
                            <div style={s.eventMeta}>📅 {event.date} 📍 {event.location}</div>
                        </div>
                        </div>
                    );
                    })
                )
                )}
          {activeTab === "history" && (
                history.length === 0 ? (
                    <p style={s.empty}>閲覧履歴はありません</p>
                ) : (
                    history.map(event => {
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
                            <div style={s.eventMeta}>📅 {event.date} 📍 {event.location}</div>
                        </div>
                        </div>
                    );
                    })
                )
                )}
        </div>

      </div>
    </div>
  );
}

const THEME = "#88203a";
const s = {
  outer: { background:"#F4F6F5", minHeight:"100vh", padding:"0 0 40px" },
  container: { maxWidth:720, margin:"0 auto", display:"flex", flexDirection:"column", gap:12 },
  profileHeader: { background:"white", padding:"24px 20px", display:"flex", flexDirection:"column", alignItems:"center", gap:10, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" },
  avatarWrap: { position:"relative", width:90, height:90 },
  avatar: { width:90, height:90, borderRadius:"50%", objectFit:"cover" },
  avatarPlaceholder: { width:90, height:90, borderRadius:"50%", background:"#F4F6F5", display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid #E0E8E7" },
  avatarEditBtn: { position:"absolute", bottom:0, right:0, background:THEME, color:"white", border:"none", borderRadius:"50%", width:28, height:28, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
  nameRow: { display:"flex", alignItems:"center", gap:8 },
  name: { fontSize:20, fontWeight:900, color:"#111", margin:0 },
  editBtn: { background:"none", border:`1px solid ${THEME}`, color:THEME, borderRadius:6, padding:"3px 10px", fontSize:12, fontWeight:700, cursor:"pointer" },
  email: { fontSize:12, color:"#5A7370", margin:0 },
  followRow: { display:"flex", gap:24, alignItems:"center" },
  followItem: { display:"flex", flexDirection:"column", alignItems:"center", gap:2 },
  followNum: { fontSize:18, fontWeight:900, color:"#111" },
  followLabel: { fontSize:11, color:"#5A7370" },
  followDivider: { width:1, height:30, background:"#E0E8E7" },
  editBox: { background:"white", borderRadius:12, padding:"20px", margin:"0 14px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", display:"flex", flexDirection:"column", gap:16 },
  editTitle: { fontSize:16, fontWeight:900, color:"#111", margin:0 },
  editSection: { display:"flex", flexDirection:"column", gap:8 },
  editLabel: { fontSize:12, fontWeight:700, color:"#5A7370", letterSpacing:"0.05em" },
  editInput: { width:"100%", padding:"10px 12px", border:"1.5px solid #D0DDD9", borderRadius:8, fontSize:14, outline:"none", fontFamily:"inherit" },
  optionGrid: { display:"flex", flexWrap:"wrap", gap:8 },
  optionBtn: { padding:"6px 14px", borderRadius:999, border:"1.5px solid #D0DDD9", background:"white", fontSize:12, fontWeight:600, color:"#5A7370", cursor:"pointer" },
  optionBtnActive: { background:THEME, color:"white", border:`1.5px solid ${THEME}` },
  editBtnRow: { display:"flex", gap:10, justifyContent:"flex-end" },
  saveBtn: { padding:"10px 24px", background:THEME, color:"white", border:"none", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer" },
  cancelBtn: { padding:"10px 24px", background:"#F4F6F5", color:"#5A7370", border:"none", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer" },
  infoBox: { background:"white", margin:"0 14px", borderRadius:12, padding:"16px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", display:"flex", flexDirection:"column", gap:10 },
  infoRow: { display:"flex", justifyContent:"space-between", alignItems:"center" },
  infoLabel: { fontSize:13, color:"#5A7370", fontWeight:600 },
  infoValue: { fontSize:13, fontWeight:700, color:"#111" },
  infoDivider: { height:1, background:"#F0F0F0" },
  tabs: { display:"flex", background:"white", borderBottom:"1px solid #E0E8E7", margin:"0" },
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