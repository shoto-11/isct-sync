import { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import { doc, getDoc, updateDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { User, Users, ImageIcon, Eye, Heart, CalendarCheck, Send } from "lucide-react";
import { THEME, GENRE_TAGS, TARGET_TAGS, CAMPUS_TAGS, STYLE_TAGS, ORGANIZER_TAGS, RECRUIT_TAGS, GAKUIN } from "../constants";
import "../animations.css";
import heic2any from "heic2any";
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
  const [filterMode, setFilterMode] = useState("all"); // "all" | "active"
  const [sortMode, setSortMode] = useState("newest"); // "newest" | "views" | "likes" | "joins" | "applies"

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
  const [editRecruitTag, setEditRecruitTag] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editTargetGakuin, setEditTargetGakuin] = useState([]);
  const [editTargetGakukei, setEditTargetGakukei] = useState([]);
  const [editOrganizerName, setEditOrganizerName] = useState("");
  const [editPreview, setEditPreview] = useState(null);
  const [editImageFile, setEditImageFile] = useState(null);
  const [editOrganizerId, setEditOrganizerId] = useState("");
  const [editIsGroup, setEditIsGroup] = useState(false);
  const [orgSearchQuery, setOrgSearchQuery] = useState("");
  const [editAttachments, setEditAttachments] = useState([]);
const [existingAttachments, setExistingAttachments] = useState([]);

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
    setEditRecruitTag(event.tags?.recruit || "");
    setEditContact(event.contact || "");
    setEditTargetGakuin(event.targetGakuin || []);
    setEditTargetGakukei(event.targetGakukei || []);
    setEditOrganizerName(event.organizerName || "");
    setEditPreview(event.imageUrl || null);
    setEditImageFile(null);
    setEditOrganizerId(event.organizerId || event.createdBy || "");
    setEditIsGroup(event.organizerType === "group" || event.isGroup === true);
    setOrgSearchQuery("");
    setExistingAttachments(event.attachments || []);
setEditAttachments([]);
  };
const handleSave = async () => {
  if (!editTitle.trim() || !editDetail.trim() || !editDate || !editLocation.trim() || !editDeadline || !editGenre || !editTargets.length || !editCampus) {
    alert("必須項目が入力・選択されていません。"); return;
  }
  setSaving(true);
  try {
    let finalImageUrl = selectedEvent.imageUrl || null;
    if (editImageFile) {
      const storageRef = ref(storage, `events/${Date.now()}_${editImageFile.name}`);
      await uploadBytes(storageRef, editImageFile);
      finalImageUrl = await getDownloadURL(storageRef);
    }

    // ← ifの外に出す
    const newAttachmentUrls = [];
    for (const file of editAttachments) {
      const storageRef = ref(storage, `attachments/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      newAttachmentUrls.push({ name: file.name, url });
    }

    const updatedFields = {
      title: editTitle.trim(), detail: editDetail.trim(), date: editDate,
      startTime: editStartTime, endTime: editEndTime, location: editLocation.trim(),
      deadline: editDeadline, deadlineTime: editDeadlineTime,
      applyLabel: editApplyLabel, applyLink: editApplyLink, contact: editContact,
      organizerName: editOrganizerName.trim(), imageUrl: finalImageUrl,
      tags: { genre: editGenre, targets: editTargets, campus: editCampus, style: editStyle, organizer: editOrganizerTag, recruit: editRecruitTag },
      targetGakuin: editTargetGakuin, targetGakukei: editTargetGakukei,
      organizerId: editOrganizerId,
      organizerType: editIsGroup ? "group" : "personal",
      createdBy: editOrganizerId, isGroup: editIsGroup,
      organizerAvatar: editIsGroup ? (groups.find(g => g.id === editOrganizerId)?.avatarUrl || "") : (users.find(u => u.id === editOrganizerId)?.avatarUrl || ""),
      attachments: [...existingAttachments, ...newAttachmentUrls],
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
      // newest: createdAt降順
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return tb - ta;
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700 }}>全イベント一覧（{filtered.length}件）</h2>

      {/* フィルター・ソート・検索 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {/* フィルター */}
        <div style={{ display: "flex", gap: 6 }}>
          {[{ id: "all", label: "全て" }, { id: "active", label: "募集中のみ" }].map(f => (
            <button key={f.id} className={`tag-tab-btn ${filterMode === f.id ? "tag-active-tab" : ""}`}
              style={{ padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              onClick={() => setFilterMode(f.id)}>{f.label}</button>
          ))}
        </div>
        {/* ソート */}
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
            {event.imageUrl ? <img src={event.imageUrl} alt="" style={{ width: 60, height: 34, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} /> : <div style={{ width: 60, height: 34, background: "#F4F6F5", borderRadius: 6, flexShrink: 0 }} />}
            <div style={{ flex: 1, cursor: "pointer", minWidth: 0 }} onClick={() => navigate(`/events/${event.id}`)}>
              <div className="hover-title-underline" style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.title}</div>
              <div style={{ fontSize: 11, color: "#5A7370" }}>{event.organizerName} · {event.date}</div>
              {/* 統計バッジ */}
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
          <div style={{ ...s.modalCard, maxWidth: 540 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>イベント編集 (管理者)</h3>
              <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20 }} onClick={() => setSelectedEvent(null)}>✕</button>
            </div>

            <div style={s.fieldRow}>
              <label style={s.formLabel}>カバー画像（任意）</label>
              <div style={s.imageArea} onClick={() => document.getElementById("adminEventFile").click()}>
                {editPreview ? <img src={editPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} /> : <div style={{ textAlign: "center", color: "#BACFCB" }}><ImageIcon size={28} /><div style={{ fontSize: 11, marginTop: 4 }}>タップして変更</div></div>}
              </div>
              <input id="adminEventFile" type="file" accept="image/*,image/heic,image/heif" style={{ display: "none" }} onChange={async e => {
                  let f = e.target.files[0];
                  if (!f) return;
                  if (f.type === "image/heic" || f.type === "image/heif" || f.name.toLowerCase().endsWith(".heic") || f.name.toLowerCase().endsWith(".heif")) {
                    try {
                      const converted = await heic2any({ blob: f, toType: "image/jpeg", quality: 0.85 });
                      f = new File([converted], f.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg"), { type: "image/jpeg" });
                    } catch (err) {
                      alert("画像の変換に失敗しました。別の形式でお試しください。");
                      return;
                    }
                  }
                  setEditImageFile(f);
                  setEditPreview(URL.createObjectURL(f));
                }} />
            </div>

            <div style={s.fieldRow}><label style={s.formLabel}>イベント名 <span style={s.required}>必須</span></label><input style={s.input} value={editTitle} onChange={e => setEditTitle(e.target.value)} /></div>
            <div style={s.fieldRow}><label style={s.formLabel}>詳細 <span style={s.required}>必須</span></label><textarea style={{ ...s.input, height: 80, resize: "vertical" }} value={editDetail} onChange={e => setEditDetail(e.target.value)} /></div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={s.fieldRow}><label style={s.formLabel}>開催日 <span style={s.required}>必須</span></label><input style={s.input} type="date" value={editDate} onChange={e => setEditDate(e.target.value)} onFocus={e => e.target.showPicker()} /></div>
              <div style={s.fieldRow}><label style={s.formLabel}>締切日 <span style={s.required}>必須</span></label><input style={s.input} type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} onFocus={e => e.target.showPicker()} /></div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div style={s.fieldRow}><label style={s.formLabel}>開始</label><input style={s.input} type="time" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} onFocus={e => e.target.showPicker()} /></div>
              <div style={s.fieldRow}><label style={s.formLabel}>終了</label><input style={s.input} type="time" value={editEndTime} onChange={e => setEditEndTime(e.target.value)} onFocus={e => e.target.showPicker()} /></div>
              <div style={s.fieldRow}><label style={s.formLabel}>締切時間</label><input style={s.input} type="time" value={editDeadlineTime} onChange={e => setEditDeadlineTime(e.target.value)} onFocus={e => e.target.showPicker()} /></div>
            </div>

            <div style={s.fieldRow}><label style={s.formLabel}>場所 <span style={s.required}>必須</span></label><input style={s.input} value={editLocation} onChange={e => setEditLocation(e.target.value)} /></div>

            {/* 主催者変更 */}
            <div style={s.fieldRow}>
              <label style={s.formLabel}>主催者の変更</label>
              <input style={{ ...s.input, marginBottom: 8 }} placeholder="名前・メールで検索..." value={orgSearchQuery} onChange={e => setOrgSearchQuery(e.target.value)} />
              <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid #D0DDD9", borderRadius: 8, padding: 8, background: "#FAFDFC" }}>
                <div style={s.cardGrid}>
                  {users.filter(u => { const q = orgSearchQuery.toLowerCase(); return !q || u.displayName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q); }).map(u => (
                    <button key={u.id} className={`organizer-card ${!editIsGroup && editOrganizerId === u.id ? "organizer-selected" : ""}`} style={s.organizerCard} onClick={() => { setEditOrganizerId(u.id); setEditIsGroup(false); setEditOrganizerName(u.displayName || ""); }}>
                      <div style={s.cardAvatarWrap}>{u.avatarUrl ? <img src={u.avatarUrl} style={s.cardAvatar} alt="" /> : <User size={14} color="#9AADA8" />}</div>
                      <div style={s.cardInfo}><div style={s.cardName}>{u.displayName || "名前なし"}</div><div style={{ fontSize: 9, color: "#8A9F9B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div></div>
                    </button>
                  ))}
                  {groups.filter(g => { const q = orgSearchQuery.toLowerCase(); return !q || g.displayName?.toLowerCase().includes(q) || g.email?.toLowerCase().includes(q); }).map(g => (
                    <button key={g.id} className={`organizer-card ${editIsGroup && editOrganizerId === g.id ? "organizer-selected" : ""}`} style={s.organizerCard} onClick={() => { setEditOrganizerId(g.id); setEditIsGroup(true); setEditOrganizerName(g.displayName || ""); }}>
                      <div style={s.cardAvatarWrap}>{g.avatarUrl ? <img src={g.avatarUrl} style={s.cardAvatar} alt="" /> : <Users size={14} color="#9AADA8" />}</div>
                      <div style={s.cardInfo}><div style={s.cardName}>{g.displayName || "名前なし"}</div><div style={{ fontSize: 9, color: "#8A9F9B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.email}</div></div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {[
              { label: "① ジャンル", tags: GENRE_TAGS, value: editGenre, setValue: setEditGenre, multi: false, required: true },
              { label: "② 募集種別", tags: RECRUIT_TAGS, value: editRecruitTag, setValue: setEditRecruitTag, multi: false },
              { label: "③ 対象学年", tags: TARGET_TAGS, value: editTargets, setValue: setEditTargets, multi: true, required: true },
              { label: "④ キャンパス", tags: CAMPUS_TAGS, value: editCampus, setValue: setEditCampus, multi: false, required: true },
              { label: "⑤ 参加スタイル", tags: STYLE_TAGS, value: editStyle, setValue: setEditStyle, multi: false },
              { label: "⑥ 主催者種別", tags: ORGANIZER_TAGS, value: editOrganizerTag, setValue: setEditOrganizerTag, multi: false },
            ].map(({ label, tags, value, setValue, multi, required }) => (
              <div key={label} style={s.fieldRow}>
                <label style={s.formLabel}>{label} {required && <span style={s.required}>必須</span>}</label>
                <div style={s.optionGrid}>
                  {tags.map(t => (
                    <button key={t} type="button"
                      className={`tag-tab-btn ${multi ? (value.includes(t) ? "tag-active-tab" : "") : (value === t ? "tag-active-tab" : "")}`}
                      style={s.tagBtn}
                      onClick={() => multi ? setValue(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]) : setValue(prev => prev === t ? "" : t)}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* 対象学院 */}
            <div style={s.fieldRow}>
              <label style={s.formLabel}>対象学院（任意）</label>
              <div style={s.optionGrid}>
                {Object.keys(GAKUIN).map(g => (
                  <button key={g} type="button" className={`tag-tab-btn ${editTargetGakuin.includes(g) ? "tag-active-tab" : ""}`} style={s.tagBtn}
                    onClick={() => setEditTargetGakuin(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}>{g}</button>
                ))}
              </div>
            </div>
            {/* 添付ファイル */}
            <div style={s.fieldRow}>
              <label style={s.formLabel}>添付画像・資料（任意）</label>
              {existingAttachments.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                  {existingAttachments.map((a, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#5A7370", padding: "6px 10px", background: "#F4F6F5", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>📎 {a.name}</span>
                      <button style={{ background: "none", border: "none", color: "#BACFCB", cursor: "pointer" }}
                        onClick={() => setExistingAttachments(prev => prev.filter((_, j) => j !== i))}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ padding: "10px", borderRadius: 8, border: "2px dashed #D0DDD9", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#FAFDFC" }}
                onClick={() => document.getElementById("adminAttachInput").click()}>
                <span style={{ fontSize: 12, color: "#5A7370", fontWeight: 600 }}>
                  {editAttachments.length > 0 ? `${editAttachments.length}件追加済み` : "📎 ファイルを追加"}
                </span>
                <input id="adminAttachInput" type="file" multiple style={{ display: "none" }}
                  onChange={e => setEditAttachments(prev => [...prev, ...Array.from(e.target.files)])} />
              </div>
              {editAttachments.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                  {editAttachments.map((f, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#5A7370", padding: "6px 10px", background: "#F4F6F5", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span>📎 {f.name}</span>
                      <button style={{ background: "none", border: "none", color: "#BACFCB", cursor: "pointer" }}
                        onClick={() => setEditAttachments(prev => prev.filter((_, j) => j !== i))}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={s.fieldRow}><label style={s.formLabel}>ボタン名</label><input style={s.input} value={editApplyLabel} onChange={e => setEditApplyLabel(e.target.value)} /></div>
              <div style={s.fieldRow}><label style={s.formLabel}>フォームURL</label><input style={s.input} value={editApplyLink} onChange={e => setEditApplyLink(e.target.value)} /></div>
            </div>
            <div style={s.fieldRow}><label style={s.formLabel}>お問い合わせ</label><input style={s.input} value={editContact} onChange={e => setEditContact(e.target.value)} /></div>

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