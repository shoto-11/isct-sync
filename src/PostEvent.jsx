import { useState, useEffect } from "react";
import { db, storage, auth } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp, getDoc, doc } from "firebase/firestore";
import { 
  THEME,
  GENRE_TAGS, 
  TARGET_TAGS, 
  CAMPUS_TAGS, 
  STYLE_TAGS, 
  ORGANIZER_TAGS, 
  BG_COLOR, 
  GAKUIN 
} from "./constants";
import { MapPin, Calendar, Clock, Users, User, Plus, ImageIcon, Paperclip, X, ArrowLeft } from "lucide-react";

export default function PostEvent({ onPosted, userGroups = [] }) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [applyLabel, setApplyLabel] = useState("");
  const [applyLink, setApplyLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");
  const [genreTag, setGenreTag] = useState("");
  const [targetTags, setTargetTags] = useState([]);
  const [campusTag, setCampusTag] = useState("");
  const [styleTag, setStyleTag] = useState("");
  const [organizerTag, setOrganizerTag] = useState("");
  const [contact, setContact] = useState("");
  const [targetGakuin, setTargetGakuin] = useState([]);
  const [targetGakukei, setTargetGakukei] = useState([]);

  const [organizerType, setOrganizerType] = useState(userGroups.length > 0 ? "group" : "personal");
  const [selectedGroupId, setSelectedGroupId] = useState(userGroups.length > 0 ? userGroups[0].id : null);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!auth.currentUser) return;
      try {
        const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (snap.exists()) {
          setUserProfile(snap.data());
        }
      } catch (err) {
        console.error("ユーザー情報の取得に失敗しました:", err);
      }
    };
    fetchUserProfile();
  }, []);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleAttachments = (e) => {
    const newFiles = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...newFiles]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleNavigateToGroupCreation = () => {
    if (window.confirm("グループの新規作成・参加は、マイページの「グループ管理」画面から行えます。一度この作成画面を閉じてマイページへ移動しますか？\n（入力中の内容は破棄されます）")) {
      window.location.href = "/mypage";
    }
  };

  const handleSubmit = async () => {
    // 💡 必須判定の完全同期（9つの条件）
    if (!title.trim() || !detail.trim() || !date || !location.trim() || !deadline || !genreTag || !targetTags.length || !campusTag) {
      alert("必須項目を全て入力・選択してください。");
      return;
    }
    // 💡 【新規追加】申し込み締切日がイベント日時を超えていないかチェック
    if (new Date(deadline) > new Date(date)) {
      alert("申し込み締切日はイベント当日、またはそれより前の日付に設定してください。");
      return;
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
        date,
        startTime,
        endTime,
        location: location.trim(),
        deadline,
        deadlineTime,
        tags: {
          genre: genreTag,
          targets: targetTags,
          campus: campusTag,
          style: styleTag,
          organizer: organizerTag, // 💡 修正
        },
        imageUrl,
        attachments: attachmentUrls,
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
      });

      alert("イベントを公開しました！");
      onPosted();
    } catch (err) {
      alert("投稿に失敗しました: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={s.container}>
      {/*<button style={s.backBtn} onClick={() => window.history.back()}>
        <ArrowLeft size={16} />
        <span>戻る</span>
      </button>*/}
      <h2 style={s.heading}>イベントを作る</h2>


{/* 募集者選択（必須） */}
      <div style={s.section}>
        <label style={s.label}>募集者を選択 <span style={s.required}>必須</span></label>
        <div style={s.cardGrid}>
          <button
            className={`organizer-card ${organizerType === "personal" ? "organizer-selected" : ""}`}
            style={s.organizerCard}
            onClick={() => setOrganizerType("personal")}
            >
            <div style={s.cardAvatarWrap}>
              {userProfile?.avatarUrl ? <img src={userProfile.avatarUrl} style={s.cardAvatar} alt="user" /> : <User size={16} color={THEME} />}
            </div>
            <div style={s.cardInfo}>
              <div style={s.cardName}>{userProfile?.displayName || "あなた (個人)"}</div>
              <div style={s.cardTypeTag}>個人名義</div>
            </div>
          </button>

          {userGroups.map(group => (
            <button
                key={group.id}
                className={`organizer-card ${organizerType === "group" && selectedGroupId === group.id ? "organizer-selected" : ""}`}
                style={s.organizerCard}
                onClick={() => { setOrganizerType("group"); setSelectedGroupId(group.id); }}
                >
              <div style={s.cardAvatarWrap}>
                {group.avatarUrl ? <img src={group.avatarUrl} style={s.cardAvatar} alt="group" /> : <Users size={16} color="#9AADA8" />}
              </div>
              <div style={s.cardInfo}>
                <div style={s.cardName}>{group.displayName}</div>
                <div style={s.cardTypeTag}>{group.groupType || "サークル"}</div>
              </div>
            </button>
          ))}

                <button
                        className="organizer-card"
                        style={{ ...s.organizerCard, ...s.dashedCard }}
                        onClick={handleNavigateToGroupCreation}
                        >
            <div style={s.plusIconWrap}><Plus size={16} color="#5A7370" /></div>
            <div style={s.cardInfo}>
              <div style={{ ...s.cardName, color: "#5A7370" }}>新しいグループ</div>
              <div style={{ ...s.cardTypeTag, color: "#7A9591" }}>作成・参加はこちら</div>
            </div>
          </button>
        </div>
      </div>

      {/* イベント画像（任意） */}
      <div style={s.section}>
        <label style={s.label}>イベント画像（任意）</label>
        <div style={s.imageArea} onClick={() => document.getElementById("imgInput").click()}>
          {preview ? (
            <img src={preview} alt="preview" style={s.previewImg} />
          ) : (
            <div style={s.imagePlaceholder}>
              <ImageIcon size={32} color="#BACFCB" />
              <span style={s.imagePlaceholderText}>タップして画像を追加</span>
            </div>
          )}
          <input id="imgInput" type="file" accept="image/*" style={{ display:"none" }} onChange={handleImage} />
        </div>
      </div>

      {/* イベント名（必須） */}
      <div style={s.section}>
        <label style={s.label}>イベント名 <span style={s.required}>必須</span></label>
        <input style={s.input} placeholder="例：春フットサル大会" value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      {/* イベント詳細（必須） */}
      <div style={s.section}>
        <label style={s.label}>イベント詳細 <span style={s.required}>必須</span></label>
        <textarea style={s.textarea} placeholder="イベントの内容、持ち物、注意事項などを記入してください" value={detail} onChange={e => setDetail(e.target.value)} rows={4} />
      </div>

      {/* イベント日時（必須） */}
      <div style={s.section}>
        <label style={s.label}>イベント日時 <span style={s.required}>必須</span></label>
        <input style={{ ...s.input, maxWidth: "100%", minWidth: 0 }} type="date" value={date} onChange={e => setDate(e.target.value)} onFocus={e => e.target.showPicker()}/>
        <div style={s.timeRow}>
          <div style={{ flex:1, minWidth:0 }}>
            <label style={{ ...s.label, fontSize:11 }}>開始時刻（任意）</label>
            <input style={s.input} type="time" value={startTime} onChange={e => setStartTime(e.target.value)} onFocus={e => e.target.showPicker()} />
          </div>
          <div style={s.timeSeparator}>〜</div>
          <div style={{ flex:1, minWidth:0 }}>
            <label style={{ ...s.label, fontSize:11 }}>終了時刻（任意）</label>
            <input style={s.input} type="time" value={endTime} onChange={e => setEndTime(e.target.value)} onFocus={e => e.target.showPicker()} />
          </div>
        </div>
      </div>

      {/* 場所（必須） */}
      <div style={s.section}>
        <label style={s.label}>場所 <span style={s.required}>必須</span></label>
        <input style={s.input} placeholder="例：大岡山グラウンド" value={location} onChange={e => setLocation(e.target.value)} />
      </div>

      {/* 申し込み締切日（必須） */}
      <div style={s.section}>
        <label style={s.label}>申し込み締切日 <span style={s.required}>必須</span></label>
        <input style={{ ...s.input, maxWidth: "100%", minWidth: 0 }} type="date" value={deadline} onChange={e => setDeadline(e.target.value)} onFocus={e => e.target.showPicker()} />
      </div>
      <div style={s.section}>
        <label style={s.label}>申し込み締切時間（任意）</label>
        <input style={{ ...s.input, maxWidth: "100%", minWidth: 0 }} type="time" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)} onFocus={e => e.target.showPicker()} />
      </div>

      {/* 添付画像・資料（任意） */}
      <div style={s.section}>
        <label style={s.label}>添付画像・資料（任意）</label>
        <div style={s.attachArea} onClick={() => document.getElementById("attachInput").click()}>
          <Paperclip size={18} color="#5A7370" />
          <span style={s.imagePlaceholderText}>
            {attachments.length > 0 ? `${attachments.length}件選択済み` : "ファイルを追加"}
          </span>
          <input id="attachInput" type="file" multiple style={{ display:"none" }} onChange={handleAttachments} />
        </div>
        {attachments.length > 0 && (
          <div style={s.attachList}>
            {attachments.map((f, i) => (
              <div key={i} style={s.attachItem}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Paperclip size={12} />{f.name}</span>
                <button style={s.removeBtn} onClick={(e) => { e.stopPropagation(); removeAttachment(i); }}><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ① ジャンル（必須） */}
      <div style={s.section}>
        <label style={s.label}>① ジャンル <span style={s.required}>必須</span></label>
        <div style={s.optionGrid}>
          {GENRE_TAGS.map(t => (
            <button key={t} 
            className={`tag-tab-btn ${genreTag === t ? "tag-active-tab" : ""}`}
                style={s.tagBtn}
                onClick={() => setGenreTag(t)}>{t}</button>
          ))}
        </div>
      </div>

      {/* ② 対象学年（必須） */}
      <div style={s.section}>
        <label style={s.label}>② 対象学年 <span style={s.required}>必須・複数選択可</span></label>
        <div style={s.optionGrid}>
          {TARGET_TAGS.map(t => (
            <button key={t} 
            className={`tag-tab-btn ${targetTags.includes(t) ? "tag-active-tab" : ""}`}
            style={s.tagBtn}
              onClick={() => setTargetTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* 対象学院（任意） */}
      <div style={s.section}>
        <label style={s.label}>対象学院（任意・複数選択可）</label>
        <div style={s.optionGrid}>
          {Object.keys(GAKUIN).map(g => (
            <button key={g} 
            className={`tag-tab-btn ${targetGakuin.includes(g) ? "tag-active-tab" : ""}`}
            style={s.tagBtn}
              onClick={() => setTargetGakuin(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* 対象学系（任意） */}
      {targetGakuin.length > 0 && (
        <div style={s.section}>
          <label style={s.label}>対象学系（任意・複数選択可）</label>
          <div style={s.optionGrid}>
            {targetGakuin.flatMap(g => GAKUIN[g]).map(k => (
              <button key={k} 
              className={`tag-tab-btn ${targetGakukei.includes(k) ? "tag-active-tab" : ""}`}
                style={s.tagBtn}
                onClick={() => setTargetGakukei(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ③ キャンパス（必須） */}
      <div style={s.section}>
        <label style={s.label}>③ キャンパス <span style={s.required}>必須</span></label>
        <div style={s.optionGrid}>
          {CAMPUS_TAGS.map(t => (
            <button key={t} 
            className={`tag-tab-btn ${campusTag === t ? "tag-active-tab" : ""}`}
            style={s.tagBtn}
            onClick={() => setCampusTag(t)}>{t}</button>
          ))}
        </div>
      </div>

      {/* ④ 参加スタイル（任意） */}
      <div style={s.section}>
        <label style={s.label}>④ 参加スタイル（任意）</label>
        <div style={s.optionGrid}>
          {STYLE_TAGS.map(t => (
            <button key={t} 
            className={`tag-tab-btn ${styleTag === t ? "tag-active-tab" : ""}`}
            style={s.tagBtn}
            onClick={() => setStyleTag(prev => prev === t ? "" : t)}>{t}</button>
          ))}
        </div>
      </div>

      {/* ⑤ 募集者種別（任意） */}
      <div style={s.section}>
        <label style={s.label}>⑤ 募集者種別（任意）</label>
        <div style={s.optionGrid}>
          {ORGANIZER_TAGS.map(t => (
            <button key={t} 
            className={`tag-tab-btn ${organizerTag === t ? "tag-active-tab" : ""}`}
            style={s.tagBtn}
            onClick={() => setOrganizerTag(prev => prev === t ? "" : t)}>{t}</button>
          ))}
        </div>
      </div>

      {/* 申し込みボタン名（任意） */}
      <div style={s.section}>
        <label style={s.label}>申し込みボタンの名前（任意）</label>
        <input style={s.input} placeholder="参加を申し込む" value={applyLabel} onChange={e => setApplyLabel(e.target.value)} />
      </div>

      {/* 申し込みリンク（任意） */}
      <div style={s.section}>
        <label style={s.label}>申し込みリンク（任意）</label>
        <input style={s.input} type="url" placeholder="https://forms.gle/..." value={applyLink} onChange={e => setApplyLink(e.target.value)} />
      </div>

      {/* お問い合わせ先（任意） */}
      <div style={s.section}>
        <label style={s.label}>お問い合わせ先（任意）</label>
        <input style={s.input} placeholder="例：example@m.isct.ac.jp / @Twitter" value={contact} onChange={e => setContact(e.target.value)} />
      </div>

      <button className="submit-btn" style={s.btn} onClick={handleSubmit} disabled={loading}>
        {loading ? "投稿中..." : "イベントを投稿する"}
      </button>
    </div>
  );
}

const s = {
  container: { background:"white", borderRadius:16, padding:"24px 20px", margin:"16px auto", maxWidth:720, boxShadow:"0 2px 12px rgba(0,0,0,0.08)", display:"flex", flexDirection:"column", gap:0, overflow:"hidden", boxSizing:"border-box", width:"100%" },
  heading: { fontSize:18, fontWeight:700, color:"#1A2E2B", marginBottom:20 },
  section: { marginBottom:18 },
  label: { display:"block", fontSize:12, fontWeight:700, color:"#5A7370", letterSpacing:"0.05em", marginBottom:6 },
  required: { background:"#E53935", color:"white", fontSize:10, fontWeight:700, padding:"1px 5px", borderRadius:3, marginLeft:4 },
 input: { 
    width: "100%", 
    /* 📱 スマホの実機（Webkit）でdateやtimeが画面を突き破るバグを強制終了させるコア設定 */
    maxWidth: "100%", 
    minWidth: "0px", 
    /* 横幅の計算ベースを枠線の内側に完全ロック */
    boxSizing: "border-box", 
    padding: "11px 13px", 
    border: "1.5px solid #D0DDD9", 
    borderRadius: 8, 
    fontSize: 14, 
    outline: "none", 
    fontFamily: "inherit",
    /* iOS Safari特有のインプットの余計な影やデフォルト表示をリセット */
    WebkitAppearance: "none",
    appearance: "none"
  },
  textarea: { width:"100%", padding:"11px 13px", border:"1.5px solid #D0DDD9", borderRadius:8, fontSize:14, outline:"none", fontFamily:"inherit", resize:"vertical", lineHeight:1.6, boxSizing: "border-box" },
  imageArea: { width:"100%", height:180, borderRadius:12, overflow:"hidden", border:"2px dashed #D0DDD9", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", background:BG_COLOR, boxSizing: "border-box" },
  previewImg: { width:"100%", height:"100%", objectFit:"cover" },
  imagePlaceholder: { display:"flex", flexDirection:"column", alignItems:"center", gap:8 },
  imagePlaceholderText: { fontSize:13, color:"#5A7370", fontWeight:600 },
  timeRow: { 
    display: "flex", 
    alignItems: "flex-end", 
    gap: 8, 
    marginTop: 8, 
    width: "100%", 
    /* 📱 親要素自体がスマホで右にはみ出るのを完全に禁止するお守り */
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  timeSeparator: { fontSize:16, color:"#5A7370", paddingBottom:10, flexShrink:0 },
  attachArea: { width:"100%", padding:"14px", borderRadius:8, border:"2px dashed #D0DDD9", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, background:BG_COLOR },
  attachList: { marginTop:8, display:"flex", flexDirection:"column", gap:4 },
  attachItem: { fontSize:12, color:"#5A7370", padding:"6px 10px", background:BG_COLOR, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"space-between" },
  removeBtn: { background:"none", border:"none", color:"#BACFCB", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center" },
  btn: { marginTop:8, padding:14, background: THEME, color: "white", border:"none", borderRadius:8, fontSize:15, fontWeight:700, cursor:"pointer", width:"100%" },
  optionGrid: { display:"flex", flexWrap:"wrap", gap:8 },
  tagBtn: { padding:"6px 12px", borderRadius:999, border:`1.5px solid #D0DDD9`, background:"white", fontSize:12, fontWeight:600, color:"#5A7370", cursor:"pointer" },
  backBtn: { background:"none", border:"none", color: THEME, fontSize:14, fontWeight:700, cursor:"pointer", padding:"0 0 12px", alignSelf:"flex-start", display: "flex", alignItems: "center", gap: 4 },
  cardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginTop: 4 },
  organizerCard: { display: "flex", alignItems: "center", gap: 10, padding: "10px", borderRadius: 8, cursor: "pointer" },
  dashedCard: { borderStyle: "dashed" },
  cardAvatarWrap: { width: 32, height: 32, borderRadius: "50%", background: "#F4F6F5", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 },
  plusIconWrap: { width: 32, height: 32, borderRadius: "50%", background: "#E0E8E7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardAvatar: { width: "100%", height: "100%", objectFit: "cover" },
  cardInfo: { minWidth: 0, flex: 1 },
  cardName: { fontSize: 12, fontWeight: 700, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" },
  cardTypeTag: { fontSize: 10, color: "#7A9591", marginTop: 1, textAlign: "left" },
};