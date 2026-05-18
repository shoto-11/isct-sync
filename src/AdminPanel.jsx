import { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, getDoc, updateDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Settings, Calendar, Users, Clock, Target, Star, User } from "lucide-react";

const THEME = "#88203a";

const DEFAULT_SECTIONS = [
  { id:"events", label:"募集中のイベント", visible:true },
  { id:"circle", label:"サークル募集", visible:true },
  { id:"today", label:"今日が締め切り", visible:true },
  { id:"recommended", label:"あなたへのおすすめ", visible:true },
  { id:"ranking", label:"週間ランキング", visible:true },
];

export default function AdminPanel({ user }) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notice, setNotice] = useState("");
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [events, setEvents] = useState([]);
  const [carouselEventIds, setCarouselEventIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("sections");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) { setLoading(false); return; }

      // 管理者チェック
      const configSnap = await getDoc(doc(db, "adminSettings", "config"));
      if (!configSnap.exists()) { setLoading(false); return; }
      const adminUids = configSnap.data().adminUids || [];
      if (!adminUids.includes(user.uid)) { setLoading(false); return; }
      setIsAdmin(true);

      // 設定読み込み
      const settingsSnap = await getDoc(doc(db, "adminSettings", "display"));
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        setNotice(data.notice || "");
        setSections(data.sections || DEFAULT_SECTIONS);
        setCarouselEventIds(data.carouselEventIds || []);
      }

      // イベント一覧
      const eventsSnap = await getDocs(collection(db, "events"));
      setEvents(eventsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    await updateDoc(doc(db, "adminSettings", "display"), {
      notice,
      sections,
      carouselEventIds,
    }).catch(async () => {
      const { setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "adminSettings", "display"), { notice, sections, carouselEventIds });
    });
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
  };

  const toggleSection = (index) => {
    const newSections = [...sections];
    newSections[index].visible = !newSections[index].visible;
    setSections(newSections);
  };

  const toggleCarousel = (eventId) => {
    setCarouselEventIds(prev =>
      prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
    );
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
          { id:"sections", label:"セクション管理" },
          { id:"notice", label:"お知らせ" },
          { id:"carousel", label:"カルーセル" },
          { id:"events", label:"イベント管理" },
        ].map(t => (
          <button key={t.id} style={{ padding:"12px 20px", border:"none", background:"none", fontSize:13, fontWeight:600, color: activeTab === t.id ? THEME : "#5A7370", borderBottom: activeTab === t.id ? `2px solid ${THEME}` : "2px solid transparent", cursor:"pointer" }} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth:800, margin:"0 auto", padding:"24px 16px" }}>

        {/* セクション管理 */}
        {activeTab === "sections" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <h2 style={{ fontSize:16, fontWeight:700 }}>表示するセクションと順番</h2>
            {sections.map((section, i) => (
              <div key={section.id} style={{ background:"white", borderRadius:12, padding:"14px 16px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  <button style={{ background:"none", border:"1px solid #D0DDD9", borderRadius:4, width:28, height:28, cursor:"pointer", fontSize:14 }} onClick={() => moveSection(i, -1)}>↑</button>
                  <button style={{ background:"none", border:"1px solid #D0DDD9", borderRadius:4, width:28, height:28, cursor:"pointer", fontSize:14 }} onClick={() => moveSection(i, 1)}>↓</button>
                </div>
                <span style={{ flex:1, fontSize:15, fontWeight:600 }}>{section.label}</span>
                <button
                  style={{ padding:"6px 16px", borderRadius:999, border:`1.5px solid ${section.visible ? THEME : "#D0DDD9"}`, background: section.visible ? THEME : "white", color: section.visible ? "white" : "#5A7370", fontSize:12, fontWeight:700, cursor:"pointer" }}
                  onClick={() => toggleSection(i)}
                >
                  {section.visible ? "表示中" : "非表示"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* お知らせ */}
        {activeTab === "notice" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <h2 style={{ fontSize:16, fontWeight:700 }}>お知らせ文言</h2>
            <textarea
              style={{ width:"100%", padding:"12px", border:"1.5px solid #D0DDD9", borderRadius:8, fontSize:14, outline:"none", fontFamily:"inherit", resize:"vertical" }}
              rows={4}
              value={notice}
              onChange={e => setNotice(e.target.value)}
              placeholder="お知らせの文言を入力してください"
            />
            <p style={{ fontSize:12, color:"#5A7370" }}>現在：{notice || "未設定"}</p>
          </div>
        )}

        {/* カルーセル */}
        {activeTab === "carousel" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <h2 style={{ fontSize:16, fontWeight:700 }}>カルーセルに表示するイベント（最大5件）</h2>
            {events.map(event => (
              <div key={event.id} style={{ background:"white", borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
                {event.imageUrl ? (
                  <img src={event.imageUrl} alt={event.title} style={{ width:60, height:34, objectFit:"cover", borderRadius:6, flexShrink:0 }} />
                ) : (
                  <div style={{ width:60, height:34, background:"#F4F6F5", borderRadius:6, flexShrink:0 }} />
                )}
                <span style={{ flex:1, fontSize:14, fontWeight:600 }}>{event.title}</span>
                <button
                  style={{ padding:"6px 16px", borderRadius:999, border:`1.5px solid ${carouselEventIds.includes(event.id) ? THEME : "#D0DDD9"}`, background: carouselEventIds.includes(event.id) ? THEME : "white", color: carouselEventIds.includes(event.id) ? "white" : "#5A7370", fontSize:12, fontWeight:700, cursor:"pointer" }}
                  onClick={() => toggleCarousel(event.id)}
                  disabled={!carouselEventIds.includes(event.id) && carouselEventIds.length >= 5}
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
            <h2 style={{ fontSize:16, fontWeight:700 }}>イベント一覧（管理者削除）</h2>
            {events.map(event => (
              <div key={event.id} style={{ background:"white", borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
                {event.imageUrl ? (
                  <img src={event.imageUrl} alt={event.title} style={{ width:60, height:34, objectFit:"cover", borderRadius:6, flexShrink:0 }} />
                ) : (
                  <div style={{ width:60, height:34, background:"#F4F6F5", borderRadius:6, flexShrink:0 }} />
                )}
                <div style={{ fontSize:11, color:"#5A7370", display:"flex", alignItems:"center", gap:8 }}>
                <Calendar size={11} /> {event.date} <User size={11} /> {event.organizerName}
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
        {activeTab !== "events" && (
          <button style={{ marginTop:24, width:"100%", padding:14, background:THEME, color:"white", border:"none", borderRadius:8, fontSize:15, fontWeight:700, cursor:"pointer" }} onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "設定を保存する"}
          </button>
        )}
      </div>
    </div>
  );
}