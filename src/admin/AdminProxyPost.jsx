import { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { User, Users } from "lucide-react";
import { THEME } from "../constants";
import "../animations.css";
import heic2any from "heic2any";
import EventFormCore from "../EventFormCore";

export default function AdminProxyPost({ user }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 主催者
  const [proxyOrganizerId, setProxyOrganizerId] = useState("");
  const [proxyIsGroup, setProxyIsGroup] = useState(false);
  const [proxyOrgSearch, setProxyOrgSearch] = useState("");

  // EventFormCore用state
  const [preview, setPreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [location, setLocation] = useState("");
  const [contact, setContact] = useState("");
  const [applyLabel, setApplyLabel] = useState("");
  const [applyLink, setApplyLink] = useState("");
  const [hasDate, setHasDate] = useState(true);
  const [dates, setDates] = useState([{ date: "", startTime: "", endTime: "" }]);
  const [hasDeadline, setHasDeadline] = useState(true);
  const [deadline, setDeadline] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");
  const [genreTag, setGenreTag] = useState([]);
  const [recruitTags, setRecruitTags] = useState([]);
  const [targetTags, setTargetTags] = useState([]);
  const [targetGakuin, setTargetGakuin] = useState([]);
  const [targetGakukei, setTargetGakukei] = useState([]);
  const [campusTags, setCampusTags] = useState([]);
  const [styleTags, setStyleTags] = useState([]);
  const [organizerTags, setOrganizerTags] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const [usersSnap, groupsSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "groups")),
      ]);
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setGroups(groupsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetch();
  }, []);

  const handleImageChange = async (e) => {
    let f = e.target.files[0];
    if (!f) return;
    if (f.type === "image/heic" || f.type === "image/heif" || f.name.toLowerCase().endsWith(".heic") || f.name.toLowerCase().endsWith(".heif")) {
      try {
        const converted = await heic2any({ blob: f, toType: "image/jpeg", quality: 0.85 });
        f = new File([converted], f.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg"), { type: "image/jpeg" });
      } catch { alert("画像の変換に失敗しました。別の形式でお試しください。"); return; }
    }
    setImageFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!proxyOrganizerId) { alert("主催者を先に選択してください。"); return; }
    if (!title.trim() || !detail.trim() || genreTag.length === 0) {
      alert("イベント名・詳細・ジャンルは必須です。"); return;
    }
    if (hasDate && dates.some(d => !d.date)) {
      alert("開催日を入力してください。"); return;
    }
    if (hasDeadline && !deadline) {
      alert("締切日を入力してください。"); return;
    }
    setSaving(true);
    try {
      const targetGroup = proxyIsGroup ? groups.find(g => g.id === proxyOrganizerId) : null;
      const targetUser = !proxyIsGroup ? users.find(u => u.id === proxyOrganizerId) : null;
      const finalOrganizerName = proxyIsGroup ? (targetGroup?.displayName || "グループ") : (targetUser?.displayName || "個人ユーザー");
      const finalOrganizerAvatar = proxyIsGroup ? (targetGroup?.avatarUrl || "") : (targetUser?.avatarUrl || "");

      let imageUrl = null;
      if (imageFile) {
        const storageRef = ref(storage, `events/${Date.now()}_proxy_${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }

      const attachmentUrls = [...existingAttachments];
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
        organizerType: proxyIsGroup ? "group" : "user",
        organizerId: proxyOrganizerId,
        createdBy: proxyOrganizerId,
        createdByPersonal: user?.uid,
        createdAt: serverTimestamp(),
        organizerName: finalOrganizerName,
        organizerAvatar: finalOrganizerAvatar,
        isGroup: proxyIsGroup,
        contact,
        targetGakuin,
        targetGakukei,
        dates: hasDate ? dates : [],
        date: hasDate ? (dates[0]?.date || "") : "",
        startTime: hasDate ? (dates[0]?.startTime || "") : "",
        endTime: hasDate ? (dates[0]?.endTime || "") : "",
        attachments: attachmentUrls,
      });

      // リセット
      setProxyOrganizerId(""); setProxyIsGroup(false); setProxyOrgSearch("");
      setPreview(null); setImageFile(null);
      setTitle(""); setDetail(""); setLocation(""); setContact("");
      setApplyLabel(""); setApplyLink("");
      setHasDate(true); setDates([{ date: "", startTime: "", endTime: "" }]);
      setHasDeadline(true); setDeadline(""); setDeadlineTime("");
      setGenreTag(""); setRecruitTags([]); setTargetTags([]);
      setTargetGakuin([]); setTargetGakukei([]);
      setCampusTags([]); setStyleTags([]); setOrganizerTags([]);
      setExistingAttachments([]); setAttachments([]);

      alert(`「${finalOrganizerName}」名義での代打投稿が完了しました！`);
      navigate("/admin/events");
    } catch (err) {
      alert("代打投稿に失敗しました: " + err.message);
    } finally { setSaving(false); }
  };

  if (loading) return <p style={{ padding: 24 }}>読み込み中...</p>;

  const filteredUsers = users.filter(u => { const q = proxyOrgSearch.toLowerCase(); return !q || u.displayName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q); });
  const filteredGroups = groups.filter(g => { const q = proxyOrgSearch.toLowerCase(); return !q || g.displayName?.toLowerCase().includes(q) || g.email?.toLowerCase().includes(q); });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, background: "white", padding: 20, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>イベント代打投稿 (管理者専用)</h2>
      <p style={{ fontSize: 12, color: "#5A7370", margin: 0 }}>特定のユーザーやサークルに代わってイベントを代理公開します。</p>

      {/* 主催者選択（管理者専用：全ユーザー・グループから選択） */}
      <div style={s.fieldRow}>
        <label style={s.formLabel}>主催者を選択 <span style={s.required}>必須</span></label>
        <input style={{ ...s.input, marginBottom: 8 }} placeholder="個人名・サークル名・メールで検索..." value={proxyOrgSearch} onChange={e => setProxyOrgSearch(e.target.value)} />
        <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid #D0DDD9", borderRadius: 8, padding: 8, background: "#FAFDFC" }}>
          <div style={s.cardGrid}>
            {filteredUsers.map(u => (
              <div key={u.id} className={`organizer-card ${!proxyIsGroup && proxyOrganizerId === u.id ? "organizer-selected" : ""}`}
                style={s.organizerCard}
                onClick={() => { setProxyOrganizerId(u.id); setProxyIsGroup(false); }}>
                <div style={s.cardAvatarWrap}>{u.avatarUrl ? <img src={u.avatarUrl} style={s.cardAvatar} alt="" /> : <User size={14} color="#9AADA8" />}</div>
                <div style={s.cardInfo}>
                  <div style={s.cardName}>{u.displayName || "名前なし"}</div>
                  <div style={{ fontSize: 9, color: "#8A9F9B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                </div>
              </div>
            ))}
            {filteredGroups.map(g => (
              <div key={g.id} className={`organizer-card ${proxyIsGroup && proxyOrganizerId === g.id ? "organizer-selected" : ""}`}
                style={s.organizerCard}
                onClick={() => { setProxyOrganizerId(g.id); setProxyIsGroup(true); }}>
                <div style={s.cardAvatarWrap}>{g.avatarUrl ? <img src={g.avatarUrl} style={s.cardAvatar} alt="" /> : <Users size={14} color="#9AADA8" />}</div>
                <div style={s.cardInfo}>
                  <div style={s.cardName}>{g.displayName || "名前なし"}</div>
                  <div style={{ fontSize: 9, color: "#8A9F9B" }}>グループ</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 主催者以外は EventFormCore に委譲 */}
      <EventFormCore
        isEditMode={false}
        preview={preview}
        onImageChange={handleImageChange}
        imageInputId="proxyEventImg"
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
        attachInputId="proxyAttachInput"
      />

      <button className="submit-btn"
        style={{ padding: 14, border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 12 }}
        onClick={handleSubmit} disabled={saving}>
        {saving ? "代打投稿中..." : "この内容で代打投稿を完了する"}
      </button>
    </div>
  );
}

const s = {
  input: { padding: "10px 14px", border: "1.5px solid #D0DDD9", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" },
  formLabel: { fontSize: 12, fontWeight: 700, color: "#5A7370", marginTop: 2 },
  fieldRow: { display: "flex", flexDirection: "column", gap: 4 },
  required: { background: "#E53935", color: "white", fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 3, marginLeft: 4 },
  cardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 6 },
  organizerCard: { display: "flex", alignItems: "center", gap: 6, padding: "6px", borderRadius: 6, cursor: "pointer" },
  cardAvatarWrap: { width: 24, height: 24, borderRadius: "50%", background: "#E0E8E7", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 },
  cardAvatar: { width: "100%", height: "100%", objectFit: "cover" },
  cardInfo: { minWidth: 0, flex: 1 },
  cardName: { fontSize: 11, fontWeight: 700, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" },
};