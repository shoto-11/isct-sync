import { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, getDoc, updateDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";
import { Settings, Calendar, User } from "lucide-react";

const THEME = "#88203a";

export default function AdminPanel({ user }) {
  const { tab } = useParams();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notice, setNotice] = useState("");
  const [events, setEvents] = useState([]);
  const [carouselEventIds, setCarouselEventIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(tab || "notice");
  const navigate = useNavigate();
  const [carouselSearch, setCarouselSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [editingUser, setEditingUser] = useState(null);

useEffect(() => {
    const fetchData = async () => {
      if (!user) { setLoading(false); return; }
      const configSnap = await getDoc(doc(db, "adminSettings", "config"));
      if (!configSnap.exists()) { setLoading(false); return; }
      const adminUids = configSnap.data().adminUids || [];
      if (!adminUids.includes(user.uid)) { setLoading(false); return; }
      setIsAdmin(true);

      const settingsSnap = await getDoc(doc(db, "adminSettings", "display"));
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        setNotice(data.notice || { items: [{ text:"", link:"" }] });
        const savedCarousel = localStorage.getItem("carouselEventIds");
        if (savedCarousel) {
          setCarouselEventIds(JSON.parse(savedCarousel));
        } else {
          setCarouselEventIds(data.carouselEventIds || []);
        }
      }

      const eventsSnap = await getDocs(collection(db, "events"));
      setEvents(eventsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const usersSnap = await getDocs(collection(db, "users"));
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetchData();
  }, [user]);

const handleSave = async () => {
  setSaving(true);
  try {
    await updateDoc(doc(db, "adminSettings", "display"), {
    notice,
    carouselEventIds,
    });
  } catch {
    const { setDoc } = await import("firebase/firestore");
    await setDoc(doc(db, "adminSettings", "display"), { notice, carouselEventIds });
  }
  setSaving(false);
  alert("保存しました！");
};

  const handleDeleteEvent = async (eventId, title) => {
    if (!window.confirm(`「${title}」を削除しますか？`)) return;
    await deleteDoc(doc(db, "events", eventId));
    setEvents(prev => prev.filter(e => e.id !== eventId));
    alert("削除しました");
  };

    const moveSection = (index, dir) => {
    const newSections = [...sections];
    const target = index + dir;
    if (target < 0 || target >= newSections.length) return;
    [newSections[index], newSections[target]] = [newSections[target], newSections[index]];
    setSections(newSections);
    localStorage.setItem("adminSections", JSON.stringify(newSections));
    };

  const toggleSection = (index) => {
    const newSections = [...sections];
    newSections[index].visible = !newSections[index].visible;
    setSections(newSections);
    localStorage.setItem("adminSections", JSON.stringify(newSections));
    };

    const toggleCarousel = (eventId) => {
    setCarouselEventIds(prev => {
        const next = prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId];
        localStorage.setItem("carouselEventIds", JSON.stringify(next));
        return next;
    });
    };
    const moveCarousel = (eventId, dir) => {
        setCarouselEventIds(prev => {
            const index = prev.indexOf(eventId);
            if (index === -1) return prev;
            const next = [...prev];
            const target = index + dir;
            if (target < 0 || target >= next.length) return prev;
            [next[index], next[target]] = [next[target], next[index]];
            localStorage.setItem("carouselEventIds", JSON.stringify(next));
            return next;
        });
        };

  if (loading) return <p style={{ padding:24 }}>読み込み中...</p>;
  if (!user) return <p style={{ padding:24 }}>ログインが必要です</p>;
  if (!isAdmin) return <p style={{ padding:24 }}>管理者権限がありません</p>;

  return (
    <div style={{ background:"#F4F6F5", minHeight:"100vh" }}>
      {/* ヘッダー */}
      <div style={{ background:THEME, padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <h1 style={{ color:"white", fontSize:18, fontWeight:900, display:"flex", alignItems:"center", gap:8 }}>
        <Settings size={20} /> 管理者パネル
        </h1>
        <button style={{ background:"none", border:"1px solid white", color:"white", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:13 }} onClick={() => navigate('/')}>← サイトに戻る</button>
      </div>

      {/* タブ */}
      <div style={{ display:"flex", background:"white", borderBottom:"1px solid #E0E8E7" }}>
  {[
    { id:"notice", label:"お知らせ" },
    { id:"carousel", label:"PR広告" },
    { id:"events", label:"イベント管理" },
    { id:"users", label:"登録者一覧" },
  ].map(t => (
    <button key={t.id} style={{ padding:"12px 20px", border:"none", background:"none", fontSize:13, fontWeight:600, color: activeTab === t.id ? THEME : "#5A7370", borderBottom: activeTab === t.id ? `2px solid ${THEME}` : "2px solid transparent", cursor:"pointer" }} onClick={() => { setActiveTab(t.id); navigate(`/admin/${t.id}`); }}>
      {t.label}
    </button>
  ))}
</div>

      <div style={{ maxWidth:800, margin:"0 auto", padding:"24px 16px" }}>

        {/* お知らせ */}
        {activeTab === "notice" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <h2 style={{ fontSize:16, fontWeight:700 }}>お知らせ（最大5件）</h2>
            {(notice.items || [{ text:"", link:"" }]).map((item, i) => (
            <div key={i} style={{ background:"white", borderRadius:12, padding:"16px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", display:"flex", flexDirection:"column", gap:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:13, fontWeight:700, color:"#5A7370" }}>お知らせ {i + 1}</span>
                {(notice.items || []).length > 1 && (
                    <button style={{ background:"none", border:"none", color:"#E53935", fontSize:12, fontWeight:700, cursor:"pointer" }} onClick={() => {
                    const newItems = [...(notice.items || [])];
                    newItems.splice(i, 1);
                    setNotice({ ...notice, items: newItems });
                    }}>削除</button>
                )}
                </div>
                <input
                style={{ padding:"10px 14px", border:"1.5px solid #D0DDD9", borderRadius:8, fontSize:14, outline:"none", fontFamily:"inherit" }}
                placeholder="お知らせの文章を入力"
                value={item.text || ""}
                onChange={e => {
                    const newItems = [...(notice.items || [])];
                    newItems[i] = { ...newItems[i], text: e.target.value };
                    setNotice({ ...notice, items: newItems });
                }}
                />
                <input
                style={{ padding:"10px 14px", border:"1.5px solid #D0DDD9", borderRadius:8, fontSize:14, outline:"none", fontFamily:"inherit" }}
                placeholder="リンク（任意）例：https://..."
                value={item.link || ""}
                onChange={e => {
                    const newItems = [...(notice.items || [])];
                    newItems[i] = { ...newItems[i], link: e.target.value };
                    setNotice({ ...notice, items: newItems });
                }}
                />
            </div>
            ))}
            {(notice.items || []).length < 5 && (
            <button style={{ padding:"12px", background:"white", border:"1.5px dashed #D0DDD9", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer", color:"#5A7370" }} onClick={() => {
                const newItems = [...(notice.items || []), { text:"", link:"" }];
                setNotice({ ...notice, items: newItems });
            }}>
                ＋ お知らせを追加
            </button>
            )}
        </div>
        )}
        {/* カルーセル */}
        {activeTab === "carousel" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            
            <h2 style={{ fontSize:16, fontWeight:700 }}>PR広告に表示するイベント（最大10件）</h2>
            {/* 選択済みイベントの順番管理 */}
                {carouselEventIds.length > 0 && (
                <div style={{ background:"white", borderRadius:12, padding:"16px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", marginBottom:8 }}>
                    <h3 style={{ fontSize:14, fontWeight:700, marginBottom:12, color:"#5A7370" }}>選択中（表示順）</h3>
                    {carouselEventIds.map((id, i) => {
                    const event = events.find(e => e.id === id);
                    if (!event) return null;
                    return (
                        <div key={id} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0", borderBottom:"1px solid #F0F0F0" }}>
                        <span style={{ fontSize:13, fontWeight:700, color:THEME, width:24 }}>{i + 1}</span>
                        {event.imageUrl ? (
                            <img src={event.imageUrl} alt={event.title} style={{ width:48, height:27, objectFit:"cover", borderRadius:4, flexShrink:0 }} />
                        ) : (
                            <div style={{ width:48, height:27, background:"#F4F6F5", borderRadius:4, flexShrink:0 }} />
                        )}
                        <span style={{ flex:1, fontSize:13, fontWeight:600 }}>{event.title}</span>
                        <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                            <button style={{ background:"none", border:"1px solid #D0DDD9", borderRadius:4, width:24, height:24, cursor:"pointer", fontSize:12 }} onClick={() => moveCarousel(id, -1)}>↑</button>
                            <button style={{ background:"none", border:"1px solid #D0DDD9", borderRadius:4, width:24, height:24, cursor:"pointer", fontSize:12 }} onClick={() => moveCarousel(id, 1)}>↓</button>
                        </div>
                        <button style={{ padding:"4px 10px", borderRadius:999, border:"1.5px solid #E53935", background:"white", color:"#E53935", fontSize:11, fontWeight:700, cursor:"pointer" }} onClick={() => toggleCarousel(id)}>
                            削除
                        </button>
                        </div>
                    );
                    })}
                </div>
                )}
                <button
                style={{ width:"100%", padding:14, background:THEME, color:"white", border:"none", borderRadius:8, fontSize:15, fontWeight:700, cursor:"pointer" }}
                onClick={handleSave}
                disabled={saving}
                >
                {saving ? "保存中..." : "設定を保存する"}
                </button>
            {/* 検索欄 */}
            <div style={{ display:"flex", gap:8 }}>
            <input
                style={{ flex:1, padding:"10px 14px", border:"1.5px solid #D0DDD9", borderRadius:8, fontSize:14, outline:"none", fontFamily:"inherit" }}
                placeholder="イベント名で検索..."
                value={carouselSearch || ""}
                onChange={e => setCarouselSearch(e.target.value)}
            />
            </div>

            {events
            .filter(event => !carouselSearch || 
                event.title?.includes(carouselSearch) || 
                event.organizerName?.includes(carouselSearch)
                )
            .map(event => (
                <div key={event.id} style={{ background:"white", borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
                    {event.imageUrl ? (
                        <img src={event.imageUrl} alt={event.title} style={{ width:60, height:34, objectFit:"cover", borderRadius:6, flexShrink:0, cursor:"pointer" }} onClick={() => navigate(`/events/${event.id}`)} />
                    ) : (
                        <div style={{ width:60, height:34, background:"#F4F6F5", borderRadius:6, flexShrink:0 }} />
                    )}
                    <div style={{ flex:1, cursor:"pointer" }} onClick={() => navigate(`/events/${event.id}`)}>
                        <div style={{ fontSize:14, fontWeight:700 }}>{event.title}</div>
                        <div style={{ fontSize:11, color:"#5A7370", marginTop:2 }}>{event.organizerName}</div>
                    </div>
                    <button
                        style={{ padding:"6px 16px", borderRadius:999, border:`1.5px solid ${carouselEventIds.includes(event.id) ? THEME : "#D0DDD9"}`, background: carouselEventIds.includes(event.id) ? THEME : "white", color: carouselEventIds.includes(event.id) ? "white" : "#5A7370", fontSize:12, fontWeight:700, cursor:"pointer" }}
                        onClick={() => toggleCarousel(event.id)}
                        disabled={!carouselEventIds.includes(event.id) && carouselEventIds.length >= 11}
                    >
                        {carouselEventIds.includes(event.id) ? "選択中" : "選択"}
                    </button>
                    </div>
            ))}
        </div>
        )}

        {/* イベント管理 */}
                {activeTab === "events" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <h2 style={{ fontSize:16, fontWeight:700 }}>イベント一覧</h2>
            <input
            style={{ padding:"10px 14px", border:"1.5px solid #D0DDD9", borderRadius:8, fontSize:14, outline:"none", fontFamily:"inherit" }}
            placeholder="イベント名・募集者名で検索..."
            value={eventSearch || ""}
            onChange={e => setEventSearch(e.target.value)}
            />
            {events
            .filter(event => !eventSearch || event.title?.includes(eventSearch) || event.organizerName?.includes(eventSearch))
            .map(event => (
                <div key={event.id} style={{ background:"white", borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
                {event.imageUrl ? (
                    <img src={event.imageUrl} alt={event.title} style={{ width:60, height:34, objectFit:"cover", borderRadius:6, flexShrink:0 }} />
                ) : (
                    <div style={{ width:60, height:34, background:"#F4F6F5", borderRadius:6, flexShrink:0 }} />
                )}
                <div style={{ flex:1, cursor:"pointer" }} onClick={() => navigate(`/events/${event.id}`)}>
                    <div style={{ fontSize:14, fontWeight:700 }}>{event.title}</div>
                    <div style={{ fontSize:11, color:"#5A7370", marginTop:2, display:"flex", alignItems:"center", gap:6 }}>
                    <Calendar size={11} /> {event.date} <User size={11} /> {event.organizerName}
                    </div>
                </div>
                <button
                    style={{ padding:"6px 16px", borderRadius:999, border:"1.5px solid #E53935", background:"white", color:"#E53935", fontSize:12, fontWeight:700, cursor:"pointer" }}
                    onClick={() => handleDeleteEvent(event.id, event.title)}
                >
                    削除
                </button>
                </div>
            ))}
        </div>
        )}

        {/* 保存ボタン */}
        {activeTab !== "events" && activeTab !== "users" && activeTab !== "carousel" && (
  <button style={{ marginTop:24, width:"100%", padding:14, background:THEME, color:"white", border:"none", borderRadius:8, fontSize:15, fontWeight:700, cursor:"pointer" }} onClick={handleSave} disabled={saving}>
    {saving ? "保存中..." : "設定を保存する"}
  </button>
)}
        {activeTab === "users" && (
  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
    <h2 style={{ fontSize:16, fontWeight:700 }}>登録者一覧（{users.length}人）</h2>
    <input
      style={{ padding:"10px 14px", border:"1.5px solid #D0DDD9", borderRadius:8, fontSize:14, outline:"none", fontFamily:"inherit" }}
      placeholder="名前・メールアドレスで検索..."
      value={userSearch}
      onChange={e => setUserSearch(e.target.value)}
    />
    {users
      .filter(u => !userSearch || u.displayName?.includes(userSearch) || u.email?.includes(userSearch))
      .map(u => (
        <div key={u.id} style={{ background:"white", borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 2px 8px rgba(0,0,0,0.06)", cursor:"pointer" }} onClick={() => setSelectedUser(u)}>
          {u.avatarUrl ? (
            <img src={u.avatarUrl} alt="avatar" style={{ width:44, height:44, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
          ) : (
            <div style={{ width:44, height:44, borderRadius:"50%", background:"#F9EAED", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <User size={20} color="#88203a" />
            </div>
          )}
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:700 }}>{u.displayName}</div>
            <div style={{ fontSize:11, color:"#5A7370" }}>{u.email} · {u.gakuin} {u.gakukei} · {u.gakunen}</div>
          </div>
        </div>
      ))}

        {/* ユーザー詳細モーダル */}
        {selectedUser && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
            <div style={{ background:"white", borderRadius:16, padding:24, width:"100%", maxWidth:480, display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <h3 style={{ fontSize:16, fontWeight:700 }}>ユーザー詳細</h3>
                <button style={{ background:"none", border:"none", cursor:"pointer", fontSize:20 }} onClick={() => setSelectedUser(null)}>✕</button>
            </div>
            {selectedUser.avatarUrl && <img src={selectedUser.avatarUrl} alt="avatar" style={{ width:80, height:80, borderRadius:"50%", objectFit:"cover" }} />}
            {[
                { label:"表示名", value: selectedUser.displayName, key:"displayName" },
                { label:"メール", value: selectedUser.email, key:"email" },
                { label:"学院", value: selectedUser.gakuin, key:"gakuin" },
                { label:"学系", value: selectedUser.gakukei, key:"gakukei" },
                { label:"学年", value: selectedUser.gakunen, key:"gakunen" },
                { label:"性別", value: selectedUser.gender, key:"gender" },
            ].map(({ label, value, key }) => (
                <div key={key} style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <label style={{ fontSize:11, fontWeight:700, color:"#5A7370" }}>{label}</label>
                <input
                    style={{ padding:"8px 12px", border:"1.5px solid #D0DDD9", borderRadius:8, fontSize:14, outline:"none", fontFamily:"inherit" }}
                    value={editingUser?.[key] ?? value ?? ""}
                    onChange={e => setEditingUser(prev => ({ ...(prev || selectedUser), [key]: e.target.value }))}
                />
                </div>
            ))}
            <div style={{ display:"flex", gap:8 }}>
                <button style={{ flex:1, padding:12, background:"white", border:"1.5px solid #D0DDD9", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer" }} onClick={() => { setSelectedUser(null); setEditingUser(null); }}>
                キャンセル
                </button>
                <button style={{ flex:1, padding:12, background:THEME, color:"white", border:"none", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer" }} onClick={async () => {
                if (!editingUser) return;
                await updateDoc(doc(db, "users", selectedUser.id), editingUser);
                setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, ...editingUser } : u));
                setSelectedUser(null);
                setEditingUser(null);
                alert("保存しました！");
                }}>
                保存する
                </button>
            </div>
            </div>
        </div>
        )}
    </div>
    )}
      </div>
    </div>
  );
}