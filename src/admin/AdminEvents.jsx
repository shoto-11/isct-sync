import { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import { doc, getDoc, updateDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { User, Users, Eye, Heart, CalendarCheck, Send } from "lucide-react";
import { THEME, GENRE_TAGS, TARGET_TAGS, CAMPUS_TAGS, STYLE_TAGS, ORGANIZER_TAGS, RECRUIT_TAGS, GAKUIN } from "../constants";
import "../animations.css";
import heic2any from "heic2any";
import EventFormCore from "../EventFormCore";



export default function AdminEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [eventSearch, setEventSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [statsMap, setStatsMap] = useState({});
  const [filterMode, setFilterMode] = useState("all");
  const [sortMode, setSortMode] = useState("newest");

  // 編集用state
  const [editTitle, setEditTitle] = useState("");
  const [editDetail, setEditDetail] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editApplyLabel, setEditApplyLabel] = useState("");
  const [editApplyLink, setEditApplyLink] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editOrganizerName, setEditOrganizerName] = useState("");
  const [editPreview, setEditPreview] = useState(null);
  const [editImageFile, setEditImageFile] = useState(null);
  const [editOrganizerId, setEditOrganizerId] = useState("");
  const [editIsGroup, setEditIsGroup] = useState(false);
  const [orgSearchQuery, setOrgSearchQuery] = useState("");
  const [editAttachments, setEditAttachments] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);

  // 日時（複数日程）
  const [editDates, setEditDates] = useState([{ date: "", startTime: "", endTime: "" }]);
  const [editHasDate, setEditHasDate] = useState(true);

  // 締切
  const [editDeadline, setEditDeadline] = useState("");
  const [editDeadlineTime, setEditDeadlineTime] = useState("");
  const [editHasDeadline, setEditHasDeadline] = useState(true);

  // タグ（配列対応）
  const [editGenre, setEditGenre] = useState("");
  const [editTargets, setEditTargets] = useState([]);
  const [editCampus, setEditCampus] = useState([]);
  const [editStyle, setEditStyle] = useState([]);
  const [editOrganizerTag, setEditOrganizerTag] = useState([]);
  const [editRecruitTag, setEditRecruitTag] = useState([]);
  const [editTargetGakuin, setEditTargetGakuin] = useState([]);
  const [editTargetGakukei, setEditTargetGakukei] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const [eventsSnap, usersSnap, groupsSnap] = await Promise.all([
        getDocs(collection(db, "events")),
        getDocs(collection(db, "users")),
        getDocs(collection(db, "groups")),
      ]);
      setEvents(eventsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setGroups(groupsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const statsSnap = await getDocs(collection(db, "eventStats"));
      const map = {};
      statsSnap.docs.forEach(d => {
        const data = d.data();
        const key = data.eventId || d.id;
        map[key] = {
          views: (data.views || []).length,
          likes: (data.likes || []).length,
          joins: (data.joins || []).length,
          applies: data.applyCount || 0,
        };
      });
      setStatsMap(map);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleOpenEventEdit = (event) => {
    setSelectedEvent(event);
    setEditTitle(event.title || "");
    setEditDetail(event.detail || event.description || "");
    setEditLocation(event.location || "");
    setEditApplyLabel(event.applyLabel || "");
    setEditApplyLink(event.applyLink || "");
    setEditContact(event.contact || "");
    setEditOrganizerName(event.organizerName || "");
    setEditPreview(event.imageUrl || null);
    setEditImageFile(null);
    setEditOrganizerId(event.organizerId || event.createdBy || "");
    setEditIsGroup(event.organizerType === "group" || event.isGroup === true);
    setOrgSearchQuery("");
    setExistingAttachments(event.attachments || []);
    setEditAttachments([]);

    // 日時
    if (event.dates?.length > 0) {
      setEditHasDate(true);
      setEditDates(event.dates);
    } else if (event.date) {
      setEditHasDate(true);
      setEditDates([{ date: event.date, startTime: event.startTime || "", endTime: event.endTime || "" }]);
    } else {
      setEditHasDate(false);
      setEditDates([{ date: "", startTime: "", endTime: "" }]);
    }

    // 締切
    setEditHasDeadline(!!event.deadline);
    setEditDeadline(event.deadline || "");
    setEditDeadlineTime(event.deadlineTime || "");

    // タグ（文字列→配列に変換）
    setEditGenre(event.tags?.genre || "");
    setEditTargets(event.tags?.targets || []);
    setEditCampus(Array.isArray(event.tags?.campus) ? event.tags.campus : event.tags?.campus ? [event.tags.campus] : []);
    setEditStyle(Array.isArray(event.tags?.style) ? event.tags.style : event.tags?.style ? [event.tags.style] : []);
    setEditOrganizerTag(Array.isArray(event.tags?.organizer) ? event.tags.organizer : event.tags?.organizer ? [event.tags.organizer] : []);
    setEditRecruitTag(Array.isArray(event.tags?.recruit) ? event.tags.recruit : event.tags?.recruit ? [event.tags.recruit] : []);
    setEditTargetGakuin(event.targetGakuin || []);
    setEditTargetGakukei(event.targetGakukei || []);
  };

  const handleSave = async () => {
    if (!editTitle.trim() || !editDetail.trim() || !editGenre) {
      alert("イベント名・詳細・ジャンルは必須です。"); return;
    }
    if (editHasDate && editDates.some(d => !d.date)) {
      alert("開催日を入力してください。"); return;
    }
    if (editHasDeadline && !editDeadline) {
      alert("締切日を入力してください。"); return;
    }
    setSaving(true);
    try {
      let finalImageUrl = selectedEvent.imageUrl || null;
      if (editImageFile) {
        const storageRef = ref(storage, `events/${Date.now()}_${editImageFile.name}`);
        await uploadBytes(storageRef, editImageFile);
        finalImageUrl = await getDownloadURL(storageRef);
      }
      const newAttachmentUrls = [];
      for (const file of editAttachments) {
        const storageRef = ref(storage, `attachments/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        newAttachmentUrls.push({ name: file.name, url });
      }
      const updatedFields = {
        title: editTitle.trim(),
        detail: editDetail.trim(),
        location: editLocation.trim(),
        deadline: editHasDeadline ? editDeadline : "",
        deadlineTime: editHasDeadline ? editDeadlineTime : "",
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
          recruit: editRecruitTag,
        },
        targetGakuin: editTargetGakuin,
        targetGakukei: editTargetGakukei,
        organizerId: editOrganizerId,
        organizerType: editIsGroup ? "group" : "personal",
        createdBy: editOrganizerId,
        isGroup: editIsGroup,
        organizerAvatar: editIsGroup
          ? (groups.find(g => g.id === editOrganizerId)?.avatarUrl || "")
          : (users.find(u => u.id === editOrganizerId)?.avatarUrl || ""),
        attachments: [...existingAttachments, ...newAttachmentUrls],
        dates: editHasDate ? editDates : [],
        date: editHasDate ? (editDates[0]?.date || "") : "",
        startTime: editHasDate ? (editDates[0]?.startTime || "") : "",
        endTime: editHasDate ? (editDates[0]?.endTime || "") : "",
      };
      await updateDoc(doc(db, "events", selectedEvent.id), updatedFields);
      setEvents(prev => prev.map(e => e.id === selectedEvent.id ? { ...e, ...updatedFields } : e));
      setSelectedEvent(null);
      alert("更新しました！");
    } catch (err) {
      alert("保存に失敗しました: " + err.message);
    } finally { setSaving(false); }
  };

  const handleDelete = async (eventId, title) => {
    if (!window.confirm(`「${title}」を削除しますか？`)) return;
    await deleteDoc(doc(db, "events", eventId));
    setEvents(prev => prev.filter(e => e.id !== eventId));
    alert("削除しました");
  };

  if (loading) return <p style={{ padding: 24 }}>読み込み中...</p>;

  const now = new Date();
  const filtered = events
    .filter(e => {
      if (filterMode === "active") {
        if (!e.deadline) return true;
        const deadlineStr = e.deadlineTime ? `${e.deadline}T${e.deadlineTime}` : `${e.deadline}T23:59`;
        return new Date(deadlineStr) > now;
      }
      return true;
    })
    .filter(e => !eventSearch || e.title?.includes(eventSearch) || e.organizerName?.includes(eventSearch))
    .sort((a, b) => {
      const sa = statsMap[a.id] || {};
      const sb = statsMap[b.id] || {};
      if (sortMode === "views") return (sb.views || 0) - (sa.views || 0);
      if (sortMode === "likes") return (sb.likes || 0) - (sa.likes || 0);
      if (sortMode === "joins") return (sb.joins || 0) - (sa.joins || 0);
      if (sortMode === "applies") return (sb.applies || 0) - (sa.applies || 0);
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return tb - ta;
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700 }}>全イベント一覧（{filtered.length}件）</h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[{ id: "all", label: "全て" }, { id: "active", label: "募集中のみ" }].map(f => (
            <button key={f.id} className={`tag-tab-btn ${filterMode === f.id ? "tag-active-tab" : ""}`}
              style={{ padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              onClick={() => setFilterMode(f.id)}>{f.label}</button>
          ))}
        </div>
        <select
          style={{ padding: "6px 12px", border: "1.5px solid #D0DDD9", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#5A7370", background: "white", cursor: "pointer", outline: "none" }}
          value={sortMode} onChange={e => setSortMode(e.target.value)}
        >
          <option value="newest">新着順</option>
          <option value="views">閲覧数順</option>
          <option value="likes">いいね数順</option>
          <option value="joins">参加予定数順</option>
          <option value="applies">申し込み数順</option>
        </select>
      </div>

      <input style={s.input} placeholder="イベント名・主催者名で検索..." value={eventSearch} onChange={e => setEventSearch(e.target.value)} />

      {filtered.map(event => {
        const st = statsMap[event.id] || {};
        return (
          <div key={event.id} className="event-hover-card" style={s.listItem}>
            {event.imageUrl
              ? <img src={event.imageUrl} alt="" style={{ width: 60, height: 34, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
              : <div style={{ width: 60, height: 34, background: "#F4F6F5", borderRadius: 6, flexShrink: 0 }} />
            }
            <div style={{ flex: 1, cursor: "pointer", minWidth: 0 }} onClick={() => navigate(`/events/${event.id}`)}>
              <div className="hover-title-underline" style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.title}</div>
              <div style={{ fontSize: 11, color: "#5A7370" }}>{event.organizerName} · {event.date}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                <span style={s.statBadge}><Eye size={11} /> {st.views || 0}</span>
                <span style={s.statBadge}><Heart size={11} /> {st.likes || 0}</span>
                <span style={s.statBadge}><CalendarCheck size={11} /> {st.joins || 0}</span>
                <span style={s.statBadge}><Send size={11} /> {st.applies || 0}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button style={{ ...s.smallBtn, color: THEME, border: "1px solid #D0DDD9", background: "white", padding: "6px 12px", borderRadius: 6 }} onClick={() => handleOpenEventEdit(event)}>編集</button>
              <button style={{ ...s.smallBtn, color: "#E53935" }} onClick={() => handleDelete(event.id, event.title)}>削除</button>
            </div>
          </div>
        );
      })}

      {selectedEvent && (
        <div style={s.modal}>
          <div style={s.modalCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>イベント編集 (管理者)</h3>
              <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20 }} onClick={() => setSelectedEvent(null)}>✕</button>
            </div>

{/* 主催者変更（管理者専用：全ユーザー・グループから選択） */}
            <div style={s.fieldRow}>
              <label style={s.formLabel}>主催者の変更</label>
              <input style={{ ...s.input, marginBottom: 8 }} placeholder="名前・メールで検索..." value={orgSearchQuery} onChange={e => setOrgSearchQuery(e.target.value)} />
              <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid #D0DDD9", borderRadius: 8, padding: 8, background: "#FAFDFC" }}>
                <div style={s.cardGrid}>
                  {users.filter(u => { const q = orgSearchQuery.toLowerCase(); return !q || u.displayName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q); }).map(u => (
                    <button key={u.id} className={`organizer-card ${!editIsGroup && editOrganizerId === u.id ? "organizer-selected" : ""}`}
                      style={s.organizerCard}
                      onClick={() => { setEditOrganizerId(u.id); setEditIsGroup(false); setEditOrganizerName(u.displayName || ""); }}>
                      <div style={s.cardAvatarWrap}>{u.avatarUrl ? <img src={u.avatarUrl} style={s.cardAvatar} alt="" /> : <User size={14} color="#9AADA8" />}</div>
                      <div style={s.cardInfo}>
                        <div style={s.cardName}>{u.displayName || "名前なし"}</div>
                        <div style={{ fontSize: 9, color: "#8A9F9B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                      </div>
                    </button>
                  ))}
                  {groups.filter(g => { const q = orgSearchQuery.toLowerCase(); return !q || g.displayName?.toLowerCase().includes(q); }).map(g => (
                    <button key={g.id} className={`organizer-card ${editIsGroup && editOrganizerId === g.id ? "organizer-selected" : ""}`}
                      style={s.organizerCard}
                      onClick={() => { setEditOrganizerId(g.id); setEditIsGroup(true); setEditOrganizerName(g.displayName || ""); }}>
                      <div style={s.cardAvatarWrap}>{g.avatarUrl ? <img src={g.avatarUrl} style={s.cardAvatar} alt="" /> : <Users size={14} color="#9AADA8" />}</div>
                      <div style={s.cardInfo}>
                        <div style={s.cardName}>{g.displayName || "名前なし"}</div>
                        <div style={{ fontSize: 9, color: "#8A9F9B" }}>グループ</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* EventFormCore：画像・基本情報・日時・締切・タグ・添付・申し込み・連絡先 */}
            <EventFormCore
              isEditMode={true}
              preview={editPreview}
              onImageChange={async e => {
                let f = e.target.files[0];
                if (!f) return;
                if (f.type === "image/heic" || f.type === "image/heif" || f.name.toLowerCase().endsWith(".heic") || f.name.toLowerCase().endsWith(".heif")) {
                  try {
                    const converted = await heic2any({ blob: f, toType: "image/jpeg", quality: 0.85 });
                    f = new File([converted], f.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg"), { type: "image/jpeg" });
                  } catch { alert("画像の変換に失敗しました。"); return; }
                }
                setEditImageFile(f);
                setEditPreview(URL.createObjectURL(f));
              }}
              imageInputId="adminEventImg"
              title={editTitle} setTitle={setEditTitle}
              detail={editDetail} setDetail={setEditDetail}
              location={editLocation} setLocation={setEditLocation}
              contact={editContact} setContact={setEditContact}
              applyLabel={editApplyLabel} setApplyLabel={setEditApplyLabel}
              applyLink={editApplyLink} setApplyLink={setEditApplyLink}
              hasDate={editHasDate} setHasDate={setEditHasDate}
              dates={editDates} setDates={setEditDates}
              hasDeadline={editHasDeadline} setHasDeadline={setEditHasDeadline}
              deadline={editDeadline} setDeadline={setEditDeadline}
              deadlineTime={editDeadlineTime} setDeadlineTime={setEditDeadlineTime}
              genreTag={editGenre} setGenreTag={setEditGenre}
              recruitTags={editRecruitTag} setRecruitTags={setEditRecruitTag}
              targetTags={editTargets} setTargetTags={setEditTargets}
              targetGakuin={editTargetGakuin} setTargetGakuin={setEditTargetGakuin}
              targetGakukei={editTargetGakukei} setTargetGakukei={setEditTargetGakukei}
              campusTags={editCampus} setCampusTags={setEditCampus}
              styleTags={editStyle} setStyleTags={setEditStyle}
              organizerTags={editOrganizerTag} setOrganizerTags={setEditOrganizerTag}
              existingAttachments={existingAttachments} setExistingAttachments={setExistingAttachments}
              attachments={editAttachments} setAttachments={setEditAttachments}
              attachInputId="adminAttachInput"
            />

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="tag-tab-btn" style={{ flex: 1, padding: 12, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={() => setSelectedEvent(null)}>キャンセル</button>
              <button className="submit-btn" style={{ flex: 1, padding: 12, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={handleSave} disabled={saving}>{saving ? "保存中..." : "変更を確定保存"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  listItem: { background: "white", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  statBadge: { fontSize: 11, fontWeight: 600, color: "#5A7370", background: "#F4F6F5", padding: "2px 7px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 3 },
  input: { padding: "10px 14px", border: "1.5px solid #D0DDD9", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" },
  smallBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 16, fontWeight: 700, padding: "2px 6px" },
  modal: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  modalCard: { background: "white", borderRadius: 16, padding: "20px", width: "100%", maxWidth: 540, display: "flex", flexDirection: "column", gap: 14, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" },
  formLabel: { fontSize: 12, fontWeight: 700, color: "#5A7370", marginTop: 2 },
  fieldRow: { display: "flex", flexDirection: "column", gap: 4 },
  required: { background: "#E53935", color: "white", fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 3, marginLeft: 4 },
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