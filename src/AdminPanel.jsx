import { useState, useEffect } from "react";
import { db, storage } from "./firebase";
import { doc, getDoc, updateDoc, collection, getDocs, deleteDoc, setDoc } from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";
import { Settings, Calendar, User, Users, ImageIcon, Paperclip, X,Crown } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { 
  THEME, 
  GENRE_TAGS, 
  TARGET_TAGS, 
  CAMPUS_TAGS, 
  STYLE_TAGS, 
  ORGANIZER_TAGS, 
  BG_COLOR, 
  GAKUIN 
} from "./constants"; // 💡 constantsから定数を一括読込

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
  
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // 💡 管理者用イベント編集State群の最適化
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDetail, setEditDetail] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editDeadlineTime, setEditDeadlineTime] = useState("");
  const [editApplyLabel, setEditApplyLabel] = useState("");
  const [editApplyLink, setEditApplyLink] = useState("");
  const [editGenre, setEditGenre] = useState("");
  const [editTargets, setEditTargets] = useState([]);
  const [editCampus, setEditCampus] = useState("");
  const [editStyle, setEditStyle] = useState("");
  const [editOrganizerTag, setEditOrganizerTag] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editTargetGakuin, setEditTargetGakuin] = useState([]);
  const [editTargetGakukei, setEditTargetGakukei] = useState([]);
  const [editOrganizerName, setEditOrganizerName] = useState("");
  const [editPreview, setEditPreview] = useState(null);
  const [editImageFile, setEditImageFile] = useState(null);

  // グループ関連
  const [groups, setGroups] = useState([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);

  const [editOrganizerId, setEditOrganizerId] = useState("");
  const [editIsGroup, setEditIsGroup] = useState(false);
  const [orgSearchQuery, setOrgSearchQuery] = useState("");

  // 💡 【新規追加】イベント代打投稿用のState群
  const [proxyOrganizerId, setProxyOrganizerId] = useState("");
  const [proxyIsGroup, setProxyIsGroup] = useState(false);
  const [proxyOrgSearch, setProxyOrgSearch] = useState("");
  const [proxyTitle, setProxyTitle] = useState("");
  const [proxyDetail, setProxyDetail] = useState("");
  const [proxyDate, setProxyDate] = useState("");
  const [proxyStartTime, setProxyStartTime] = useState("");
  const [proxyEndTime, setProxyEndTime] = useState("");
  const [proxyLocation, setProxyLocation] = useState("");
  const [proxyDeadline, setProxyDeadline] = useState("");
  const [proxyDeadlineTime, setProxyDeadlineTime] = useState("");
  const [proxyGenre, setProxyGenre] = useState("");
  const [proxyTargets, setProxyTargets] = useState([]);
  const [proxyTargetGakuin, setProxyTargetGakuin] = useState([]);
  const [proxyTargetGakukei, setProxyTargetGakukei] = useState([]);
  const [proxyCampus, setProxyCampus] = useState("");
  const [proxyStyle, setProxyStyle] = useState("");
  const [proxyOrganizerTag, setProxyOrganizerTag] = useState("");
  const [proxyApplyLabel, setProxyApplyLabel] = useState("");
  const [proxyApplyLink, setProxyApplyLink] = useState("");
  const [proxyContact, setProxyContact] = useState("");
  const [proxyPreview, setProxyPreview] = useState(null);
  const [proxyImageFile, setProxyImageFile] = useState(null);

  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupEmail, setEditGroupEmail] = useState("");
  const [editGroupType, setEditGroupType] = useState("");
  const [editGroupDesc, setEditGroupDesc] = useState("");
  const [editGroupTwitter, setEditGroupTwitter] = useState("");
  const [editGroupInstagram, setEditGroupInstagram] = useState("");
  const [editGroupHomepage, setEditGroupHomepage] = useState("");
  const [editGroupAvatar, setEditGroupAvatar] = useState("");
  const [groupMembersData, setGroupMembersData] = useState([]); // メンバーのユーザー詳細表示用

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
        setNotice(data.notice && data.notice.items ? data.notice : { items: [{ text: "", link: "" }] });
        const savedCarousel = localStorage.getItem("carouselEventIds");
        setCarouselEventIds(savedCarousel ? JSON.parse(savedCarousel) : (data.carouselEventIds || []));
      } else {
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

  // 💡 管理者が「編集」を押した際にStateに初期値をバインドする処理
  const handleOpenEventEdit = (event) => {
    setSelectedEvent(event);
    setEditTitle(event.title || "");
    setEditDetail(event.detail || event.description || "");
    setEditDate(event.date || "");
    setEditStartTime(event.startTime || "");
    setEditEndTime(event.endTime || "");
    setEditLocation(event.location || "");
    setEditDeadline(event.deadline || "");
    setEditDeadlineTime(event.deadlineTime || "");
    setEditApplyLabel(event.applyLabel || "");
    setEditApplyLink(event.applyLink || "");
    setEditGenre(event.tags?.genre || "");
    setEditTargets(event.tags?.targets || []);
    setEditCampus(event.tags?.campus || "");
    setEditStyle(event.tags?.style || "");
    setEditOrganizerTag(event.tags?.organizer || "");
    setEditContact(event.contact || "");
    setEditTargetGakuin(event.targetGakuin || []);
    setEditTargetGakukei(event.targetGakukei || []);
    setEditOrganizerName(event.organizerName || "");
    setEditPreview(event.imageUrl || null);
    setEditImageFile(null);

    setEditOrganizerId(event.organizerId || event.createdBy || "");
    setEditIsGroup(event.organizerType === "group" || event.isGroup === true);
    setOrgSearchQuery("");
  };

  const handleAdminImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setEditImageFile(file);
    setEditPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "adminSettings", "display"), {
        notice: notice,
        carouselEventIds: carouselEventIds
      });
    } catch (error) {
      await setDoc(doc(db, "adminSettings", "display"), {
        notice: notice,
        carouselEventIds: carouselEventIds
      });
    }
    setSaving(false);
    alert("保存しました！");
  };

  // 💡 管理者による全情報の強制上書き更新処理（バリデーション同期）
  const handleAdminSaveEvent = async () => {
    if (!editTitle.trim() || !editDetail.trim() || !editDate || !editLocation.trim() || !editDeadline || !editGenre || !editTargets.length || !editCampus) {
      alert("必須項目が入力・選択されていません。確認してください。");
      return;
    }

    setSaving(true);
    try {
      let finalImageUrl = selectedEvent.imageUrl || null;
      if (editImageFile) {
        const storageRef = ref(storage, `events/${Date.now()}_${editImageFile.name}`);
        await uploadBytes(storageRef, editImageFile);
        finalImageUrl = await getDownloadURL(storageRef);
      }

      const updatedFields = {
        title: editTitle.trim(),
        detail: editDetail.trim(),
        date: editDate,
        startTime: editStartTime,
        endTime: editEndTime,
        location: editLocation.trim(),
        deadline: editDeadline,
        deadlineTime: editDeadlineTime,
        applyLabel: editApplyLabel,
        applyLink: editApplyLink,
        contact: editContact,
        organizerName: editOrganizerName.trim(),
        imageUrl: finalImageUrl,
        tags: {
          genre: editGenre,
          targets: editTargets,
          campus: editCampus,
          style: editStyle,
          organizer: editOrganizerTag,
        },
        targetGakuin: editTargetGakuin,
        targetGakukei: editTargetGakukei,
        organizerId: editOrganizerId,
        organizerType: editIsGroup ? "group" : "personal",
        createdBy: editOrganizerId, // 互換性維持
        isGroup: editIsGroup,
        // ※ アバター画像も選択された対象から動的に同期します
        organizerAvatar: editIsGroup 
          ? (groups.find(g => g.id === editOrganizerId)?.avatarUrl || "")
          : (users.find(u => u.id === editOrganizerId)?.avatarUrl || "")
      };

      await updateDoc(doc(db, "events", selectedEvent.id), updatedFields);
      
      // クライアント側の一覧Stateも更新
      setEvents((prev) => prev.map((e) => e.id === selectedEvent.id ? { ...e, ...updatedFields } : e));
      setSelectedEvent(null);
      alert("イベント情報を管理者権限で上書き更新しました！");
    } catch (err) {
      alert("保存に失敗しました: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId, title) => {
    if (!window.confirm(`「${title}」を削除しますか？`)) return;
    await deleteDoc(doc(db, "events", eventId));
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    alert("削除しました");
  };

  // 💡 【新規追加】管理者によるイベント代打投稿の登録処理
  const handleProxySubmitEvent = async () => {
    if (!proxyOrganizerId) {
      alert("イベントの募集者（主催者）を先に選択してください。");
      return;
    }
    if (!proxyTitle.trim() || !proxyDetail.trim() || !proxyDate || !proxyLocation.trim() || !proxyDeadline || !proxyGenre || !proxyTargets.length || !proxyCampus) {
      alert("必須項目（募集者、イベント名、詳細、日時、場所、締切日、ジャンル、対象学年、キャンパス）を全て入力・選択してください。");
      return;
    }

    setSaving(true);
    try {
      // 選択された募集者の情報を全データから特定
      const targetGroup = proxyIsGroup ? groups.find(g => g.id === proxyOrganizerId) : null;
      const targetUser = !proxyIsGroup ? users.find(u => u.id === proxyOrganizerId) : null;

      const finalOrganizerName = proxyIsGroup ? (targetGroup?.displayName || "グループ") : (targetUser?.displayName || "個人ユーザー");
      const finalOrganizerAvatar = proxyIsGroup ? (targetGroup?.avatarUrl || "") : (targetUser?.avatarUrl || "");

      // 画像アップロード処理
      let imageUrl = null;
      if (proxyImageFile) {
        const storageRef = ref(storage, `events/${Date.now()}_proxy_${proxyImageFile.name}`);
        await uploadBytes(storageRef, proxyImageFile);
        imageUrl = await getDownloadURL(storageRef);
      }

      const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
      
      const newEventData = {
        title: proxyTitle.trim(),
        detail: proxyDetail.trim(),
        date: proxyDate,
        startTime: proxyStartTime,
        endTime: proxyEndTime,
        location: proxyLocation.trim(),
        deadline: proxyDeadline,
        deadlineTime: proxyDeadlineTime,
        tags: {
          genre: proxyGenre,
          targets: proxyTargets,
          campus: proxyCampus,
          style: proxyStyle,
          organizer: proxyOrganizerTag,
        },
        imageUrl,
        attachments: [], // 管理者代打は一旦添付なし
        applyLabel: proxyApplyLabel || "参加を申し込む",
        applyLink: proxyApplyLink,
        participants: [],
        organizerType: proxyIsGroup ? "group" : "user",
        organizerId: proxyOrganizerId,
        createdBy: proxyOrganizerId, // 互換性維持
        createdByPersonal: user.uid, // 操作した管理者のUIDを記録
        createdAt: serverTimestamp(),
        organizerName: finalOrganizerName,
        organizerAvatar: finalOrganizerAvatar,
        isGroup: proxyIsGroup,
        contact: proxyContact,
        targetGakuin: proxyTargetGakuin,
        targetGakukei: proxyTargetGakukei,
      };

      const docRef = await addDoc(collection(db, "events"), newEventData);
      
      // ローカルのevents一覧Stateにも最新の代打投稿をマージ
      setEvents(prev => [{ id: docRef.id, ...newEventData }, ...prev]);

      // フォームの入力値をすべてきれいにリセット
      setProxyOrganizerId("");
      setProxyIsGroup(false);
      setProxyOrgSearch("");
      setProxyTitle("");
      setProxyDetail("");
      setProxyDate("");
      setProxyStartTime("");
      setProxyEndTime("");
      setProxyLocation("");
      setProxyDeadline("");
      setProxyDeadlineTime("");
      setProxyGenre("");
      setProxyTargets([]);
      setProxyTargetGakuin([]);
      setProxyTargetGakukei([]);
      setProxyCampus("");
      setProxyStyle("");
      setProxyOrganizerTag("");
      setProxyApplyLabel("");
      setProxyApplyLink("");
      setProxyContact("");
      setProxyPreview(null);
      setProxyImageFile(null);

      alert(`「${finalOrganizerName}」名義での代打イベント投稿が正常に完了しました！`);
      setActiveTab("events"); // 管理一覧タブに自動で戻す
    } catch (err) {
      console.error(err);
      alert("代打投稿に失敗しました: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (groupId, name) => {
    if (!window.confirm(`グループ「${name}」を削除しますか？この操作は取り消せません。`)) return;
    await deleteDoc(doc(db, "groups", groupId));
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    setSelectedGroup(null);
    alert("削除しました");
  };
  // 💡 【新規追加】管理者がグループを選択したときの初期値バインド & メンバーフェッチ
  // 💡 【修正版】管理者がグループを選択したときの初期値バインド & メンバーフェッチ
  const handleOpenGroupDetail = async (group) => {
    setSelectedGroup(group);
    setEditGroupName(group.displayName || "");
    // 💡 フィールド名を group.email から group.groupEmail に修正して初期値を確実にバインドします
    setEditGroupEmail(group.groupEmail || group.email || "");
    setEditGroupType(group.groupType || "サークル");
    setEditGroupDesc(group.description || "");
    setEditGroupTwitter(group.twitterUrl || "");
    setEditGroupInstagram(group.instagramUrl || "");
    setEditGroupHomepage(group.homepageUrl || "");
    setEditGroupAvatar(group.avatarUrl || "");

    // 所属メンバーのユーザーデータを全ユーザーState(users)からマッピング
    const memberIds = group.members || [];
    const mappedMembers = users.filter(u => memberIds.includes(u.id));
    setGroupMembersData(mappedMembers);
  };

  // 💡 【新規追加】管理者権限でのグループ情報の更新・確定保存処理
  // 💡 【修正版】管理者権限でのグループ情報の更新・確定保存処理
  const handleAdminSaveGroup = async () => {
    if (!editGroupName.trim()) {
      alert("グループ名を入力してください。");
      return;
    }
    setSaving(true);
    try {
      const groupRef = doc(db, "groups", selectedGroup.id);
      const updatedFields = {
        displayName: editGroupName.trim(),
        // 💡 データの不整合を防ぐため、双方のフィールドに新しいアドレスを格納します
        groupEmail: editGroupEmail.trim(),
        email: editGroupEmail.trim(),
        groupType: editGroupType,
        description: editGroupDesc.trim(),
        twitterUrl: editGroupTwitter.trim(),
        instagramUrl: editGroupInstagram.trim(),
        homepageUrl: editGroupHomepage.trim(),
        avatarUrl: editGroupAvatar
      };

      await updateDoc(groupRef, updatedFields);

      // クライアント側のgroups一覧Stateも同期更新
      setGroups(prev => prev.map(g => g.id === selectedGroup.id ? { ...g, ...updatedFields } : g));
      setSelectedGroup(null);
      alert("グループ情報を更新しました。");
    } catch (err) {
      console.error(err);
      alert("グループ情報の保存に失敗しました。");
    } finally {
      setSaving(false);
    }
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
    { id: "proxy_post", label: "イベント代打投稿" }, // 💡 「イベント管理」の隣に新設
    { id: "users", label: "登録者一覧" },
    { id: "groups", label: "グループ一覧" },
  ];

  return (
    <div style={{ background: "#F4F6F5", minHeight: "100vh" }}>
      {/* ヘッダー */}
      <div style={{ background: THEME, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ color: "white", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
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
                      draggable 
                      onDragStart={() => setDraggedIndex(i)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOverIndex !== i) setDragOverIndex(i);
                      }}
                      onDragEnd={() => {
                        if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
                          setCarouselEventIds((prev) => {
                            const next = [...prev];
                            const [removed] = next.splice(draggedIndex, 1);
                            next.splice(dragOverIndex, 0, removed);
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
                        cursor: "grab",
                        backgroundColor: draggedIndex === i ? "#F4F6F5" : dragOverIndex === i ? "#F9EAED" : "transparent",
                        opacity: draggedIndex === i ? 0.5 : 1,
                        transition: "background-color 0.2s ease, opacity 0.2s ease",
                        borderRadius: 6
                      }}
                    >
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
                      
                      <button type="button" style={{ ...adS.smallBtn, color: i === 0 ? "#ccc" : "#5A7370" }} onClick={(e) => { e.stopPropagation(); moveCarousel(id, -1); }} disabled={i === 0}>↑</button>
                      <button type="button" style={{ ...adS.smallBtn, color: i === carouselEventIds.length - 1 ? "#ccc" : "#5A7370" }} onClick={(e) => { e.stopPropagation(); moveCarousel(id, 1); }} disabled={i === carouselEventIds.length - 1}>↓</button>
                      <button type="button" style={{ ...adS.smallBtn, color: "#E53935" }} onClick={(e) => { e.stopPropagation(); toggleCarousel(id); }}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}

            <button className="submit-btn" style={{ width: "100%", padding: 14, border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 12 }} onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "PR広告の設定を保存する"}
            </button>

            <div style={{ height: 1, background: "#E0E8E7", margin: "12px 0" }}></div>

            <input style={adS.input} placeholder="イベント名・募集者名で検索..." value={carouselSearch} onChange={(e) => setCarouselSearch(e.target.value)} />
            {events.filter((e) => !carouselSearch || e.title?.includes(carouselSearch) || e.organizerName?.includes(carouselSearch)).map((event) => (
              <div key={event.id} className="event-hover-card" style={adS.listItem}>
                {event.imageUrl ? <img src={event.imageUrl} alt="" style={{ width: 60, height: 34, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} /> : <div style={{ width: 60, height: 34, background: "#F4F6F5", borderRadius: 6, flexShrink: 0 }} />}
                <div style={{ flex: 1, cursor: "pointer" }} onClick={() => navigate(`/events/${event.id}`)}>
                  <div className="hover-title-underline" style={{ fontSize: 14, fontWeight: 700 }}>{event.title}</div>
                  <div style={{ fontSize: 11, color: "#5A7370" }}>{event.organizerName}</div>
                </div>
                <button
                  className={`tag-tab-btn ${carouselEventIds.includes(event.id) ? "tag-active-tab" : ""}`}
                  style={{ padding: "6px 16px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  onClick={() => toggleCarousel(event.id)}
                  disabled={!carouselEventIds.includes(event.id) && carouselEventIds.length >= 10}
                >
                  {carouselEventIds.includes(event.id) ? "選択中" : "選択"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── イベント管理（💡 編集・ボタントグル等フルアップデート版） ── */}
        {activeTab === "events" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>全イベント一覧（{events.length}件）</h2>
            <input style={adS.input} placeholder="イベント名・募集者名で検索..." value={eventSearch} onChange={(e) => setEventSearch(e.target.value)} />
            
            {events.filter((e) => !eventSearch || e.title?.includes(eventSearch) || e.organizerName?.includes(eventSearch)).map((event) => (
              <div key={event.id} className="event-hover-card"  style={adS.listItem}>
                {event.imageUrl ? <img src={event.imageUrl} alt="" style={{ width: 60, height: 34, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} /> : <div style={{ width: 60, height: 34, background: "#F4F6F5", borderRadius: 6, flexShrink: 0 }} />}
                <div style={{ flex: 1, cursor: "pointer" }} onClick={() => navigate(`/events/${event.id}`)}>
                  <div className="hover-title-underline" style={{ fontSize: 14, fontWeight: 700 }}>{event.title}</div>
                  <div style={{ fontSize: 11, color: "#5A7370" }}>{event.organizerName} · {event.date}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {/* 💡 統合された初期値ハンドラーをコール */}
                  <button style={{ ...adS.smallBtn, color: THEME, border: "1px solid #D0DDD9", background: "white", padding: "6px 12px", borderRadius: 6 }} onClick={() => handleOpenEventEdit(event)}>編集</button>
                  <button style={{ ...adS.smallBtn, color: "#E53935" }} onClick={() => handleDeleteEvent(event.id, event.title)}>削除</button>
                </div>
              </div>
            ))}

            {/* ─── 💡 高機能イベント詳細・編集モーダル（一般フォームと完全同期） ─── */}
            {selectedEvent && (
              <div style={adS.modal}>
                <div style={{ ...adS.modalCard, maxWidth: 540 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>イベント情報の編集 (管理者専用)</h3>
                    <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20 }} onClick={() => setSelectedEvent(null)}>✕</button>
                  </div>
                  
                  {/* 画像変更エリア */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={adS.formLabel}>イベントカバー画像（任意）</label>
                    <div style={adS.imageArea} onClick={() => document.getElementById("adminEventFile").click()}>
                      {editPreview ? (
                        <img src={editPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
                      ) : (
                        <div style={{ textAlign: "center", color: "#BACFCB" }}>
                          <ImageIcon size={28} />
                          <div style={{ fontSize: 11, marginTop: 4 }}>タップして画像を変更</div>
                        </div>
                      )}
                    </div>
                    <input id="adminEventFile" type="file" accept="image/*" style={{ display: "none" }} onChange={handleAdminImageChange} />
                  </div>

                  {/* テキスト入力項目 */}
                  <div style={adS.fieldRow}>
                    <label style={adS.formLabel}>イベント名 <span style={adS.required}>必須</span></label>
                    <input style={adS.input} value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                  </div>

                  <div style={adS.fieldRow}>
                    <label style={adS.formLabel}>イベント詳細説明 <span style={adS.required}>必須</span></label>
                    <textarea style={{ ...adS.input, height: 80, resize: "vertical" }} value={editDetail} onChange={e => setEditDetail(e.target.value)} />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={adS.fieldRow}>
                      <label style={adS.formLabel}>イベント開催日 <span style={adS.required}>必須</span></label>
                      <input style={adS.input} type="date" value={editDate} onChange={e => setEditDate(e.target.value)} onFocus={e => e.target.showPicker()} />
                    </div>
                    <div style={adS.fieldRow}>
                      <label style={adS.formLabel}>申し込み締切日 <span style={adS.required}>必須</span></label>
                      <input style={adS.input} type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} onFocus={e => e.target.showPicker()} />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <div style={adS.fieldRow}>
                      <label style={adS.formLabel}>開始時間</label>
                      <input style={adS.input} type="time" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} onFocus={e => e.target.showPicker()} />
                    </div>
                    <div style={adS.fieldRow}>
                      <label style={adS.formLabel}>終了時間</label>
                      <input style={adS.input} type="time" value={editEndTime} onChange={e => setEditEndTime(e.target.value)} onFocus={e => e.target.showPicker()} />
                    </div>
                    <div style={adS.fieldRow}>
                      <label style={adS.formLabel}>締切時間</label>
                      <input style={adS.input} type="time" value={editDeadlineTime} onChange={e => setEditDeadlineTime(e.target.value)} onFocus={e => e.target.showPicker()} />
                    </div>
                  </div>

                  <div style={adS.fieldRow}>
                    <label style={adS.formLabel}>開催場所 <span style={adS.required}>必須</span></label>
                    <input style={adS.input} value={editLocation} onChange={e => setEditLocation(e.target.value)} />
                  </div>

                  {/* 💡 【新規追加】管理者用：募集者（主催者）の完全変更グリッド */}
                  {/* 💡 募集者（主催者）の完全変更グリッド（検索欄付き） */}
                  <div style={adS.fieldRow}>
                    <label style={adS.formLabel}>募集者（主催者）の変更 <span style={adS.required}>必須</span></label>
                    
                    {/* 💡 【新規追加】名前・メールアドレスでのリアルタイム検索インポート */}
                    <input 
                      style={{ ...adS.input, marginTop: 2, marginBottom: 8, padding: "8px 12px", fontSize: 13 }}
                      placeholder="募集者の名前、またはメールアドレスで絞り込み..." 
                      value={orgSearchQuery} 
                      onChange={(e) => setOrgSearchQuery(e.target.value)} 
                    />

                    <div style={{ maxHeight: "160px", overflowY: "auto", border: "1px solid #D0DDD9", borderRadius: 8, padding: 8, background: "#FAFDFC" }}>
                      <div style={adS.cardGrid}>
                        
                        {/* ── 個人（全ユーザー）：名前 or メールで検索フィルター ── */}
                        {users
                          .filter(u => {
                            const query = orgSearchQuery.toLowerCase().trim();
                            if (!query) return true;
                            return (
                              (u.displayName && u.displayName.toLowerCase().includes(query)) ||
                              (u.email && u.email.toLowerCase().includes(query))
                            );
                          })
                          .map((u) => {
                            const isSelected = !editIsGroup && editOrganizerId === u.id;
                            return (
                              <button
                                key={u.id}
                                className={`organizer-card ${isSelected ? "organizer-selected" : ""}`}
                                  style={adS.organizerCard}
                                onClick={() => {
                                  setEditOrganizerId(u.id);
                                  setEditIsGroup(false);
                                  setEditOrganizerName(u.displayName || "名前なし");
                                }}
                              >
                                <div style={adS.cardAvatarWrap}>
                                  {u.avatarUrl ? <img src={u.avatarUrl} style={adS.cardAvatar} alt="" /> : <User size={14} color="#9AADA8" />}
                                </div>
                                <div style={adS.cardInfo}>
                                  <div style={adS.cardName}>{u.displayName || "名前なし"}</div>
                                  <div style={{ fontSize: 9, color: "#8A9F9B", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{u.email}</div>
                                </div>
                              </button>
                            );
                          })}

                        {/* ── グループ（全サークル）：サークル名 or メールで検索フィルター ── */}
                        {groups
                          .filter(g => {
                            const query = orgSearchQuery.toLowerCase().trim();
                            if (!query) return true;
                            return (
                              (g.displayName && g.displayName.toLowerCase().includes(query)) ||
                              (g.email && g.email.toLowerCase().includes(query))
                            );
                          })
                          .map((g) => {
                            const isSelected = editIsGroup && editOrganizerId === g.id;
                            return (
                              <button
                                key={g.id}
                                className={`organizer-card ${isSelected ? "organizer-selected" : ""}`}
                                style={adS.organizerCard}
                                onClick={() => {
                                  setEditOrganizerId(g.id);
                                  setEditIsGroup(true);
                                  setEditOrganizerName(g.displayName || "サークル名なし");
                                }}
                              >
                                <div style={adS.cardAvatarWrap}>
                                  {g.avatarUrl ? <img src={g.avatarUrl} style={adS.cardAvatar} alt="" /> : <Users size={14} color="#9AADA8" />}
                                </div>
                                <div style={adS.cardInfo}>
                                  <div style={adS.cardName}>{g.displayName || "サークル名なし"}</div>
                                  <div style={{ fontSize: 9, color: "#8A9F9B", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{g.email}</div>
                                </div>
                              </button>
                            );
                          })}

                      </div>
                    </div>
                  </div>

                  {/* ① ジャンル選択ボタントグル */}
                  <div style={adS.fieldRow}>
                    <label style={adS.formLabel}>① ジャンル <span style={adS.required}>必須</span></label>
                    <div style={adS.optionGrid}>
                      {GENRE_TAGS.map(t => (
                        <button key={t} type="button" className={`tag-tab-btn ${editGenre === t ? "tag-active-tab" : ""}`}
                          style={adS.tagBtn}
                          onClick={() => setEditGenre(t)}>{t}</button>
                      ))}
                    </div>
                  </div>

                  {/* ② 対象学年マルチトグル */}
                  <div style={adS.fieldRow}>
                    <label style={adS.formLabel}>② 対象学年 <span style={adS.required}>必須・複数選択可</span></label>
                    <div style={adS.optionGrid}>
                      {TARGET_TAGS.map(t => (
                        <button key={t} type="button" 
                        className={`tag-tab-btn ${editTargets.includes(t) ? "tag-active-tab" : ""}`}
                          style={adS.tagBtn}
                          onClick={() => setEditTargets(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}>{t}</button>
                      ))}
                    </div>
                  </div>

                  {/* 対象学院選択 */}
                  <div style={adS.fieldRow}>
                    <label style={adS.formLabel}>対象学院（任意・複数可）</label>
                    <div style={adS.optionGrid}>
                      {Object.keys(GAKUIN).map(g => (
                        <button key={g} type="button" 
                        className={`tag-tab-btn ${editTargetGakuin.includes(g) ? "tag-active-tab" : ""}`}
                          style={adS.tagBtn}
                          onClick={() => setEditTargetGakuin(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}>{g}</button>
                      ))}
                    </div>
                  </div>

                  {/* 対象学系選択 */}
                  {editTargetGakuin.length > 0 && (
                    <div style={adS.fieldRow}>
                      <label style={adS.formLabel}>対象学系（任意・複数可）</label>
                      <div style={adS.optionGrid}>
                        {editTargetGakuin.flatMap(g => GAKUIN[g]).map(k => (
                          <button key={k} type="button" 
                          className={`tag-tab-btn ${editTargetGakukei.includes(t) ? "tag-active-tab" : ""}`}
                          style={adS.tagBtn}
                            onClick={() => setEditTargetGakukei(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])}>{k}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ③ キャンパス選択 */}
                  <div style={adS.fieldRow}>
                    <label style={adS.formLabel}>③ キャンパス <span style={adS.required}>必須</span></label>
                    <div style={adS.optionGrid}>
                      {CAMPUS_TAGS.map(t => (
                        <button key={t} type="button" 
                        className={`tag-tab-btn ${editCampus == t ? "tag-active-tab" : ""}`}
                          style={adS.tagBtn}
                        onClick={() => setEditCampus(t)}>{t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ④ 参加スタイル */}
                  <div style={adS.fieldRow}>
                    <label style={adS.formLabel}>④ 参加スタイル（任意）</label>
                    <div style={adS.optionGrid}>
                      {STYLE_TAGS.map(t => (
                        <button key={t} type="button" 
                        className={`tag-tab-btn ${editStyle == t ? "tag-active-tab" : ""}`}
                          style={adS.tagBtn}
                           onClick={() => setEditStyle(prev => prev === t ? "" : t)}>{t}</button>
                      ))}
                    </div>
                  </div>

                  {/* ⑤ 募集者種別 */}
                  <div style={adS.fieldRow}>
                    <label style={adS.formLabel}>⑤ 募集者種別（任意）</label>
                    <div style={adS.optionGrid}>
                      {ORGANIZER_TAGS.map(t => (
                        <button 
                          key={t} 
                          type="button" 
                          className={`tag-tab-btn ${editOrganizerTag== t ? "tag-active-tab" : ""}`}
                          style={adS.tagBtn}
                          onClick={() => setEditOrganizerTag(prev => prev === t ? "" : t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    </div>

                  {/* その他任意入力欄 */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={adS.fieldRow}>
                      <label style={adS.formLabel}>ボタン名</label>
                      <input style={adS.input} value={editApplyLabel} onChange={e => setEditApplyLabel(e.target.value)} />
                    </div>
                    <div style={adS.fieldRow}>
                      <label style={adS.formLabel}>フォームURL</label>
                      <input style={adS.input} value={editApplyLink} onChange={e => setEditApplyLink(e.target.value)} />
                    </div>
                  </div>

                  <div style={adS.fieldRow}>
                    <label style={adS.formLabel}>お問い合わせ連絡先</label>
                    <input style={adS.input} value={editContact} onChange={e => setEditContact(e.target.value)} />
                  </div>

                  {/* アクションボタン */}
                  <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <button className="tag-tab-btn" style={{ flex: 1, padding: 12, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={() => setSelectedEvent(null)}>キャンセル</button>
                    <button className="submit-btn" style={{ flex: 1, padding: 12, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={handleAdminSaveEvent} disabled={saving}>
                      {saving ? "保存中..." : "変更を確定保存"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {/* ── 💡 【新規追加】イベント代打投稿（PostEventと同一のフォーム配置） ── */}
        {activeTab === "proxy_post" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, background: "white", padding: 20, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>イベント代打投稿 (管理者専用)</h2>
            <p style={{ fontSize: 12, color: "#5A7370", margin: 0 }}>学内の特定のユーザーやサークルに代わってイベントを新規作成・代理公開します。</p>

            {/* 1. 募集者選択（検索欄付きハイブリッドグリッド） */}
            <div style={adS.fieldRow}>
              <label style={adS.formLabel}>イベントの本当の募集者（主催者）を選択 <span style={adS.required}>必須</span></label>
              <input 
                style={{ ...adS.input, marginTop: 4, marginBottom: 8 }}
                placeholder="主催する個人名、またはサークル名・メールアドレスで検索..." 
                value={proxyOrgSearch}
                onChange={(e) => setProxyOrgSearch(e.target.value)}
              />
              
              <div style={{ maxHeight: "160px", overflowY: "auto", border: "1px solid #D0DDD9", borderRadius: 8, padding: 8, background: "#FAFDFC" }}>
                <div style={adS.cardGrid}>
                  {/* 個人ユーザーの絞り込み表示 */}
                  {users
                    .filter(u => {
                      const q = proxyOrgSearch.toLowerCase().trim();
                      return !q || (u.displayName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
                    })
                    .map(u => {
                      const isSelected = !proxyIsGroup && proxyOrganizerId === u.id;
                      return (
                        <div key={u.id}
                          className={`organizer-card ${isSelected ? "organizer-selected" : ""}`}
                          style={adS.organizerCard}
                          onClick={() => { setProxyOrganizerId(u.id); setProxyIsGroup(false); }}
                        >
                          <div style={adS.cardAvatarWrap}>
                            {u.avatarUrl ? <img src={u.avatarUrl} style={adS.cardAvatar} alt="" /> : <User size={14} color="#9AADA8" />}
                          </div>
                          <div style={adS.cardInfo}>
                            <div style={adS.cardName}>{u.displayName || "名前なし"}</div>
                            <div style={{ fontSize: 9, color: "#8A9F9B", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{u.email}</div>
                          </div>
                        </div>
                      );
                    })}

                  {/* サークル団体の絞り込み表示 */}
                  {groups
                    .filter(g => {
                      const q = proxyOrgSearch.toLowerCase().trim();
                      return !q || (g.displayName?.toLowerCase().includes(q) || g.email?.toLowerCase().includes(q));
                    })
                    .map(g => {
                      const isSelected = proxyIsGroup && proxyOrganizerId === g.id;
                      return (
                        <div key={g.id}
                          className={`organizer-card ${isSelected ? "organizer-selected" : ""}`}
                          style={adS.organizerCard}
                          onClick={() => { setProxyOrganizerId(g.id); setProxyIsGroup(true); }}
                        >
                          <div style={adS.cardAvatarWrap}>
                            {g.avatarUrl ? <img src={g.avatarUrl} style={adS.cardAvatar} alt="" /> : <Users size={14} color="#9AADA8" />}
                          </div>
                          <div style={adS.cardInfo}>
                            <div style={adS.cardName}>{g.displayName || "名前なし"}</div>
                            <div style={{ fontSize: 9, color: "#8A9F9B", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{g.email}</div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* 2. イベント画像 */}
            <div style={adS.fieldRow}>
              <label style={adS.formLabel}>イベント画像（任意）</label>
              <div style={{ ...adS.imageArea, height: 160 }} onClick={() => document.getElementById("proxyEventFile").click()}>
                {proxyPreview ? (
                  <img src={proxyPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ textAlign: "center", color: "#BACFCB" }}>
                    <ImageIcon size={32} />
                    <div style={{ fontSize: 12, marginTop: 4, fontWeight: 600 }}>タップして画像を追加</div>
                  </div>
                )}
              </div>
              <input id="proxyEventFile" type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                setProxyImageFile(file);
                setProxyPreview(URL.createObjectURL(file));
              }} />
            </div>

            {/* 3. イベント名 */}
            <div style={adS.fieldRow}>
              <label style={adS.formLabel}>イベント名 <span style={adS.required}>必須</span></label>
              <input style={adS.input} placeholder="例：【代打投稿】第1回 新歓説明会" value={proxyTitle} onChange={e => setProxyTitle(e.target.value)} />
            </div>

            {/* 4. イベント詳細 */}
            <div style={adS.fieldRow}>
              <label style={adS.formLabel}>イベント詳細 <span style={adS.required}>必須</span></label>
              <textarea style={{ ...adS.input, minHeight: 100, resize: "vertical", lineHeight: 1.6 }} placeholder="イベントの紹介文やタイムスケジュール、集合場所などを詳細に入力" value={proxyDetail} onChange={e => setProxyDetail(e.target.value)} rows={4} />
            </div>

            {/* 5. 開催日時 */}
            <div style={adS.fieldRow}>
              <label style={adS.formLabel}>イベント日時 <span style={adS.required}>必須</span></label>
              <input style={adS.input} type="date" value={proxyDate} onChange={e => setProxyDate(e.target.value)} onFocus={e => e.target.showPicker()} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: "#5A7370", fontWeight: 700 }}>開始時刻（任意）</label>
                  <input style={adS.input} type="time" value={proxyStartTime} onChange={e => setProxyStartTime(e.target.value)} onFocus={e => e.target.showPicker()} />
                </div>
                <div style={{ paddingTop: 20, color: "#5A7370" }}>〜</div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: "#5A7370", fontWeight: 700 }}>終了時刻（任意）</label>
                  <input style={adS.input} type="time" value={proxyEndTime} onChange={e => setProxyEndTime(e.target.value)} onFocus={e => e.target.showPicker()} />
                </div>
              </div>
            </div>

            {/* 6. 開催場所 */}
            <div style={adS.fieldRow}>
              <label style={adS.formLabel}>場所 <span style={adS.required}>必須</span></label>
              <input style={adS.input} placeholder="例：大岡山キャンパス W2棟講義室" value={proxyLocation} onChange={e => setProxyLocation(e.target.value)} />
            </div>

            {/* 7. 申し込み締め切り */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={adS.fieldRow}>
                <label style={adS.formLabel}>申し込み締切日 <span style={adS.required}>必須</span></label>
                <input style={adS.input} type="date" value={proxyDeadline} onChange={e => setProxyDeadline(e.target.value)} onFocus={e => e.target.showPicker()} />
              </div>
              <div style={adS.fieldRow}>
                <label style={adS.formLabel}>締め切り時間（任意）</label>
                <input style={adS.input} type="time" value={proxyDeadlineTime} onChange={e => setProxyDeadlineTime(e.target.value)} onFocus={e => e.target.showPicker()} />
              </div>
            </div>

            {/* ① ジャンル */}
            <div style={adS.fieldRow}>
              <label style={adS.formLabel}>① ジャンル <span style={adS.required}>必須</span></label>
              <div style={adS.optionGrid}>
                {GENRE_TAGS.map(t => (
                  <button key={t} 
                  type="button" 
                  className={`tag-tab-btn ${proxyGenre === t ? "tag-active-tab" : ""}`}
                  style={adS.tagBtn}
                  onClick={() => setProxyGenre(t)}>{t}</button>
                ))}
              </div>
            </div>

            {/* ② 対象学年 */}
            <div style={adS.fieldRow}>
              <label style={adS.formLabel}>② 対象学年 <span style={adS.required}>必須・複数選択可</span></label>
              <div style={adS.optionGrid}>
                {TARGET_TAGS.map(t => (
                  <button key={t} 
                  type="button" 
                  className={`tag-tab-btn ${proxyTargets.includes(t) ? "tag-active-tab" : ""}`}
                  style={adS.tagBtn}
                    onClick={() => setProxyTargets(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}>{t}</button>
                ))}
              </div>
            </div>

            {/* 対象学院 */}
            <div style={adS.fieldRow}>
              <label style={adS.formLabel}>対象学院（任意・複数選択可）</label>
              <div style={adS.optionGrid}>
                {Object.keys(GAKUIN).map(g => (
                  <button key={g} type="button" 
                  className={`tag-tab-btn ${proxyTargetGakuin.includes(g) ? "tag-active-tab" : ""}`}
                  style={adS.tagBtn}
                    onClick={() => setProxyTargetGakuin(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}>{g}</button>
                ))}
              </div>
            </div>

            {/* 対象学系 */}
            {proxyTargetGakuin.length > 0 && (
              <div style={adS.fieldRow}>
                <label style={adS.formLabel}>対象学系（任意・複数選択可）</label>
                <div style={adS.optionGrid}>
                  {proxyTargetGakuin.flatMap(g => GAKUIN[g]).map(k => (
                    <button key={k} type="button" 
                    className={`tag-tab-btn ${proxyTargetGakukei.includes(k) ? "tag-active-tab" : ""}`}
                  style={adS.tagBtn}
                      onClick={() => setProxyTargetGakukei(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])}>{k}</button>
                  ))}
                </div>
              </div>
            )}

            {/* ③ キャンパス */}
            <div style={adS.fieldRow}>
              <label style={adS.formLabel}>③ キャンパス <span style={adS.required}>必須</span></label>
              <div style={adS.optionGrid}>
                {CAMPUS_TAGS.map(t => (
                  <button key={t} type="button" 
                  className={`tag-tab-btn ${proxyCampus === t ? "tag-active-tab" : ""}`}
                  style={adS.tagBtn}
                  onClick={() => setProxyCampus(t)}>{t}</button>
                ))}
              </div>
            </div>

            {/* ④ 参加スタイル */}
            <div style={adS.fieldRow}>
              <label style={adS.formLabel}>④ 参加スタイル（任意）</label>
              <div style={adS.optionGrid}>
                {STYLE_TAGS.map(t => (
                  <button key={t} type="button" 
                  className={`tag-tab-btn ${proxyStyle === t ? "tag-active-tab" : ""}`}
                  style={adS.tagBtn}
                  onClick={() => setProxyStyle(prev => prev === t ? "" : t)}>{t}</button>
                ))}
              </div>
            </div>

            {/* ⑤ 募集者種別 */}
            <div style={adS.fieldRow}>
              <label style={adS.formLabel}>⑤ 募集者種別（任意）</label>
              <div style={adS.optionGrid}>
                {ORGANIZER_TAGS.map(t => (
                  <button key={t} type="button" 
                  className={`tag-tab-btn ${proxyOrganizerTag === t ? "tag-active-tab" : ""}`}
                  style={adS.tagBtn}
                  onClick={() => setProxyOrganizerTag(prev => prev === t ? "" : t)}>{t}</button>
                ))}
              </div>
            </div>

            {/* 外部リンク */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={adS.fieldRow}>
                <label style={adS.formLabel}>申し込みボタン名</label>
                <input style={adS.input} placeholder="参加を申し込む" value={proxyApplyLabel} onChange={e => setProxyApplyLabel(e.target.value)} />
              </div>
              <div style={adS.fieldRow}>
                <label style={adS.formLabel}>申し込みリンクURL</label>
                <input style={adS.input} type="url" placeholder="https://forms.gle/..." value={proxyApplyLink} onChange={e => setProxyApplyLink(e.target.value)} />
              </div>
            </div>

            <div style={adS.fieldRow}>
              <label style={adS.formLabel}>お問い合わせ連絡先</label>
              <input style={adS.input} placeholder="例：example@m.isct.ac.jp" value={proxyContact} onChange={e => setProxyContact(e.target.value)} />
            </div>

            {/* 送信ボタン */}
            <button 
            className="submit-btn"
              style={{ padding: 14, border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 12 }} 
              onClick={handleProxySubmitEvent} 
              disabled={saving}
            >
              {saving ? "代打投稿中..." : "この内容で代打投稿を完了する"}
            </button>
          </div>
        )}

        {/* ── 登録者一覧 ── */}      
        {activeTab === "users" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>登録者一覧（{users.length}人）</h2>
            <input style={adS.input} placeholder="名前・メールアドレスで検索..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
            
            {users.filter((u) => !userSearch || u.displayName?.includes(userSearch) || u.email?.includes(userSearch)).map((u) => (
              <div key={u.id} className="event-hover-card" style={{ ...adS.listItem, cursor: "pointer" }} onClick={() => setSelectedUser(u)}>
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

            {selectedUser && (
              <div style={adS.modal}>
                <div style={{ ...adS.modalCard, maxHeight: "90vh", overflowY: "auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>ユーザー情報の編集</h3>
                    <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20 }} onClick={() => { setSelectedUser(null); setEditingUser(null); }}>✕</button>
                  </div>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "#F4F6F5", padding: 16, borderRadius: 12, alignItems: "center" }}>
                    {(editingUser?.avatarUrl ?? selectedUser.avatarUrl) ? (
                      <img src={editingUser?.avatarUrl ?? selectedUser.avatarUrl} alt="avatar" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "2px solid white", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }} />
                    ) : (
                      <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#F9EAED", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}><User size={36} color={THEME} /></div>
                    )}
                    
                    <div style={{ display: "flex", gap: 8, width: "100%", justifyContent: "center" }}>
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
                              const storageRef = ref(storage, `avatars/${selectedUser.id}/${file.name}`);
                              await uploadBytes(storageRef, file);
                              const downloadUrl = await getDownloadURL(storageRef);
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

                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#5A7370" }}>画像URL（直接指定）</label>
                    <input 
                      style={adS.input} 
                      placeholder="https://example.com/avatar.jpg"
                      value={editingUser?.avatarUrl ?? selectedUser.avatarUrl ?? ""} 
                      onChange={(e) => setEditingUser({ ...(editingUser || selectedUser), avatarUrl: e.target.value })} 
                    />
                  </div>

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

                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button className="tag-tab-btn" style={{ flex: 1, padding: 12, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={() => { setSelectedUser(null); setEditingUser(null); }}>キャンセル</button>
                    <button className="submit-btn" style={{ flex: 1, padding: 12, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
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
            
            {/* 💡 クリックイベントを handleOpenGroupDetail(g) に差し替え */}
            {groups.filter((g) => !groupSearch || g.displayName?.includes(groupSearch) || g.email?.includes(groupSearch)).map((g) => (
              <div key={g.id} className="event-hover-card" style={{ ...adS.listItem, cursor: "pointer" }} onClick={() => handleOpenGroupDetail(g)}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#F9EAED", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                  {g.avatarUrl ? <img src={g.avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : "👥"}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="hover-title-underline" style={{ fontSize: 14, fontWeight: 700 }}>{g.displayName}</div>
                  <div style={{ fontSize: 11, color: "#5A7370" }}>{g.groupType} · {g.email || "アドレス未登録"} · メンバー{g.members?.length || 0}人</div>
                </div>
                <span style={{ fontSize: 12, color: THEME, fontWeight: 700 }}>詳細 ›</span>
              </div>
            ))}

            {/* 💡 【高機能な編集・確認モーダル】 */}
            {selectedGroup && (
              <div style={adS.modal}>
                <div style={{ ...adS.modalCard, maxHeight: "90vh", overflowY: "auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>グループ詳細・編集 (管理者)</h3>
                    <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20 }} onClick={() => setSelectedGroup(null)}>✕</button>
                  </div>
                  
                  {/* アバター画像エリア（編集・クリア対応） */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "#F4F6F5", padding: 16, borderRadius: 12, alignItems: "center" }}>
                    {editGroupAvatar ? (
                      <img src={editGroupAvatar} alt="avatar" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid white", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }} />
                    ) : (
                      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#F9EAED", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}><Users size={32} color={THEME} /></div>
                    )}
                    
                    <div style={{ display: "flex", gap: 8 }}>
                      <label style={{ padding: "5px 12px", background: "white", border: "1.5px solid #D0DDD9", borderRadius: 6, fontSize: 11, fontWeight: 700, color: "#5A7370", cursor: "pointer" }}>
                        アバター画像アップロード
                        <input 
                          type="file" 
                          accept="image/*" 
                          style={{ display: "none" }} 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              alert("グループ画像をアップロード中...");
                              const storageRef = ref(storage, `groups/${selectedGroup.id}/avatar.png`);
                              await uploadBytes(storageRef, file);
                              const downloadUrl = await getDownloadURL(storageRef);
                              setEditGroupAvatar(downloadUrl);
                              alert("アップロード完了！（下の変更保存で確定します）");
                            } catch (err) {
                              alert("アップロードに失敗しました。");
                            }
                          }}
                        />
                      </label>
                      {editGroupAvatar && (
                        <button type="button" style={{ padding: "5px 12px", background: "#FFEBEE", border: "none", borderRadius: 6, color: "#C62828", fontSize: 11, fontWeight: 700, cursor: "pointer" }} onClick={() => setEditGroupAvatar("")}>画像をクリア</button>
                      )}
                    </div>
                  </div>

                  {/* グループ基本情報入力欄 */}
                  <div style={adS.fieldRow}>
                    <label style={adS.formLabel}>グループ名 / サークル名 <span style={adS.required}>必須</span></label>
                    <input style={adS.input} value={editGroupName} onChange={e => setEditGroupName(e.target.value)} />
                  </div>

                  <div style={adS.fieldRow}>
                    <label style={adS.formLabel}>グループ共通メールアドレス</label>
                    <input style={adS.input} value={editGroupEmail} onChange={e => setEditGroupEmail(e.target.value)} placeholder="未登録" />
                  </div>

                  {/* グループ区分トグルボタン */}
                  <div style={adS.fieldRow}>
                    <label style={adS.formLabel}>グループ区分</label>
                    <div style={adS.optionGrid}>
                      {["サークル", "団体", "企業", "その他"].map((t) => (
                        <button 
                          key={t} 
                          type="button" 
                          className={`tag-tab-btn ${editGroupType === t ? "tag-active-tab" : ""}`}
                          style={adS.tagBtn}
                          onClick={() => setEditGroupType(t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={adS.fieldRow}>
                    <label style={adS.formLabel}>グループ説明文 / 紹介テキスト</label>
                    <textarea style={{ ...adS.input, height: 70, resize: "vertical", lineHeight: 1.5 }} value={editGroupDesc} onChange={e => setEditGroupDesc(e.target.value)} placeholder="サークルの新歓紹介テキスト" />
                  </div>

                  {/* SNS・リンク */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, border: "1px solid #E0E8E7", padding: 12, borderRadius: 10, background: "#FAFDFC" }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#5A7370" }}>SNS・外部リンクの編集</span>
                    <input style={{ ...adS.input, padding: "8px 12px", fontSize: 13 }} placeholder="𝕏 (Twitter) URL" value={editGroupTwitter} onChange={e => setEditGroupTwitter(e.target.value)} />
                    <input style={{ ...adS.input, padding: "8px 12px", fontSize: 13 }} placeholder="Instagram URL" value={editGroupInstagram} onChange={e => setEditGroupInstagram(e.target.value)} />
                    <input style={{ ...adS.input, padding: "8px 12px", fontSize: 13 }} placeholder="公式ホームページ URL" value={editGroupHomepage} onChange={e => setEditGroupHomepage(e.target.value)} />
                  </div>

                  {/* メンバー一覧セクション（代表者マーク付き） */}
                  {/* メンバー一覧セクション（代表者マークの判定フィールドを修正） */}
                  <div style={adS.fieldRow}>
                    <label style={adS.formLabel}>所属メンバー（{groupMembersData.length}人）</label>
                    <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid #F0F0F0", borderRadius: 8, padding: "4px 8px" }}>
                      {groupMembersData.length === 0 ? (
                        <div style={{ fontSize: 12, color: "#9AADA8", textAlign: "center", padding: "8px 0" }}>所属メンバーはいません</div>
                      ) : (
                        groupMembersData.map(m => {
                          // 👑 代表者判定用キーを owner から createdBy に正確に修正
                          const isOwner = selectedGroup.createdBy === m.id;
                          return (
                            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #F8FAF9" }}>
                              <div style={{ width: 22, height: 22, borderRadius: "50%", background: isOwner ? "#FFF9C4" : "#F9EAED", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {m.avatarUrl ? <img src={m.avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <User size={12} color={THEME} />}
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{m.displayName || "名前なし"}</span>
                              
                              {/* 👑 正しいフラグを基に王冠・代表者バッジを表示 */}
                              {isOwner && (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#FFF3E0", color: "#E65100", fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4, border: "1px solid #FFE0B2" }}>
                                  <Crown size={12} color="#E65100" fill="#E65100" /> 代表者
                                </span>
                              )}

                              <span style={{ fontSize: 11, color: "#7A9591", marginLeft: "auto" }}>{m.gakuin} / {m.gakunen}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* モーダルボトムアクション */}
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button className="tag-tab-btn" type="button" style={{ flex: 1, padding: 12,borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }} onClick={() => setSelectedGroup(null)}>キャンセル</button>
                    <button className="submit-btn" type="button" style={{ flex: 1, padding: 12, background: THEME, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }} onClick={handleAdminSaveGroup} disabled={saving}>
                      {saving ? "保存中..." : "グループ変更を保存"}
                    </button>
                  </div>
                  
                  <button type="button" style={{ width: "100%", padding: "10px", background: "none", border: "1px solid #E53935", color: "#E53935", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", marginTop: 4 }}
                    onClick={() => handleDeleteGroup(selectedGroup.id, selectedGroup.displayName)}>
                    ⚠️ このグループをシステムから強制削除する
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 保存ボタン（お知らせタブ用） */}
        {activeTab === "notice" && (
          <button className="submit-btn" style={{ marginTop: 24, width: "100%", padding: 14, border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer" }} onClick={handleSave} disabled={saving}>
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
  modalCard: { background: "white", borderRadius: 16, padding: "20px", width: "100%", maxWidth: 540, display: "flex", flexDirection: "column", gap: 14, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" },
  
  // 💡 追加したスタイリッシュな内部パーツオブジェクト
  formLabel: { fontSize: 12, fontWeight: 700, color: "#5A7370", marginTop: 2 },
  fieldRow: { display: "flex", flexDirection: "column", gap: 4 },
  required: { background: "#E53935", color: "white", fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 3, marginLeft: 4, display: "inline-block", width: "fit-content" },
  imageArea: { width: "100%", height: 130, borderRadius: 10, border: "2px dashed #D0DDD9", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFDFC", overflow: "hidden" },
  optionGrid: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 },
  tagBtn: { padding: "5px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: "pointer" },
  cardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 6 },
  organizerCard: { display: "flex", alignItems: "center", gap: 6, padding: "6px", borderRadius: 6, cursor: "pointer" },
  cardAvatarWrap: { width: 24, height: 24, borderRadius: "50%", background: "#E0E8E7", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 },
  cardAvatar: { width: "100%", height: "100%", objectFit: "cover" },
  cardInfo: { minWidth: 0, flex: 1 },
  cardName: { fontSize: 11, fontWeight: 700, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" },
};