import { useState } from "react";
import { db, storage, auth } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const CATEGORIES = ["スポーツ", "勉強会", "文化", "テック", "交流", "その他"];

export default function PostEvent({ onPosted }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("スポーツ");
  const [capacity, setCapacity] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!title || !date || !location || !capacity) {
      alert("全ての項目を入力してください");
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
      await addDoc(collection(db, "events"), {
        title,
        date,
        location,
        category,
        capacity: Number(capacity),
        participants: [],
        imageUrl,
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

      {/* 画像アップロード */}
      <div style={s.imageArea} onClick={() => document.getElementById("imgInput").click()}>
        {preview ? (
          <img src={preview} alt="preview" style={s.previewImg} />
        ) : (
          <div style={s.imagePlaceholder}>
            <span style={{ fontSize: 36 }}>🖼️</span>
            <span style={s.imagePlaceholderText}>タップして画像を追加</span>
          </div>
        )}
        <input id="imgInput" type="file" accept="image/*" style={{ display:"none" }} onChange={handleImage} />
      </div>

      <div style={s.inputGroup}>
        <label style={s.label}>タイトル</label>
        <input style={s.input} placeholder="例：春フットサル大会" value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      <div style={s.inputGroup}>
        <label style={s.label}>カテゴリ</label>
        <select style={s.input} value={category} onChange={e => setCategory(e.target.value)}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div style={s.inputGroup}>
        <label style={s.label}>日付</label>
        <input style={s.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div style={s.inputGroup}>
        <label style={s.label}>場所</label>
        <input style={s.input} placeholder="例：大岡山グラウンド" value={location} onChange={e => setLocation(e.target.value)} />
      </div>

      <div style={s.inputGroup}>
        <label style={s.label}>定員（人数）</label>
        <input style={s.input} type="number" placeholder="例：20" value={capacity} onChange={e => setCapacity(e.target.value)} />
      </div>

      <button style={s.btn} onClick={handleSubmit} disabled={loading}>
        {loading ? "投稿中..." : "投稿する"}
      </button>
    </div>
  );
}

const s = {
  container: { background:"white", borderRadius:16, padding:"24px 20px", margin:"16px", boxShadow:"0 2px 12px rgba(0,0,0,0.08)", display:"flex", flexDirection:"column", gap:12 },
  heading: { fontSize:17, fontWeight:900, color:"#1A2E2B", marginBottom:4 },
  imageArea: { width:"100%", height:180, borderRadius:12, overflow:"hidden", border:"2px dashed #D0DDD9", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", background:"#F4F6F5" },
  previewImg: { width:"100%", height:"100%", objectFit:"cover" },
  imagePlaceholder: { display:"flex", flexDirection:"column", alignItems:"center", gap:8 },
  imagePlaceholderText: { fontSize:13, color:"#5A7370", fontWeight:600 },
  inputGroup: { display:"flex", flexDirection:"column", gap:5 },
  label: { fontSize:12, fontWeight:700, color:"#5A7370", letterSpacing:"0.05em" },
  input: { width:"100%", padding:"11px 13px", border:"1.5px solid #D0DDD9", borderRadius:8, fontSize:14, outline:"none" },
  btn: { marginTop:8, padding:14, background:"#C8A84B", color:"#0D1B2A", border:"none", borderRadius:8, fontSize:15, fontWeight:700, cursor:"pointer" },
};