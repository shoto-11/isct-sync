import { useState } from "react";
import { db, storage, auth } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const CATEGORIES = ["スポーツ", "勉強会", "文化", "テック", "交流", "その他"];

export default function PostEvent({ onPosted }) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("スポーツ");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [applyLabel, setApplyLabel] = useState("");
  const [applyLink, setApplyLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");

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

  const handleSubmit = async () => {
    if (!title || !detail || !date || !location || !deadline) {
        alert("必須項目を全て入力してください");
        return;
        }
    setLoading(true);
    try {
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
        title,
        detail,
        date,
        startTime,
        endTime,
        location,
        deadline,
        deadlineTime,
        category,
        imageUrl,
        attachments: attachmentUrls,
        applyLabel: applyLabel || "参加を申し込む",
        applyLink,
        participants: [],
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
      onPosted();
    } catch (err) {
      alert("投稿に失敗しました: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={s.container}>
      <h2 style={s.heading}>✏️ イベントを作る</h2>

      {/* イベント画像（任意） */}
      <div style={s.section}>
        <label style={s.label}>イベント画像（任意）</label>
        <div style={s.imageArea} onClick={() => document.getElementById("imgInput").click()}>
          {preview ? (
            <img src={preview} alt="preview" style={s.previewImg} />
          ) : (
            <div style={s.imagePlaceholder}>
              <span style={{ fontSize:36 }}>🖼️</span>
              <span style={s.imagePlaceholderText}>タップして画像を追加</span>
            </div>
          )}
          <input id="imgInput" type="file" accept="image/*" style={{ display:"none" }} onChange={handleImage} />
        </div>
      </div>

      {/* カテゴリ */}
      <div style={s.section}>
        <label style={s.label}>カテゴリ</label>
        <div style={s.categoryRow}>
          {CATEGORIES.map(c => (
            <button
              key={c}
              style={{ ...s.categoryBtn, ...(category === c ? s.categoryBtnActive : {}) }}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
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
        <input  style={s.input}  type="date"  value={date}  onChange={e => setDate(e.target.value)}  onFocus={e => e.target.showPicker()}/>
        <div style={s.timeRow}>
          <div style={{ flex:1 }}>
            <label style={{ ...s.label, fontSize:11 }}>開始時刻</label>
            <input style={s.input} type="time" value={startTime} onChange={e => setStartTime(e.target.value)} onFocus={e => e.target.showPicker()} />
          </div>
          <div style={s.timeSeparator}>〜</div>
          <div style={{ flex:1 }}>
            <label style={{ ...s.label, fontSize:11 }}>終了時刻</label>
            <input style={s.input} type="time" value={endTime} onChange={e => setEndTime(e.target.value)} onFocus={e => e.target.showPicker()} />
          </div>
        </div>
      </div>

      {/* 場所（必須） */}
      <div style={s.section}>
        <label style={s.label}>場所 <span style={s.required}>必須</span></label>
        <input style={s.input} placeholder="例：大岡山グラウンド" value={location} onChange={e => setLocation(e.target.value)} />
      </div>
      {/* 申し込み締切日 */}
        <div style={s.section}>
        <label style={s.label}>申し込み締切日 <span style={s.required}>必須</span></label>
        <input
            style={s.input}
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            onFocus={e => e.target.showPicker()}
        />
        </div>
        <input
            style={{ ...s.input, marginTop:8 }}
            type="time"
            value={deadlineTime}
            onChange={e => setDeadlineTime(e.target.value)}
            onFocus={e => e.target.showPicker()}
            />
      {/* 添付画像・資料（任意） */}
      <div style={s.section}>
        <label style={s.label}>添付画像・資料（任意）</label>
        <div style={s.attachArea} onClick={() => document.getElementById("attachInput").click()}>
          <span style={{ fontSize:24 }}>📎</span>
          <span style={s.imagePlaceholderText}>
            {attachments.length > 0 ? `${attachments.length}件選択済み` : "ファイルを追加"}
          </span>
          <input id="attachInput" type="file" multiple style={{ display:"none" }} onChange={handleAttachments} />
        </div>
        {attachments.length > 0 && (
            <div style={s.attachList}>
                {attachments.map((f, i) => (
                <div key={i} style={s.attachItem}>
                    <span>📄 {f.name}</span>
                    <button
                    style={s.removeBtn}
                    onClick={() => removeAttachment(i)}
                    >
                    ✕
                    </button>
                </div>
                ))}
            </div>
            )}
      </div>

      {/* 申し込みボタン名（任意） */}
      <div style={s.section}>
        <label style={s.label}>申し込みボタンの名前（任意）</label>
        <input style={s.input} placeholder="参加を申し込む" value={applyLabel} onChange={e => setApplyLabel(e.target.value)} />
      </div>

      {/* 申し込みリンク */}
      <div style={s.section}>
        <label style={s.label}>申し込みリンク（任意）</label>
        <input style={s.input} type="url" placeholder="https://forms.gle/..." value={applyLink} onChange={e => setApplyLink(e.target.value)} />
      </div>

      <button style={s.btn} onClick={handleSubmit} disabled={loading}>
        {loading ? "投稿中..." : "イベントを投稿する"}
      </button>
    </div>
  );
}

const s = {
  container: { background:"white", borderRadius:16, padding:"24px 20px", margin:"16px auto", maxWidth:720, boxShadow:"0 2px 12px rgba(0,0,0,0.08)", display:"flex", flexDirection:"column", gap:0 },
  heading: { fontSize:17, fontWeight:900, color:"#1A2E2B", marginBottom:20 },
  section: { marginBottom:18 },
  label: { display:"block", fontSize:12, fontWeight:700, color:"#5A7370", letterSpacing:"0.05em", marginBottom:6 },
  required: { background:"#E53935", color:"white", fontSize:10, fontWeight:700, padding:"1px 5px", borderRadius:3, marginLeft:4 },
  input: { width:"100%", padding:"11px 13px", border:"1.5px solid #D0DDD9", borderRadius:8, fontSize:14, outline:"none", fontFamily:"inherit" },
  textarea: { width:"100%", padding:"11px 13px", border:"1.5px solid #D0DDD9", borderRadius:8, fontSize:14, outline:"none", fontFamily:"inherit", resize:"vertical", lineHeight:1.6 },
  imageArea: { width:"100%", height:180, borderRadius:12, overflow:"hidden", border:"2px dashed #D0DDD9", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", background:"#F4F6F5" },
  previewImg: { width:"100%", height:"100%", objectFit:"cover" },
  imagePlaceholder: { display:"flex", flexDirection:"column", alignItems:"center", gap:8 },
  imagePlaceholderText: { fontSize:13, color:"#5A7370", fontWeight:600 },
  categoryRow: { display:"flex", flexWrap:"wrap", gap:8 },
  categoryBtn: { padding:"6px 14px", borderRadius:999, border:"1.5px solid #D0DDD9", background:"white", fontSize:13, fontWeight:600, color:"#5A7370", cursor:"pointer" },
  categoryBtnActive: { background:"#007A6E", color:"white", border:"1.5px solid #007A6E" },
  timeRow: { display:"flex", alignItems:"flex-end", gap:8, marginTop:8 },
  timeSeparator: { fontSize:16, color:"#5A7370", paddingBottom:10, flexShrink:0 },
  attachArea: { width:"100%", padding:"14px", borderRadius:8, border:"2px dashed #D0DDD9", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, background:"#F4F6F5" },
  attachList: { marginTop:8, display:"flex", flexDirection:"column", gap:4 },
  attachItem: { fontSize:12, color:"#5A7370", padding:"6px 10px", background:"#F4F6F5", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"space-between" },
  removeBtn: { background:"none", border:"none", color:"#B0BEC5", fontSize:14, cursor:"pointer", padding:"0 4px", fontWeight:700, lineHeight:1 },
  btn: { marginTop:8, padding:14, background:"#C8A84B", color:"#0D1B2A", border:"none", borderRadius:8, fontSize:15, fontWeight:700, cursor:"pointer", width:"100%" },
};