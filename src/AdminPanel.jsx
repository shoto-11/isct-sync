import { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, getDoc, updateDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";
import { Settings, Calendar, User, Users } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase"; // firebase.jsからstorageをインポート

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
  // 💡 ドラッグ＆ドロップ用のStateを追加
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // 💡 ファイルの先頭付近に追記
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);

  // グループ関連
  const [groups, setGroups] = useState([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);

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
        // 💡 確実に { items: [...] } の形でStateに格納する
        setNotice(data.notice && data.notice.items ? data.notice : { items: [{ text: "", link: "" }] });
        const savedCarousel = localStorage.getItem("carouselEventIds");
        setCarouselEventIds(savedCarousel ? JSON.parse(savedCarousel) : (data.carouselEventIds || []));
      } else {
        // 💡 ドキュメント自体がまだない場合の初期値
        setNotice({ items: [{ text: "", link: "" }] });
      }

      const eventsSnap = await getDocs(collection(db, "events"));
      setEvents(eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const usersSnap = await getDocs(collection(db, "users"));
      setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const groupsSnap = await getDocs(collection(db, "groups"));
      setGroups(groupsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleSave = async () => {
      setSaving(true);
      try {
        // 💡 notice の中身（items）を直接ドキュメントの直下に展開して保存します
        await updateDoc(doc(db, "adminSettings", "display"), {
          notice: notice, // または単に notice とだけ書いてもOK
          carouselEventIds: carouselEventIds
        });
      } catch (error) {
        console.error("updateDoc failed, trying setDoc:", error);
        const { setDoc } = await import("firebase/firestore");
        await setDoc(doc(db, "adminSettings", "display"), {
          notice: notice,
          carouselEventIds: carouselEventIds
        });
      }
      setSaving(false);
      alert("保存しました！");
    };

  const handleDeleteEvent = async (eventId, title) => {
    if (!window.confirm(`「${title}」を削除しますか？`)) return;
    await deleteDoc(doc(db, "events", eventId));
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    alert("削除しました");
  };

  const handleDeleteGroup = async (groupId, name) => {
    if (!window.confirm(`グループ「${name}」を削除しますか？この操作は取り消せません。`)) return;
    await deleteDoc(doc(db, "groups", groupId));
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    setSelectedGroup(null);
    alert("削除しました");
  };

  const toggleCarousel = (eventId) => {
    setCarouselEventIds((prev) => {
      const next = prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId];
      localStorage.setItem("carouselEventIds", JSON.stringify(next));
      return next;
    });
  };

  const moveCarousel = (eventId, dir) => {
    setCarouselEventIds((prev) => {
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

  if (loading) return <p style={{ padding: 24 }}>読み込み中...</p>;
  if (!user) return <p style={{ padding: 24 }}>ログインが必要です</p>;
  if (!isAdmin) return <p style={{ padding: 24 }}>管理者権限がありません</p>;

  const TABS = [
    { id: "notice", label: "お知らせ" },
    { id: "carousel", label: "PR広告" },
    { id: "events", label: "イベント管理" },
    { id: "users", label: "登録者一覧" },
    { id: "groups", label: "グループ一覧" },
  ];

  return (
    <div style={{ background: "#F4F6F5", minHeight: "100vh" }}>
      {/* ヘッダー */}
      <div style={{ background: THEME, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ color: "white", fontSize: 18, fontWeight: 900, display: "flex", alignItems: "center", gap: 8 }}>
          <Settings size={20} /> 管理者パネル
        </h1>
        <button style={{ background: "none", border: "1px solid white", color: "white", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13 }} onClick={() => navigate("/")}>← サイトに戻る</button>
      </div>

      {/* タブ */}
      <div style={{ display: "flex", background: "white", borderBottom: "1px solid #E0E8E7", overflowX: "auto" }}>
        {TABS.map((t) => (
          <button key={t.id}
            style={{ padding: "12px 20px", border: "none", background: "none", fontSize: 13, fontWeight: 600, color: activeTab === t.id ? THEME : "#5A7370", borderBottom: activeTab === t.id ? `2px solid ${THEME}` : "2px solid transparent", cursor: "pointer", whiteSpace: "nowrap" }}
            onClick={() => { setActiveTab(t.id); navigate(`/admin/${t.id}`); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>

        {/* ── お知らせ ── */}
        {activeTab === "notice" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>お知らせ（最大5件）</h2>
            {(notice.items || [{ text: "", link: "" }]).map((item, i) => (
              <div key={i} style={adS.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#5A7370" }}>お知らせ {i + 1}</span>
                  {(notice.items || []).length > 1 && (
                    <button style={{ background: "none", border: "none", color: "#E53935", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                      onClick={() => { const n = [...(notice.items || [])]; n.splice(i, 1); setNotice({ ...notice, items: n }); }}>削除</button>
                  )}
                </div>
                <input style={adS.input} placeholder="お知らせの文章" value={item.text || ""} onChange={(e) => { const n = [...(notice.items || [])]; n[i] = { ...n[i], text: e.target.value }; setNotice({ ...notice, items: n }); }} />
                <input style={adS.input} placeholder="リンク（任意）例：https://..." value={item.link || ""} onChange={(e) => { const n = [...(notice.items || [])]; n[i] = { ...n[i], link: e.target.value }; setNotice({ ...notice, items: n }); }} />
              </div>
            ))}
            {(notice.items || []).length < 5 && (
              <button style={adS.addBtn} onClick={() => setNotice({ ...notice, items: [...(notice.items || []), { text: "", link: "" }] })}>＋ お知らせを追加</button>
            )}
          </div>
        )}

        {/* ── PR広告 ── */}
        {activeTab === "carousel" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>PR広告に表示するイベント（最大10件）</h2>
            
            {/* 選択中のイベント一覧 */}
            {carouselEventIds.length > 0 && (
              <div style={adS.card}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#5A7370" }}>
                  選択中（表示順）<span style={{ fontSize: 11, fontWeight: "normal", color: "#9AADA8", marginLeft: 4 }}>※ドラッグで並び替えできます</span>
                </h3>
                {carouselEventIds.map((id, i) => {
                  const event = events.find((e) => e.id === id);
                  if (!event) return null;
                  return (
                    <div 
                      key={id} 
                      draggable // 💡 ドラッグ可能にする
                      onDragStart={() => setDraggedIndex(i)}
                      onDragOver={(e) => {
                        e.preventDefault(); // ドロップを許可する
                        if (dragOverIndex !== i) setDragOverIndex(i);
                      }}
                      onDragEnd={() => {
                        // ドラッグが終了した瞬間に配列を並び替える
                        if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
                          setCarouselEventIds((prev) => {
                            const next = [...prev];
                            const [removed] = next.splice(draggedIndex, 1); // ドラッグした要素を一旦抜く
                            next.splice(dragOverIndex, 0, removed); // ホバーしている位置に差し込む
                            localStorage.setItem("carouselEventIds", JSON.stringify(next));
                            return next;
                          });
                        }
                        setDraggedIndex(null);
                        setDragOverIndex(null);
                      }}
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: 12, 
                        padding: "10px 8px", 
                        borderBottom: "1px solid #F0F0F0",
                        cursor: "grab", // 掴めるアイコンに変える
                        backgroundColor: draggedIndex === i ? "#F4F6F5" : dragOverIndex === i ? "#F9EAED" : "transparent", // ドラッグ中・ホバー中の視覚効果
                        opacity: draggedIndex === i ? 0.5 : 1,
                        transition: "background-color 0.2s ease, opacity 0.2s ease",
                        borderRadius: 6
                      }}
                    >
                      {/* ドラッグ用のツマミアイコンを左端に配置 */}
                      <div style={{ color: "#B0BEC5", fontSize: 16, cursor: "grab", userSelect: "none", paddingRight: 4 }}>☰</div>
                      <div style={{ fontSize: 13, fontWeight: 700, minWidth: 20 }}>{i + 1}.</div>
                      
                      {event.imageUrl ? (
                        <img src={event.imageUrl} alt="" style={{ width: 50, height: 28, objectFit: "cover", borderRadius: 4, flexShrink: 0, pointerEvents: "none" }} />
                      ) : (
                        <div style={{ width: 50, height: 28, background: "#F4F6F5", borderRadius: 4, flexShrink: 0, pointerEvents: "none" }} />
                      )}
                      
                      <div style={{ fontSize: 13, fontWeight: 700, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", pointerEvents: "none" }}>
                        {event.title}
                      </div>
                      
                      {/* 💡 お好みに応じて既存の ↑ ↓ ボタンは残すか、不要なら削除しても大丈夫です */}
                      <button type="button" style={{ ...adS.smallBtn, color: i === 0 ? "#ccc" : "#5A7370" }} onClick={(e) => { e.stopPropagation(); moveCarousel(id, -1); }} disabled={i === 0}>↑</button>
                      <button type="button" style={{ ...adS.smallBtn, color: i === carouselEventIds.length - 1 ? "#ccc" : "#5A7370" }} onClick={(e) => { e.stopPropagation(); moveCarousel(id, 1); }} disabled={i === carouselEventIds.length - 1}>↓</button>
                      <button type="button" style={{ ...adS.smallBtn, color: "#E53935" }} onClick={(e) => { e.stopPropagation(); toggleCarousel(id); }}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 💡 選択中の画面のすぐ下に「設定を保存する」ボタンを配置 */}
            <button style={{ width: "100%", padding: 14, background: THEME, color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 12 }} onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "PR広告の設定を保存する"}
            </button>

            <div style={{ height: 1, background: "#E0E8E7", margin: "12px 0" }}></div>

            {/* イベント検索・追加エリア */}
            <input style={adS.input} placeholder="イベント名・募集者名で検索..." value={carouselSearch} onChange={(e) => setCarouselSearch(e.target.value)} />
            {events.filter((e) => !carouselSearch || e.title?.includes(carouselSearch) || e.organizerName?.includes(carouselSearch)).map((event) => (
              <div key={event.id} style={adS.listItem}>
                {event.imageUrl ? <img src={event.imageUrl} alt="" style={{ width: 60, height: 34, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} /> : <div style={{ width: 60, height: 34, background: "#F4F6F5", borderRadius: 6, flexShrink: 0 }} />}
                <div style={{ flex: 1, cursor: "pointer" }} onClick={() => navigate(`/events/${event.id}`)}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{event.title}</div>
                  <div style={{ fontSize: 11, color: "#5A7370" }}>{event.organizerName}</div>
                </div>
                <button
                  style={{ padding: "6px 16px", borderRadius: 999, border: `1.5px solid ${carouselEventIds.includes(event.id) ? THEME : "#D0DDD9"}`, background: carouselEventIds.includes(event.id) ? THEME : "white", color: carouselEventIds.includes(event.id) ? "white" : "#5A7370", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  onClick={() => toggleCarousel(event.id)}
                  disabled={!carouselEventIds.includes(event.id) && carouselEventIds.length >= 10}
                >
                  {carouselEventIds.includes(event.id) ? "選択中" : "選択"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── イベント管理 ── */}
        {activeTab === "events" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>全イベント一覧（{events.length}件）</h2>
            <input style={adS.input} placeholder="イベント名・募集者名で検索..." value={eventSearch} onChange={(e) => setEventSearch(e.target.value)} />
            
            {events.filter((e) => !eventSearch || e.title?.includes(eventSearch) || e.organizerName?.includes(eventSearch)).map((event) => (
              <div key={event.id} style={adS.listItem}>
                {event.imageUrl ? <img src={event.imageUrl} alt="" style={{ width: 60, height: 34, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} /> : <div style={{ width: 60, height: 34, background: "#F4F6F5", borderRadius: 6, flexShrink: 0 }} />}
                <div style={{ flex: 1, cursor: "pointer" }} onClick={() => navigate(`/events/${event.id}`)}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{event.title}</div>
                  <div style={{ fontSize: 11, color: "#5A7370" }}>{event.organizerName} · {event.date}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {/* 💡 編集ボタンを追加 */}
                  <button style={{ ...adS.smallBtn, color: THEME, border: "1px solid #D0DDD9", background: "white", padding: "6px 12px", borderRadius: 6 }} onClick={() => setSelectedEvent(event)}>編集</button>
                  <button style={{ ...adS.smallBtn, color: "#E53935" }} onClick={async () => {
                    if (window.confirm(`「${event.title}」を削除しますか？この操作は取り消せません。`)) {
                      await deleteDoc(doc(db, "events", event.id));
                      setEvents(events.filter((e) => e.id !== event.id));
                      alert("削除しました");
                    }
                  }}>削除</button>
                </div>
              </div>
            ))}

            {/* 💡 イベント詳細・編集モーダル */}
            {selectedEvent && (
              <div style={adS.modal}>
                <div style={{ ...adS.modalCard, maxHeight: "90vh", overflowY: "auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>イベント情報の編集</h3>
                    <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20 }} onClick={() => { setSelectedEvent(null); setEditingEvent(null); }}>✕</button>
                  </div>
                  
                  {/* アイキャッチ画像のプレビュー */}
                  <div style={{ width: "100%", height: 160, background: "#F4F6F5", borderRadius: 8, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {(editingEvent?.imageUrl ?? selectedEvent.imageUrl) ? (
                      <img src={editingEvent?.imageUrl ?? selectedEvent.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ color: "#5A7370", fontSize: 13 }}>画像なし</div>
                    )}
                  </div>

                  {/* 編集入力フォーム */}
                  {[
                    { label: "イベントタイトル", key: "title" },
                    { label: "募集者（団体）名", key: "organizerName" },
                    { label: "開催日時", key: "date" },
                    { label: "定員（数字または「制限なし」など）", key: "capacity" },
                    { label: "開催場所", key: "location" },
                    { label: "画像URL", key: "imageUrl" },
                  ].map(({ label, key }) => (
                    <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#5A7370" }}>{label}</label>
                      <input 
                        style={adS.input} 
                        value={editingEvent?.[key] ?? selectedEvent[key] ?? ""} 
                        onChange={(e) => setEditingEvent((prev) => ({ ...(prev || selectedEvent), [key]: e.target.value }))} 
                      />
                    </div>
                  ))}

                  {/* 概要（長文用） */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#5A7370" }}>イベント概要・詳細</label>
                    <textarea 
                      style={{ ...adS.input, height: 120, resize: "none" }} 
                      value={editingEvent?.description ?? selectedEvent.description ?? ""} 
                      onChange={(e) => setEditingEvent((prev) => ({ ...(prev || selectedEvent), description: e.target.value }))} 
                    />
                  </div>

                  {/* ボタンエリア */}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button style={{ flex: 1, padding: 12, background: "white", border: "1.5px solid #D0DDD9", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={() => { setSelectedEvent(null); setEditingEvent(null); }}>キャンセル</button>
                    <button style={{ flex: 1, padding: 12, background: THEME, color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                      onClick={async () => {
                        if (!editingEvent) {
                          setSelectedEvent(null); setEditingEvent(null);
                          return;
                        }
                        // Firestoreの「events」コレクションに上書き保存
                        await updateDoc(doc(db, "events", selectedEvent.id), editingEvent);
                        // 管理画面のローカルStateも更新して即座に一覧に反映
                        setEvents((prev) => prev.map((e) => e.id === selectedEvent.id ? { ...e, ...editingEvent } : e));
                        setSelectedEvent(null); setEditingEvent(null); 
                        alert("イベント情報を更新しました！");
                      }}>保存する</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {/* ── 登録者一覧 ── */}      
        {activeTab === "users" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>登録者一覧（{users.length}人）</h2>
            <input style={adS.input} placeholder="名前・メールアドレスで検索..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
            
            {/* ユーザーリスト表示部分 */}
            {users.filter((u) => !userSearch || u.displayName?.includes(userSearch) || u.email?.includes(userSearch)).map((u) => (
              <div key={u.id} style={{ ...adS.listItem, cursor: "pointer" }} onClick={() => setSelectedUser(u)}>
                {u.avatarUrl ? (
                  <img src={u.avatarUrl} alt="avatar" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#F9EAED", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <User size={20} color={THEME} />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{u.displayName}</div>
                  <div style={{ fontSize: 11, color: "#5A7370" }}>{u.email} · {u.gakuin} {u.gakukei} · {u.gakunen}</div>
                </div>
              </div>
            ))}

            {/* ユーザー詳細モーダル */}
            {selectedUser && (
              <div style={adS.modal}>
                <div style={{ ...adS.modalCard, maxHeight: "90vh", overflowY: "auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>ユーザー情報の編集</h3>
                    <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20 }} onClick={() => { setSelectedUser(null); setEditingUser(null); }}>✕</button>
                  </div>
                  
                  {/* 💡 画像の表示と「ファイルから選択して入れ替え」機能 */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "#F4F6F5", padding: 16, borderRadius: 12, alignItems: "center" }}>
                    {(editingUser?.avatarUrl ?? selectedUser.avatarUrl) ? (
                      <img src={editingUser?.avatarUrl ?? selectedUser.avatarUrl} alt="avatar" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "2px solid white", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }} />
                    ) : (
                      <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#F9EAED", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}><User size={36} color={THEME} /></div>
                    )}
                    
                    <div style={{ display: "flex", gap: 8, width: "100%", justifyContent: "center" }}>
                      {/* カスタムファイルアップロードボタン */}
                      <label style={{ padding: "6px 12px", background: "white", border: "1.5px solid #D0DDD9", borderRadius: 6, fontSize: 12, fontWeight: 700, color: "#5A7370", cursor: "pointer" }}>
                        画像を選択してアップロード
                        <input 
                          type="file" 
                          accept="image/*" 
                          style={{ display: "none" }} 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              alert("画像をアップロード中...");
                              // Firebase Storageの「avatars/ユーザーID/ファイル名」に保存
                              const storageRef = ref(storage, `avatars/${selectedUser.id}/${file.name}`);
                              await uploadBytes(storageRef, file);
                              const downloadUrl = await getDownloadURL(storageRef);
                              
                              // Stateに即座に反映
                              setEditingUser({ ...(editingUser || selectedUser), avatarUrl: downloadUrl });
                              alert("画像のアップロードが完了しました！（「保存する」を押すと確定します）");
                            } catch (err) {
                              console.error(err);
                              alert("画像のアップロードに失敗しました。");
                            }
                          }}
                        />
                      </label>

                      {(editingUser?.avatarUrl ?? selectedUser.avatarUrl) && (
                        <button 
                          type="button" 
                          style={{ padding: "6px 12px", background: "#FFEBEE", border: "none", borderRadius: 6, color: "#C62828", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                          onClick={() => setEditingUser({ ...(editingUser || selectedUser), avatarUrl: "" })}
                        >
                          画像をクリア
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 画像URL（手動書き換え用も残す） */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#5A7370" }}>画像URL（直接指定）</label>
                    <input 
                      style={adS.input} 
                      placeholder="https://example.com/avatar.jpg"
                      value={editingUser?.avatarUrl ?? selectedUser.avatarUrl ?? ""} 
                      onChange={(e) => setEditingUser({ ...(editingUser || selectedUser), avatarUrl: e.target.value })} 
                    />
                  </div>

                  {/* その他の既存の入力欄 */}
                  {[
                    { label: "表示名", key: "displayName" },
                    { label: "メール", key: "email" },
                    { label: "学院", key: "gakuin" },
                    { label: "学系", key: "gakukei" },
                    { label: "学年", key: "gakunen" },
                    { label: "性別", key: "gender" },
                  ].map(({ label, key }) => (
                    <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#5A7370" }}>{label}</label>
                      <input style={adS.input} value={editingUser?.[key] ?? selectedUser[key] ?? ""} onChange={(e) => setEditingUser((prev) => ({ ...(prev || selectedUser), [key]: e.target.value }))} />
                    </div>
                  ))}

                  {/* ボタンエリア */}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button style={{ flex: 1, padding: 12, background: "white", border: "1.5px solid #D0DDD9", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={() => { setSelectedUser(null); setEditingUser(null); }}>キャンセル</button>
                    <button style={{ flex: 1, padding: 12, background: THEME, color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                      onClick={async () => {
                        if (!editingUser) {
                          setSelectedUser(null); setEditingUser(null);
                          return;
                        }
                        await updateDoc(doc(db, "users", selectedUser.id), editingUser);
                        setUsers((prev) => prev.map((u) => u.id === selectedUser.id ? { ...u, ...editingUser } : u));
                        setSelectedUser(null); setEditingUser(null); 
                        alert("ユーザー情報を保存しました！");
                      }}>保存する</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── グループ一覧 ── */}
        {activeTab === "groups" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>グループ一覧（{groups.length}件）</h2>
            <input style={adS.input} placeholder="グループ名・メールで検索..." value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} />
            {groups.filter((g) => !groupSearch || g.displayName?.includes(groupSearch) || g.email?.includes(groupSearch)).map((g) => (
              <div key={g.id} style={{ ...adS.listItem, cursor: "pointer" }} onClick={() => setSelectedGroup(g)}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#F9EAED", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                  {g.avatarUrl ? <img src={g.avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👥"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{g.displayName}</div>
                  <div style={{ fontSize: 11, color: "#5A7370" }}>{g.groupType} · {g.email} · メンバー{g.members?.length || 0}人</div>
                </div>
                <span style={{ fontSize: 12, color: THEME, fontWeight: 700 }}>詳細 ›</span>
              </div>
            ))}

            {/* グループ詳細モーダル */}
            {selectedGroup && (
              <div style={adS.modal}>
                <div style={adS.modalCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>グループ詳細</h3>
                    <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20 }} onClick={() => setSelectedGroup(null)}>✕</button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#F9EAED", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
                      {selectedGroup.avatarUrl ? <img src={selectedGroup.avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👥"}
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 900 }}>{selectedGroup.displayName}</div>
                      <div style={{ fontSize: 12, color: "#5A7370" }}>{selectedGroup.groupType}</div>
                    </div>
                  </div>
                  {[
                    { label: "グループID", value: selectedGroup.id },
                    { label: "メールアドレス", value: selectedGroup.email },
                    { label: "種別", value: selectedGroup.groupType },
                    { label: "メンバー数", value: `${selectedGroup.members?.length || 0}人` },
                    { label: "作成日", value: selectedGroup.createdAt?.toDate?.()?.toLocaleDateString?.() || "-" },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F0F0F0" }}>
                      <span style={{ fontSize: 13, color: "#5A7370", fontWeight: 600 }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{value}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button style={{ flex: 1, padding: 12, background: "white", border: "1.5px solid #D0DDD9", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={() => setSelectedGroup(null)}>閉じる</button>
                    <button style={{ flex: 1, padding: 12, background: "#E53935", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                      onClick={() => handleDeleteGroup(selectedGroup.id, selectedGroup.displayName)}>グループを削除</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 保存ボタン（お知らせタブ用） */}
        {activeTab === "notice" && (
          <button style={{ marginTop: 24, width: "100%", padding: 14, background: THEME, color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer" }} onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "設定を保存する"}
          </button>
        )}
      </div>
    </div>
  );
}

const adS = {
  card: { background: "white", borderRadius: 12, padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: 10 },
  listItem: { background: "white", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  input: { padding: "10px 14px", border: "1.5px solid #D0DDD9", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" },
  addBtn: { padding: "12px", background: "white", border: "1.5px dashed #D0DDD9", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#5A7370", width: "100%" },
  smallBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 16, fontWeight: 700, padding: "2px 6px" },
  modal: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  modalCard: { background: "white", borderRadius: 16, padding: 24, width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 16, maxHeight: "90vh", overflowY: "auto" },
};
