import { useState } from "react";
import { db, auth } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function Contact({ onBack }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(auth.currentUser?.email || "");
  const [type, setType] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !type || !message) {
      alert("全ての項目を入力してください");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "contacts"), {
        name,
        email,
        type,
        message,
        uid: auth.currentUser?.uid || null,
        createdAt: serverTimestamp(),
      });
      setDone(true);
    } catch (err) {
      alert("送信に失敗しました: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>← 戻る</button>
        <h1 style={s.title}>お問い合わせ</h1>
      </div>
      <div style={s.body}>
        {done ? (
          <div style={s.doneBox}>
            <div style={{ fontSize:48 }}>✅</div>
            <h2 style={s.doneTitle}>送信完了しました</h2>
            <p style={s.doneText}>お問い合わせありがとうございます。内容を確認の上、ご連絡いたします。</p>
            <button style={s.submitBtn} onClick={onBack}>戻る</button>
          </div>
        ) : (
          <>
            <p style={s.desc}>
              ISCT Syncに関するご質問・ご意見・不具合報告などはこちらからお送りください。
            </p>
            <form style={s.form} onSubmit={handleSubmit}>
              <div style={s.formGroup}>
                <label style={s.label}>お名前 <span style={s.required}>必須</span></label>
                <input style={s.input} type="text" placeholder="東科 太郎" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>メールアドレス <span style={s.required}>必須</span></label>
                <input style={s.input} type="email" placeholder="s12345@m.isct.ac.jp" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>お問い合わせの種類 <span style={s.required}>必須</span></label>
                <select style={s.input} value={type} onChange={e => setType(e.target.value)}>
                  <option value="">選択してください</option>
                  <option>不具合・バグの報告</option>
                  <option>機能のリクエスト</option>
                  <option>イベントに関する相談</option>
                  <option>アカウントに関する問題</option>
                  <option>その他</option>
                </select>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>お問い合わせ内容 <span style={s.required}>必須</span></label>
                <textarea style={s.textarea} placeholder="お問い合わせ内容を入力してください" rows={6} value={message} onChange={e => setMessage(e.target.value)} />
              </div>
              <button style={s.submitBtn} type="submit" disabled={loading}>
                {loading ? "送信中..." : "送信する"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const THEME = "#88203a";
const s = {
  container: { background:"#F4F6F5", minHeight:"100vh" },
  header: { background:THEME, padding:"16px 20px", display:"flex", alignItems:"center", gap:16 },
  backBtn: { background:"none", border:"none", color:"white", fontSize:14, fontWeight:700, cursor:"pointer" },
  title: { color:"white", fontSize:18, fontWeight:900, margin:0 },
  body: { maxWidth:720, margin:"0 auto", padding:"24px 20px", display:"flex", flexDirection:"column", gap:20 },
  desc: { fontSize:14, color:"#5A7370", lineHeight:1.7, background:"white", padding:"16px", borderRadius:12, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" },
  form: { background:"white", borderRadius:12, padding:"24px 20px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", display:"flex", flexDirection:"column", gap:16 },
  formGroup: { display:"flex", flexDirection:"column", gap:6 },
  label: { fontSize:12, fontWeight:700, color:"#5A7370", letterSpacing:"0.05em" },
  required: { background:"#E53935", color:"white", fontSize:10, fontWeight:700, padding:"1px 5px", borderRadius:3, marginLeft:4 },
  input: { width:"100%", padding:"11px 13px", border:"1.5px solid #D0DDD9", borderRadius:8, fontSize:14, outline:"none", fontFamily:"inherit" },
  textarea: { width:"100%", padding:"11px 13px", border:"1.5px solid #D0DDD9", borderRadius:8, fontSize:14, outline:"none", fontFamily:"inherit", resize:"vertical", lineHeight:1.6 },
  submitBtn: { padding:14, background:THEME, color:"white", border:"none", borderRadius:8, fontSize:15, fontWeight:700, cursor:"pointer" },
  doneBox: { background:"white", borderRadius:12, padding:"40px 24px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", display:"flex", flexDirection:"column", alignItems:"center", gap:16, textAlign:"center" },
  doneTitle: { fontSize:20, fontWeight:900, color:"#111" },
  doneText: { fontSize:14, color:"#5A7370", lineHeight:1.7 },
};