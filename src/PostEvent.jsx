import { useState, useEffect } from "react";
import { db, storage, auth } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp, getDoc, doc, getDocs, query, where } from "firebase/firestore";
import {
  THEME, GENRE_TAGS, BG_COLOR, GENRE_STYLES, GENRE_EMOJI
} from "./constants";
import { Calendar, Clock, User, Plus } from "lucide-react";
import heic2any from "heic2any";
import EventFormFields from "./EventFormFields";

export default function PostEvent({ onPosted, userGroups = [] }) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [location, setLocation] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [applyLabel, setApplyLabel] = useState("");
  const [applyLink, setApplyLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");
  const [genreTag, setGenreTag] = useState("");
  const [contact, setContact] = useState("");
  const [targetGakuin, setTargetGakuin] = useState([]);
  const [targetGakukei, setTargetGakukei] = useState([]);
  const [organizerType, setOrganizerType] = useState(userGroups.length > 0 ? "group" : "personal");
  const [selectedGroupId, setSelectedGroupId] = useState(userGroups.length > 0 ? userGroups[0].id : null);
  const [userProfile, setUserProfile] = useState(null);
  const [recruitTags, setRecruitTags] = useState([]);
  const [targetTags, setTargetTags] = useState([]);
  const [campusTags, setCampusTags] = useState([]);
  const [styleTags, setStyleTags] = useState([]);
  const [organizerTags, setOrganizerTags] = useState([]);
  const [hasDeadline, setHasDeadline] = useState(true);
  const [hasDate, setHasDate] = useState(true);
  const [dates, setDates] = useState([{ date: "", startTime: "", endTime: "" }]);

  // テンプレートモーダル
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateEvents, setTemplateEvents] = useState([]);
  const [templateSearch, setTemplateSearch] = useState("");
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!auth.currentUser) return;
      try {
        const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (snap.exists()) setUserProfile(snap.data());
      } catch (err) {
        console.error("ユーザー情報の取得に失敗しました:", err);
      }
    };
    fetchUserProfile();
  }, []);

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
      } catch (err) {
        console.error(err);
      }
      setLoadingTemplates(false);
    };
    fetchTemplates();
  }, [showTemplateModal]);

  const applyTemplate = (tmpl) => {
    setTitle(tmpl.title || "");
    setDetail(tmpl.detail || "");
    setLocation(tmpl.location || "");
    setApplyLabel(tmpl.applyLabel || "");
    setApplyLink(tmpl.applyLink || "");
    setContact(tmpl.contact || "");
    setGenreTag(tmpl.tags?.genre || "");
    setTargetTags(tmpl.tags?.targets || []);
    setCampusTags(Array.isArray(tmpl.tags?.campus) ? tmpl.tags.campus : tmpl.tags?.campus ? [tmpl.tags.campus] : []);
    setStyleTags(Array.isArray(tmpl.tags?.style) ? tmpl.tags.style : tmpl.tags?.style ? [tmpl.tags.style] : []);
    setOrganizerTags(Array.isArray(tmpl.tags?.organizer) ? tmpl.tags.organizer : tmpl.tags?.organizer ? [tmpl.tags.organizer] : []);
    setRecruitTags(Array.isArray(tmpl.tags?.recruit) ? tmpl.tags.recruit : tmpl.tags?.recruit ? [tmpl.tags.recruit] : []);
    setTargetGakuin(tmpl.targetGakuin || []);
    setTargetGakukei(tmpl.targetGakukei || []);
    setPreview(tmpl.imageUrl || null);
    setImage(null);
    setExistingAttachments(tmpl.attachments || []);
    setAttachments([]);
    if (tmpl.dates?.length > 0) {
      setHasDate(true); setDates(tmpl.dates);
    } else if (tmpl.date) {
      setHasDate(true); setDates([{ date: tmpl.date, startTime: tmpl.startTime || "", endTime: tmpl.endTime || "" }]);
    } else {
      setHasDate(false); setDates([{ date: "", startTime: "", endTime: "" }]);
    }
    if (tmpl.deadline) {
      setHasDeadline(true); setDeadline(tmpl.deadline); setDeadlineTime(tmpl.deadlineTime || "");
    } else {
      setHasDeadline(false); setDeadline(""); setDeadlineTime("");
    }
    if (tmpl.organizerType === "group" && tmpl.organizerId) {
      const matched = userGroups.find(g => g.id === tmpl.organizerId);
      if (matched) { setOrganizerType("group"); setSelectedGroupId(tmpl.organizerId); }
      else { setOrganizerType("personal"); setSelectedGroupId(null); }
    } else {
      setOrganizerType("personal"); setSelectedGroupId(null);
    }
    setShowTemplateModal(false);
    setTemplateSearch("");
  };

  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    let finalFile = file;
    if (file.type === "image/heic" || file.type === "image/heif" || file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif")) {
      try {
        const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
        finalFile = new File([converted], file.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg"), { type: "image/jpeg" });
      } catch { alert("画像の変換に失敗しました。別の形式でお試しください。"); return; }
    }
    setImage(finalFile);
    setPreview(URL.createObjectURL(finalFile));
  };

  const handleNavigateToGroupCreation = () => {
    if (window.confirm("グループの新規作成・参加は、マイページの「グループ管理」画面から行えます。一度この作成画面を閉じてマイページへ移動しますか？\n（入力中の内容は破棄されます）")) {
      window.location.href = "/mypage";
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !detail.trim() || !genreTag) {
      alert("イベント名・詳細・ジャンルは必須です。"); return;
    }
    if (hasDate && dates.some(d => !d.date)) {
      alert("開催日を入力してください。"); return;
    }
    if (hasDeadline && !deadline) {
      alert("締切日を入力してください。"); return;
    }
    setLoading(true);
    try {
      const currentUid = auth.currentUser.uid;
      const selectedGroup = userGroups.find(g => g.id === selectedGroupId);
      const finalOrganizerType = organizerType === "group" ? "group" : "user";
      const finalOrganizerId = organizerType === "group" && selectedGroup ? selectedGroup.id : currentUid;
      const organizerName = organizerType === "group" && selectedGroup ? selectedGroup.displayName : (userProfile?.displayName || auth.currentUser.email);
      const organizerAvatar = organizerType === "group" && selectedGroup ? (selectedGroup.avatarUrl || "") : (userProfile?.avatarUrl || "");

      let imageUrl = null;
      if (image) {
        const storageRef = ref(storage, `events/${Date.now()}_${image.name}`);
        await uploadBytes(storageRef, image);
        imageUrl = await getDownloadURL(storageRef);
      }

      const attachmentUrls = [];
      for (const file of attachments) {
        const storageRef = ref(storage, `attachments/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        attachmentUrls.push({ name: file.name, url });
      }

      await addDoc(collection(db, "events"), {
        title: title.trim(),
        detail: detail.trim(),
        location: location.trim(),
        deadline: hasDeadline ? deadline : "",
        deadlineTime: hasDeadline ? deadlineTime : "",
        tags: {
          genre: genreTag,
          targets: targetTags,
          campus: campusTags,
          style: styleTags,
          organizer: organizerTags,
          recruit: recruitTags,
        },
        imageUrl,
        applyLabel: applyLabel || "参加を申し込む",
        applyLink,
        participants: [],
        organizerType: finalOrganizerType,
        organizerId: finalOrganizerId,
        createdBy: finalOrganizerId,
        createdByPersonal: currentUid,
        createdAt: serverTimestamp(),
        organizerName,
        organizerAvatar,
        contact,
        targetGakuin,
        targetGakukei,
        dates: hasDate ? dates : [],
        date: hasDate ? (dates[0]?.date || "") : "",
        startTime: hasDate ? (dates[0]?.startTime || "") : "",
        endTime: hasDate ? (dates[0]?.endTime || "") : "",
        attachments: [...existingAttachments, ...attachmentUrls],
      });

      alert("イベントを公開しました！");
      onPosted();
    } catch (err) {
      alert("投稿に失敗しました: " + err.message);
    }
    setLoading(false);
  };

  const s = {
    container: { background: "white", borderRadius: 16, padding: "24px 20px", margin: "16px auto", maxWidth: 720, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", gap: 0, overflow: "hidden", boxSizing: "border-box", width: "100%" },
    input: { width: "100%", maxWidth: "100%", minWidth: "0px", boxSizing: "border-box", padding: "11px 13px", border: "1.5px solid #D0DDD9", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "inherit", WebkitAppearance: "none", appearance: "none" },
    tagBtn: { padding: "6px 12px", borderRadius: 999, border: `1.5px solid #D0DDD9`, background: "white", fontSize: 12, fontWeight: 600, color: "#5A7370", cursor: "pointer" },
    btn: { marginTop: 8, padding: 14, background: THEME, color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%" },
  };

  return (
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
                              📍 {tmpl.location}
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

      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1A2E2B", margin: 0 }}>募集内容登録</h2>
        <button
          type="button"
          className="tag-tab-btn"
          style={{ fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          onClick={() => setShowTemplateModal(true)}
        >
          <Clock size={14} /> 過去から呼び出す
        </button>
      </div>

      {/* 共通フォーム */}
      <EventFormFields
        organizerType={organizerType} setOrganizerType={setOrganizerType}
        selectedGroupId={selectedGroupId} setSelectedGroupId={setSelectedGroupId}
        userProfile={userProfile} userGroups={userGroups}
        onNavigateToGroupCreation={handleNavigateToGroupCreation}
        preview={preview} onImageChange={handleImage} imageInputId="imgInput"
        title={title} setTitle={setTitle}
        detail={detail} setDetail={setDetail}
        location={location} setLocation={setLocation}
        contact={contact} setContact={setContact}
        applyLabel={applyLabel} setApplyLabel={setApplyLabel}
        applyLink={applyLink} setApplyLink={setApplyLink}
        hasDate={hasDate} setHasDate={setHasDate}
        dates={dates} setDates={setDates}
        hasDeadline={hasDeadline} setHasDeadline={setHasDeadline}
        deadline={deadline} setDeadline={setDeadline}
        deadlineTime={deadlineTime} setDeadlineTime={setDeadlineTime}
        genreTag={genreTag} setGenreTag={setGenreTag}
        recruitTags={recruitTags} setRecruitTags={setRecruitTags}
        targetTags={targetTags} setTargetTags={setTargetTags}
        targetGakuin={targetGakuin} setTargetGakuin={setTargetGakuin}
        targetGakukei={targetGakukei} setTargetGakukei={setTargetGakukei}
        campusTags={campusTags} setCampusTags={setCampusTags}
        styleTags={styleTags} setStyleTags={setStyleTags}
        organizerTags={organizerTags} setOrganizerTags={setOrganizerTags}
        existingAttachments={existingAttachments} setExistingAttachments={setExistingAttachments}
        attachments={attachments} setAttachments={setAttachments}
        attachInputId="attachInput"
        isEditMode={false}
      />

      <button className="submit-btn" style={s.btn} onClick={handleSubmit} disabled={loading}>
        {loading ? "投稿中..." : "イベントを投稿する"}
      </button>
    </div>
  );
}