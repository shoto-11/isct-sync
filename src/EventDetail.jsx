import { THEME, GENRE_STYLES, GENRE_EMOJI, GENRE_TAGS, TARGET_TAGS, CAMPUS_TAGS, STYLE_TAGS, ORGANIZER_TAGS, BG_COLOR, GAKUIN, RECRUIT_TAGS } from "./constants";
import React, { useState, useEffect } from "react";
import { db, storage, auth } from "./firebase";
import { doc, updateDoc, arrayUnion, setDoc, getDoc, collection, getDocs, query, where, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { MapPin, Pencil, Calendar, Clock, Users, ChevronRight, User, Heart, CalendarCheck, Paperclip, Plus, ImageIcon, Trash2, X } from "lucide-react";
import "./animations.css";
import heic2any from "heic2any";
import EventFormFields from "./EventFormFields";

export default function EventDetail({ event: initialEvent, onBack }) {
  const [event, setEvent] = useState(initialEvent);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // 編集用state
  const [editTitle, setEditTitle] = useState(event.title || "");
  const [editDetail, setEditDetail] = useState(event.detail || "");
  const [editLocation, setEditLocation] = useState(event.location || "");
  const [editDeadline, setEditDeadline] = useState(event.deadline || "");
  const [editDeadlineTime, setEditDeadlineTime] = useState(event.deadlineTime || "");
  const [editApplyLabel, setEditApplyLabel] = useState(event.applyLabel || "");
  const [editApplyLink, setEditApplyLink] = useState(event.applyLink || "");
  const [editImage, setEditImage] = useState(null);
  const [editPreview, setEditPreview] = useState(event.imageUrl || null);
  const [editGenre, setEditGenre] = useState(
  Array.isArray(event.tags?.genre) ? event.tags.genre : event.tags?.genre ? [event.tags.genre] : []
);
  const [liked, setLiked] = useState(false);
  const [joining, setJoining] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [joinCount, setJoinCount] = useState(0);

  const [organizer, setOrganizer] = useState(null);
  const [editOrganizerType, setEditOrganizerType] = useState(event.organizerType || "personal");
  const [editOrganizerId, setEditOrganizerId] = useState(event.organizerId || event.createdBy);
  const [userProfile, setUserProfile] = useState(null);
  const [userGroups, setUserGroups] = useState([]);

  const [editTargetGakuin, setEditTargetGakuin] = useState(event.targetGakuin || []);
  const [editTargetGakukei, setEditTargetGakukei] = useState(event.targetGakukei || []);
  const [editContact, setEditContact] = useState(event.contact || "");
  const [editAttachments, setEditAttachments] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState(event.attachments || []);

  const [editCampus, setEditCampus] = useState(
    Array.isArray(event.tags?.campus) ? event.tags.campus : event.tags?.campus ? [event.tags.campus] : []
  );
  const [editStyle, setEditStyle] = useState(
    Array.isArray(event.tags?.style) ? event.tags.style : event.tags?.style ? [event.tags.style] : []
  );
  const [editRecruit, setEditRecruit] = useState(
    Array.isArray(event.tags?.recruit) ? event.tags.recruit : event.tags?.recruit ? [event.tags.recruit] : []
  );
  const [editOrganizer, setEditOrganizer] = useState(
    Array.isArray(event.tags?.organizer) ? event.tags.organizer : event.tags?.organizer ? [event.tags.organizer] : []
  );
  const [editTargets, setEditTargets] = useState(event.tags?.targets || []);
  const [editHasDeadline, setEditHasDeadline] = useState(!!event.deadline);
  const [editHasDate, setEditHasDate] = useState(!!event.date);
  const [editDates, setEditDates] = useState(
    event.dates?.length > 0
      ? event.dates
      : [{ date: event.date || "", startTime: event.startTime || "", endTime: event.endTime || "" }]
  );

  // テンプレートモーダル
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateEvents, setTemplateEvents] = useState([]);
  const [templateSearch, setTemplateSearch] = useState("");
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const isOwner =
    auth.currentUser?.uid === event.createdByPersonal ||
    auth.currentUser?.uid === event.createdBy ||
    (event.organizerType === "group" && organizer?.members?.includes(auth.currentUser?.uid));
  const cs = GENRE_STYLES[event.tags?.genre] || { bg: "#F5F5F5" };

  useEffect(() => {
    window.scrollTo(0, 0);
    const fab = document.querySelector('[data-fab]');
    if (fab) fab.style.display = 'none';
    return () => { if (fab) fab.style.display = 'flex'; };
  }, []);

  useEffect(() => {
    const recordView = async () => {
      if (!auth.currentUser || !event.id) return;
      const uid = auth.currentUser.uid;
      try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const currentHistory = userSnap.data().viewHistory || [];
          
          // 💡 1. 外部関数(arrayRemoveなど)に頼らず、JS標準のfilterで同じイベントIDを完全に除去
          const filteredHistory = currentHistory.filter(id => id !== event.id);
          
          // 💡 2. 配列の「一番最後（＝一番最新）」に今回のイベントIDをカチッと結合
          const updatedHistory = [...filteredHistory, event.id];
          
          // 💡 3. 完成した完璧な順序の配列でFirestoreを丸ごと更新（これで1秒の遅れもなく確定します）
          await updateDoc(userRef, {
            viewHistory: updatedHistory
          });
        }
      } catch (err) {
        console.error("履歴の順序更新に失敗しました:", err);
      }
      const now = new Date();
      const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const viewRef = doc(db, "eventStats", event.id);
      const snap = await getDoc(viewRef);
      if (snap.exists()) {
        const data = snap.data();
        setLikeCount((data.likes || []).length);
        setJoinCount((data.joins || []).length);
        setLiked((data.likes || []).some(l => l.uid === uid));
        setJoining((data.joins || []).some(j => j.uid === uid));
        const views = (data.views || []).filter(v => new Date(v.date) > weekAgo);
        if (!views.some(v => v.uid === uid)) {
          await updateDoc(viewRef, { views: arrayUnion({ uid, date: now.toISOString() }) });
        }
      } else {
        await setDoc(viewRef, { eventId: event.id, deadline: event.deadline || null, views: [{ uid, date: now.toISOString() }], likes: [], joins: [] });
      }
    };
    recordView();
  }, [event.id]);

  useEffect(() => {
    const fetchOrganizer = async () => {
      const type = event.organizerType || "personal";
      const id = event.organizerId || event.createdBy;
      if (!id) return;
      try {
        if (type === "group") {
          const snap = await getDoc(doc(db, "groups", id));
          if (snap.exists()) setOrganizer({ type: "group", ...snap.data() });
        } else {
          const snap = await getDoc(doc(db, "users", id));
          if (snap.exists()) setOrganizer({ type: "personal", ...snap.data() });
        }
      } catch (err) { console.error("主催者の取得に失敗しました:", err); }
    };
    fetchOrganizer();
  }, [event.organizerType, event.organizerId, event.createdBy]);

  useEffect(() => {
    if (!editMode || !auth.currentUser) return;
    const fetchEditContextData = async () => {
      const uid = auth.currentUser.uid;
      try {
        const userSnap = await getDoc(doc(db, "users", uid));
        if (userSnap.exists()) setUserProfile({ id: userSnap.id, ...userSnap.data() });
        const q = query(collection(db, "groups"), where("members", "array-contains", uid));
        const qs = await getDocs(q);
        setUserGroups(qs.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) { console.error("編集用コンテキストの取得に失敗しました:", err); }
    };
    fetchEditContextData();
  }, [editMode]);

  useEffect(() => {
    if (!showTemplateModal || !auth.currentUser) return;
    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const uid = auth.currentUser.uid;
        const personalSnap = await getDocs(query(collection(db, "events"), where("createdByPersonal", "==", uid)));
        const groupSnaps = await Promise.all(
          userGroups.map(g => getDocs(query(collection(db, "events"), where("organizerId", "==", g.id))))
        );
        const allEvents = [
          ...personalSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          ...groupSnaps.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() })))
        ];
        const unique = Array.from(new Map(allEvents.map(e => [e.id, e])).values());
        unique.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setTemplateEvents(unique);
      } catch (err) { console.error(err); }
      setLoadingTemplates(false);
    };
    fetchTemplates();
  }, [showTemplateModal]);

  const applyTemplate = (tmpl) => {
    setEditTitle(tmpl.title || "");
    setEditDetail(tmpl.detail || "");
    setEditLocation(tmpl.location || "");
    setEditApplyLabel(tmpl.applyLabel || "");
    setEditApplyLink(tmpl.applyLink || "");
    setEditContact(tmpl.contact || "");
    setEditGenre(tmpl.tags?.genre || "");
    setEditTargets(tmpl.tags?.targets || []);
    setEditCampus(Array.isArray(tmpl.tags?.campus) ? tmpl.tags.campus : tmpl.tags?.campus ? [tmpl.tags.campus] : []);
    setEditStyle(Array.isArray(tmpl.tags?.style) ? tmpl.tags.style : tmpl.tags?.style ? [tmpl.tags.style] : []);
    setEditOrganizer(Array.isArray(tmpl.tags?.organizer) ? tmpl.tags.organizer : tmpl.tags?.organizer ? [tmpl.tags.organizer] : []);
    setEditRecruit(Array.isArray(tmpl.tags?.recruit) ? tmpl.tags.recruit : tmpl.tags?.recruit ? [tmpl.tags.recruit] : []);
    setEditTargetGakuin(tmpl.targetGakuin || []);
    setEditTargetGakukei(tmpl.targetGakukei || []);
    setEditPreview(tmpl.imageUrl || null);
    setEditImage(null);
    setExistingAttachments(tmpl.attachments || []);
    setEditAttachments([]);
    if (tmpl.dates?.length > 0) {
      setEditHasDate(true); setEditDates(tmpl.dates);
    } else if (tmpl.date) {
      setEditHasDate(true); setEditDates([{ date: tmpl.date, startTime: tmpl.startTime || "", endTime: tmpl.endTime || "" }]);
    } else {
      setEditHasDate(false); setEditDates([{ date: "", startTime: "", endTime: "" }]);
    }
    if (tmpl.deadline) {
      setEditHasDeadline(true); setEditDeadline(tmpl.deadline); setEditDeadlineTime(tmpl.deadlineTime || "");
    } else {
      setEditHasDeadline(false); setEditDeadline(""); setEditDeadlineTime("");
    }
    if (tmpl.organizerType === "group" && tmpl.organizerId) {
      const matched = userGroups.find(g => g.id === tmpl.organizerId);
      if (matched) { setEditOrganizerType("group"); setEditOrganizerId(tmpl.organizerId); }
      else { setEditOrganizerType("personal"); setEditOrganizerId(auth.currentUser?.uid || ""); }
    } else {
      setEditOrganizerType("personal"); setEditOrganizerId(auth.currentUser?.uid || "");
    }
    setShowTemplateModal(false);
    setTemplateSearch("");
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    let finalFile = file;
    if (file.type === "image/heic" || file.type === "image/heif" || file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif")) {
      try {
        const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
        finalFile = new File([converted], file.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg"), { type: "image/jpeg" });
      } catch { alert("画像の変換に失敗しました。別の形式でお試しください。"); return; }
    }
    setEditImage(finalFile);
    setEditPreview(URL.createObjectURL(finalFile));
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
      let imageUrl = event.imageUrl;
      if (editImage) {
        const storageRef = ref(storage, `events/${Date.now()}_${editImage.name}`);
        await uploadBytes(storageRef, editImage);
        imageUrl = await getDownloadURL(storageRef);
      }
      const newAttachmentUrls = [];
      for (const file of editAttachments) {
        const storageRef = ref(storage, `attachments/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        newAttachmentUrls.push({ name: file.name, url });
      }
      const currentUid = auth.currentUser.uid;
      const selectedGroup = userGroups.find(g => g.id === editOrganizerId);
      const finalOrganizerType = editOrganizerType === "group" ? "group" : "personal";
      const finalOrganizerId = editOrganizerType === "group" && selectedGroup ? selectedGroup.id : currentUid;
      const organizerName = editOrganizerType === "group" && selectedGroup ? selectedGroup.displayName : (userProfile?.displayName || auth.currentUser.email);
      const organizerAvatar = editOrganizerType === "group" && selectedGroup ? (selectedGroup.avatarUrl || "") : (userProfile?.avatarUrl || "");

      const updated = {
        title: editTitle.trim(),
        detail: editDetail.trim(),
        location: editLocation.trim(),
        deadline: editHasDeadline ? editDeadline : "",
        deadlineTime: editHasDeadline ? editDeadlineTime : "",
        applyLabel: editApplyLabel || "参加を申し込む",
        applyLink: editApplyLink,
        imageUrl,
        tags: {
          genre: editGenre,
          targets: editTargets,
          campus: editCampus,
          style: editStyle,
          organizer: editOrganizer,
          recruit: editRecruit,
        },
        targetGakuin: editTargetGakuin,
        targetGakukei: editTargetGakukei,
        contact: editContact,
        organizerType: finalOrganizerType,
        organizerId: finalOrganizerId,
        createdBy: finalOrganizerId,
        organizerName,
        organizerAvatar,
        attachments: [...existingAttachments, ...newAttachmentUrls],
        dates: editHasDate ? editDates : [],
        date: editHasDate ? (editDates[0]?.date || "") : "",
        startTime: editHasDate ? (editDates[0]?.startTime || "") : "",
        endTime: editHasDate ? (editDates[0]?.endTime || "") : "",
      };

      await updateDoc(doc(db, "events", event.id), updated);
      setEvent(prev => ({ ...prev, ...updated }));
      setExistingAttachments([...existingAttachments, ...newAttachmentUrls]);
      setEditAttachments([]);
      setEditMode(false);
      alert("イベント情報を更新しました！");
    } catch (err) {
      alert("保存に失敗しました: " + err.message);
    }
    setSaving(false);
  };

  const handleLike = async () => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const viewRef = doc(db, "eventStats", event.id);
    const snap = await getDoc(viewRef);
    if (!snap.exists()) return;
    const likes = snap.data().likes || [];
    if (liked) {
      await updateDoc(viewRef, { likes: likes.filter(l => l.uid !== uid) });
      setLiked(false); setLikeCount(c => c - 1);
    } else {
      await updateDoc(viewRef, { likes: [...likes, { uid, date: new Date().toISOString() }] });
      setLiked(true); setLikeCount(c => c + 1);
    }
  };

  const handleJoin = async () => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const viewRef = doc(db, "eventStats", event.id);
    const snap = await getDoc(viewRef);
    if (!snap.exists()) return;
    const joins = snap.data().joins || [];
    if (joining) {
      await updateDoc(viewRef, { joins: joins.filter(j => j.uid !== uid) });
      setJoining(false); setJoinCount(c => c - 1);
    } else {
      await updateDoc(viewRef, { joins: [...joins, { uid, date: new Date().toISOString() }] });
      setJoining(true); setJoinCount(c => c + 1);
    }
  };

  const handleNavigateToGroupCreation = () => {
    if (window.confirm("グループの新規作成・参加はマイページの「グループ管理」から行えます。一度編集をキャンセルしてマイページへ移動しますか？")) {
      window.location.href = "/mypage";
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("このイベントを削除しますか？この操作は取り消せません。")) return;
    try {
      await deleteDoc(doc(db, "events", event.id));
      window.location.href = "/";
    } catch (err) { alert("削除に失敗しました: " + err.message); }
  };

  // ─── 編集モード ───
  if (editMode) return (
    <div style={s.container}>

      {/* テンプレートモーダル */}
      {showTemplateModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "white", borderRadius: 16, padding: 20, width: "100%", maxWidth: 560, maxHeight: "80vh", display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>過去のイベントから呼び出す</h3>
              <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20 }}
                onClick={() => { setShowTemplateModal(false); setTemplateSearch(""); }}>✕</button>
            </div>
            <input
              style={{ ...s.input, marginBottom: 4 }}
              placeholder="イベント名・主催者名で検索..."
              value={templateSearch}
              onChange={e => setTemplateSearch(e.target.value)}
              autoFocus
            />
            <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {loadingTemplates ? (
                <p style={{ color: "#5A7370", textAlign: "center", padding: 24 }}>読み込み中...</p>
              ) : templateEvents.filter(e =>
                  !templateSearch ||
                  e.title?.toLowerCase().includes(templateSearch.toLowerCase()) ||
                  e.organizerName?.toLowerCase().includes(templateSearch.toLowerCase())
                ).length === 0 ? (
                <p style={{ color: "#5A7370", textAlign: "center", padding: 24 }}>イベントが見つかりません</p>
              ) : templateEvents
                  .filter(e => !templateSearch ||
                    e.title?.toLowerCase().includes(templateSearch.toLowerCase()) ||
                    e.organizerName?.toLowerCase().includes(templateSearch.toLowerCase())
                  )
                  .map(tmpl => (
                    <div key={tmpl.id} className="event-hover-card"
                      style={{ borderRadius: 10, border: "1px solid #E0E8E7", cursor: "pointer", background: "#FAFDFC", display: "flex", gap: 12, padding: "12px", alignItems: "center" }}
                      onClick={() => applyTemplate(tmpl)}
                    >
                      {tmpl.imageUrl
                        ? <img src={tmpl.imageUrl} alt={tmpl.title} style={{ width: 72, height: 72, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                        : <div style={{ width: 72, height: 72, borderRadius: 8, background: GENRE_STYLES[tmpl.tags?.genre]?.bg || "#F5F5F5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 28 }}>
                            {GENRE_EMOJI[tmpl.tags?.genre] || "📌"}
                          </div>
                      }
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tmpl.title}</div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          {(tmpl.dates?.[0]?.date || tmpl.date) && (
                            <span style={{ fontSize: 11, color: "#5A7370", display: "flex", alignItems: "center", gap: 3 }}>
                              <Calendar size={11} /> {tmpl.dates?.[0]?.date || tmpl.date}
                            </span>
                          )}
                          {tmpl.location && (
                            <span style={{ fontSize: 11, color: "#5A7370", display: "flex", alignItems: "center", gap: 3 }}>
                              <MapPin size={11} /> {tmpl.location}
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          {tmpl.tags?.genre && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: GENRE_STYLES[tmpl.tags.genre]?.bg || "#F9EAED", color: GENRE_STYLES[tmpl.tags.genre]?.color || THEME }}>
                              {tmpl.tags.genre}
                            </span>
                          )}
                          {tmpl.organizerName && (
                            <span style={{ fontSize: 11, color: "#5A7370", display: "flex", alignItems: "center", gap: 3 }}>
                              <User size={11} /> {tmpl.organizerName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
              }
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 720, margin: "0 auto", width: "100%", padding: "8px 16px" }}>
        <button style={s.backBtn} onClick={() => setEditMode(false)}>← 編集をキャンセル</button>
      </div>

      <div style={s.editBox}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={s.editTitle}>イベントを編集</h2>
          <button
            type="button"
            className="tag-tab-btn"
            style={{ fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            onClick={() => setShowTemplateModal(true)}
          >
            <Clock size={14} /> 過去のイベントから呼び出す
          </button>
        </div>

        {/* 共通フォーム */}
        <EventFormFields
          organizerType={editOrganizerType} setOrganizerType={setEditOrganizerType}
          selectedGroupId={editOrganizerId} setSelectedGroupId={setEditOrganizerId}
          userProfile={userProfile} userGroups={userGroups}
          onNavigateToGroupCreation={handleNavigateToGroupCreation}
          preview={editPreview} onImageChange={handleImageChange} imageInputId="editImgInput"
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
          recruitTags={editRecruit} setRecruitTags={setEditRecruit}
          targetTags={editTargets} setTargetTags={setEditTargets}
          targetGakuin={editTargetGakuin} setTargetGakuin={setEditTargetGakuin}
          targetGakukei={editTargetGakukei} setTargetGakukei={setEditTargetGakukei}
          campusTags={editCampus} setCampusTags={setEditCampus}
          styleTags={editStyle} setStyleTags={setEditStyle}
          organizerTags={editOrganizer} setOrganizerTags={setEditOrganizer}
          existingAttachments={existingAttachments} setExistingAttachments={setExistingAttachments}
          attachments={editAttachments} setAttachments={setEditAttachments}
          attachInputId="editAttachInput"
          isEditMode={true}
        />

        <button className="submit-btn" style={s.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? "保存中..." : "保存する"}
        </button>
      </div>
    </div>
  );

  // ─── 通常詳細表示モード ───
  const remaining = event.capacity - (event.participants?.length ?? 0);

  return (
    <div style={s.container}>
      <div style={s.topBar}>
        {isOwner && (
          <button className="imp-tab-btn" style={s.editEventBtn} onClick={() => setEditMode(true)}>
            <Pencil size={14} /> 編集
          </button>
        )}
        {isOwner && (
          <button className="imp-tab-btn"
            style={{ background: THEME, borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
            onClick={handleDelete}
          >
            <Trash2 size={14} />削除
          </button>
        )}
      </div>

      {event.imageUrl
        ? <img src={event.imageUrl} alt={event.title} style={s.heroImg} />
        : <div style={{ ...s.heroPlaceholder, background: cs.bg }}>
            <span style={{ fontSize: 64 }}>{GENRE_EMOJI[event.tags?.genre] || "📌"}</span>
          </div>
      }

      <div style={s.body}>
        <h1 style={s.title}>{event.title}</h1>

        <div style={s.infoBox}>
          {/* 開催日時 */}
          {(() => {
            const ds = (event.dates?.length > 0
              ? event.dates
              : event.date
                ? [{ date: event.date, startTime: event.startTime, endTime: event.endTime }]
                : []
            ).filter(d => d.date);

            const formatDate = (dateStr) => {
              const [, m, d] = dateStr.split("-");
              const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
              const w = weekdays[new Date(dateStr).getDay()];
              return `${m}-${d}（${w}）`;
            };

            return (
              <>
                <div style={s.infoRow}>
                  <span style={s.infoIcon}><Calendar size={20} color="#88203a" /></span>
                  <div style={{ flex: 1 }}>
                    <div style={s.infoLabel}>開催日時</div>
                    {ds.length > 0 ? (
                      <div style={{ borderLeft: "2px solid #88203a", paddingLeft: 10, marginTop: 4, display: "flex", flexDirection: "column", gap: 6 }}>
                        {ds.map((d, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                            <div style={{ ...s.infoValue, flexShrink: 0 }}>{formatDate(d.date)}</div>
                            {(d.startTime || d.endTime) && (
                              <div style={{ fontSize: 14, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                                {d.startTime || ""} 〜 {d.endTime || ""}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={s.infoValue}>通年募集</div>
                    )}
                  </div>
                </div>
                <div style={s.infoDivider} />
              </>
            );
          })()}

          {/* 締切 */}
          {(() => {
            const formatDeadline = (dateStr) => {
              if (!dateStr) return null;
              const [, m, d] = dateStr.split("-");
              const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
              const w = weekdays[new Date(dateStr).getDay()];
              return `${m}-${d}（${w}）`;
            };

            return (
              <>
                <div style={s.infoRow}>
                  <span style={s.infoIcon}><Clock size={20} color="#88203a" /></span>
                  <div style={{ flex: 1 }}>
                    <div style={s.infoLabel}>申し込み締切</div>
                    {event.deadline ? (
                      <div style={{ borderLeft: "2px solid #88203a", paddingLeft: 10, marginTop: 4 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                          <div style={{ ...s.infoValue, flexShrink: 0 }}>{formatDeadline(event.deadline)}</div>
                          {event.deadlineTime && (
                            <div style={{ fontSize: 14, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                              {event.deadlineTime}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={s.infoValue}>期限なし</div>
                    )}
                  </div>
                </div>
                <div style={s.infoDivider} />
              </>
            );
          })()}

          {/* 場所 */}
          {event.location && (
            <>
              <div style={s.infoRow}>
                <span style={s.infoIcon}><MapPin size={20} color="#88203a" /></span>
                <div>
                  <div style={s.infoLabel}>実施場所・集合場所</div>
                  <div style={s.infoValue}>{event.location}</div>
                </div>
              </div>
               <div style={s.infoDivider} />
            </>
          )}

          {/* 定員 */}
          {event.capacity && (
            <>
              <div style={s.infoDivider} />
              <div style={s.infoRow}>
                <span style={s.infoIcon}><Users size={20} color="#88203a" /></span>
                <div>
                  <div style={s.infoLabel}>残り枠</div>
                  <div style={s.infoValue}>{remaining} / {event.capacity} 人</div>
                </div>
              </div>
            </>
          )}
        </div>

        {event.detail && (
          <div style={s.section}>
            <h2 style={s.sectionTitle}>イベント詳細</h2>
            <div dangerouslySetInnerHTML={{ __html: event.detail }} className="tiptap-view" />
          </div>
        )}

        {event.tags && (
          <div style={s.tagsBox}>
            {(Array.isArray(event.tags.genre) ? event.tags.genre : event.tags.genre ? [event.tags.genre] : []).map(t => <span key={t} style={s.tagChip}>{t}</span>)}
            {event.tags.targets?.map(t => <span key={t} style={s.tagChip}>{t}</span>)}
            {(Array.isArray(event.tags.campus) ? event.tags.campus : event.tags.campus ? [event.tags.campus] : []).map(t => <span key={t} style={s.tagChip}>{t}</span>)}
            {(Array.isArray(event.tags.style) ? event.tags.style : event.tags.style ? [event.tags.style] : []).map(t => <span key={t} style={s.tagChip}>{t}</span>)}
            {(Array.isArray(event.tags.organizer) ? event.tags.organizer : event.tags.organizer ? [event.tags.organizer] : []).map(t => <span key={t} style={s.tagChip}>{t}</span>)}
            {(Array.isArray(event.tags.recruit) ? event.tags.recruit : event.tags.recruit ? [event.tags.recruit] : []).map(t => <span key={t} style={s.tagChip}>{t}</span>)}
          </div>
        )}

        {event.attachments?.length > 0 && (
          <div style={s.section}>
            <h2 style={s.sectionTitle}>添付資料</h2>
            <div style={s.attachList}>
              {event.attachments.map((a, i) => {
                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(a.name) || a.type?.startsWith("image/");
                const isPdf = /\.pdf$/i.test(a.name) || a.type === "application/pdf";
                return (
                  <a key={i} href={a.url} target="_blank" rel="noreferrer"
                    style={{ ...s.attachItem, display: "flex", flexDirection: "column", gap: 8, padding: 0, overflow: "hidden" }}>
                    {isImage && <img src={a.url} alt={a.name} style={{ width: "100%", maxHeight: 240, objectFit: "cover", borderRadius: "8px 8px 0 0" }} />}
                    {isPdf && <iframe src={`${a.url}#page=1&toolbar=0&navpanes=0`} style={{ width: "100%", height: 200, border: "none", borderRadius: "8px 8px 0 0", pointerEvents: "none" }} title={a.name} />}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 12px" }}>
                      <Paperclip size={14} /> {a.name}
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {event.applyLink && (
          <a href={event.applyLink} target="_blank" rel="noreferrer" className="submit-btn" style={s.applyBtn}
            onClick={async () => {
              if (!event.id) return;
              try {
                const viewRef = doc(db, "eventStats", event.id);
                const snap = await getDoc(viewRef);
                if (snap.exists()) {
                  await updateDoc(viewRef, { applyCount: (snap.data().applyCount || 0) + 1 });
                } else {
                  await setDoc(viewRef, { eventId: event.id, deadline: event.deadline || null, views: [], likes: [], joins: [], applyCount: 1 });
                }
              } catch (err) { console.error("申し込みカウントの記録に失敗:", err); }
            }}
          >
            {event.applyLabel || "参加を申し込む"} →
          </a>
        )}

        {organizer && (
          <div style={s.section}>
            <h2 style={s.sectionTitle}>主催者</h2>
            <div className="event-hover-card"
              style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", padding: "10px 12px", borderRadius: 10, background: "#FAFAFA", border: "1px solid #F0F0F0" }}
              onClick={() => {
                const type = event.organizerType || organizer?.type || "personal";
                if (type === "group") {
                  window.location.href = `/groups/${event.organizerId || event.createdBy}`;
                } else {
                  window.location.href = `/users/${event.createdByPersonal || event.createdBy}`;
                }
              }}
            >
              {organizer.avatarUrl
                ? <img src={organizer.avatarUrl} alt="avatar" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                : <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#F4F6F5", border: "1px solid #E0E8E7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {organizer.type === "group" ? <Users size={20} color="#9AADA8" /> : <User size={18} color={THEME} />}
                  </div>
              }
              <div style={{ flex: 1 }}>
                <div className="hover-title-underline" style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>
                  {organizer.displayName}
                </div>
                <div style={{ fontSize: 12, color: "#5A7370", marginTop: 3 }}>
                  {organizer.type === "group"
                    ? <span style={s.organizerBadge}>{organizer.groupType || "サークル"}</span>
                    : <span>{organizer.gakuin} {organizer.gakukei}</span>}
                </div>
              </div>
              <ChevronRight size={18} color="#B0BEC5" />
            </div>
          </div>
        )}

        {event.contact && (
          <div style={s.section}>
            <h2 style={s.sectionTitle}>お問い合わせ先</h2>
            {event.contact.trim().startsWith("http")
              ? <a href={event.contact.trim()} target="_blank" rel="noreferrer" style={s.contactLink}
                  onMouseEnter={e => { e.currentTarget.style.textDecoration = "underline"; e.currentTarget.style.opacity = "0.8"; }}
                  onMouseLeave={e => { e.currentTarget.style.textDecoration = "none"; e.currentTarget.style.opacity = "1"; }}
                >{event.contact}</a>
              : <p style={s.detailText}>{event.contact}</p>
            }
          </div>
        )}

        {auth.currentUser && (
          <div style={s.actionRow}>
            <button className={`reaction-btn ${liked ? "like-active" : ""}`}
              style={{ ...s.actionBtn, ...(liked ? s.actionBtnActive : {}) }}
              onClick={handleLike}
            >
              {liked ? <Heart size={16} fill="#E53935" color="#E53935" /> : <Heart size={16} />} いいね {likeCount > 0 && likeCount}
            </button>
            <button className={`reaction-btn ${joining ? "join-active" : ""}`}
              style={{ ...s.actionBtn, ...(joining ? s.actionBtnJoinActive : {}) }}
              onClick={handleJoin}
            >
              {joining ? <CalendarCheck size={16} color="#2E7D32" /> : <CalendarCheck size={16} />} マイリスト {joinCount > 0 && joinCount}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  container: { background: BG_COLOR, minHeight: "100vh" },
  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", maxWidth: 720, margin: "0 auto", width: "100%" },
  backBtn: { display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: THEME, fontSize: 14, fontWeight: 700, cursor: "pointer", padding: "8px 0" },
  editEventBtn: { background: THEME, borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  heroImg: { height: window.innerWidth > 768 ? 400 : "auto", width: window.innerWidth > 768 ? "auto" : "calc(100% - 28px)", objectFit: "cover", display: "block", margin: window.innerWidth > 768 ? "0 auto" : "0 14px", maxWidth: "100%", borderRadius: 12 },
  heroPlaceholder: { height: window.innerWidth > 768 ? 400 : "auto", width: window.innerWidth > 768 ? "auto" : "calc(100% - 28px)", aspectRatio: "16/9", margin: window.innerWidth > 768 ? "0 auto" : "0 14px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12 },
  body: { padding: "20px 16px", maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 },
  title: { fontSize: 24, fontWeight: 700, color: "#111", lineHeight: 1.3, margin: 0 },
  infoBox: { background: "white", borderRadius: 12, padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", display: "flex", flexDirection: "column", gap: 12 },
  infoRow: { display: "flex", alignItems: "flex-start", gap: 12 },
  infoIcon: { fontSize: 20, flexShrink: 0 },
  infoLabel: { fontSize: 11, color: "#5A7370", fontWeight: 700, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: 700, color: "#111" },
  infoDivider: { height: 1, background: "#F0F0F0" },
  tagsBox: { display: "flex", flexWrap: "wrap", gap: 6 },
  tagChip: { background: "#F9EAED", color: THEME, fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999 },
  section: { background: "white", borderRadius: 12, padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: "#5A7370", margin: "0 0 10px" },
  detailText: { fontSize: 14, color: "#1A2E2B", lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0 },
  attachList: { display: "flex", flexDirection: "column", gap: 8 },
  attachItem: { fontSize: 13, color: THEME, padding: "8px 12px", background: "#F9EAED", borderRadius: 8, textDecoration: "none", fontWeight: 600 },
  applyBtn: { display: "block", textAlign: "center", padding: "16px", background: THEME, color: "white", borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: "none", boxShadow: `0 4px 16px rgba(136,32,58,0.4)` },
  editBox: { background: "white", borderRadius: 16, padding: "24px 20px", margin: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", gap: 16, maxWidth: 720, marginLeft: "auto", marginRight: "auto" },
  editTitle: { fontSize: 18, fontWeight: 700, color: "#111", margin: 0 },
  input: { width: "100%", padding: "11px 13px", border: "1.5px solid #D0DDD9", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" },
  saveBtn: { padding: 14, background: THEME, color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%" },
  actionRow: { display: "flex", gap: 12 },
  actionBtn: { flex: 1, padding: "12px", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 },
  actionBtnJoinActive: {},
  organizerBadge: { background: "#F4F6F5", color: "#5A7370", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4 },
  contactLink: { fontSize: 14, color: "#88203a", lineHeight: 1.8, wordBreak: "break-all", textDecoration: "none", fontWeight: 600, cursor: "pointer", transition: "opacity 0.15s" },
};