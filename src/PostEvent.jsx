import { useState } from "react";
import { db, auth } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const CATEGORIES = ["スポーツ", "勉強会", "文化", "テック", "交流", "その他"];

export default function PostEvent({ onPosted }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("スポーツ");
  const [capacity, setCapacity] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!title || !date || !location || !capacity) {
      alert("全ての項目を入力してください");
      return;
    }
    setLoading(true);
    await addDoc(collection(db, "events"), {
      title,
      date,
      location,
      category,
      capacity: Number(capacity),
      participants: [],
      createdBy: auth.currentUser.uid,
      createdAt: serverTimestamp(),
    });
    setLoading(false);
    setDone(true);
    setTimeout(() => {
      setDone(false);
      onPosted();
    }, 1500);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>✏️ イベントを作る</h2>

      <label style={styles.label}>タイトル</label>
      <input style={styles.input} placeholder="例：春フットサル大会" value={title} onChange={e => setTitle(e.target.value)} />

      <label style={styles.label}>カテゴリ</label>
      <select style={styles.input} value={category} onChange={e => setCategory(e.target.value)}>
        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
      </select>

      <label style={styles.label}>日付</label>
      <input style={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} />

      <label style={styles.label}>場所</label>
      <input style={styles.input} placeholder="例：大岡山グラウンド" value={location} onChange={e => setLocation(e.target.value)} />

      <label style={styles.label}>定員（人数）</label>
      <input style={styles.input} type="number" placeholder="例：20" value={capacity} onChange={e => setCapacity(e.target.value)} />

      <button style={styles.btn} onClick={handleSubmit} disabled={loading}>
        {loading ? "投稿中..." : done ? "✅ 投稿完了！" : "投稿する"}
      </button>
    </div>
  );
}

const styles = {
  container: {
    background: "white",
    borderRadius: 16,
    padding: "24px 20px",
    margin: "16px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  heading: {
    fontSize: 17,
    fontWeight: 900,
    color: "#1A2E2B",
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: "#5A7370",
    marginTop: 6,
  },
  input: {
    width: "100%",
    padding: "11px 13px",
    border: "1.5px solid #D0DDD9",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    fontFamily: "sans-serif",
  },
  btn: {
    marginTop: 12,
    padding: 14,
    background: "#C8A84B",
    color: "#0D1B2A",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
};