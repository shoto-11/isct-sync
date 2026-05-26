import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";

export default function AdminNotice() {
  const [notice, setNotice] = useState({ items: [{ text: "", link: "" }] });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDoc(doc(db, "adminSettings", "display"));
      if (snap.exists()) {
        const data = snap.data();
        setNotice(data.notice?.items ? data.notice : { items: [{ text: "", link: "" }] });
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "adminSettings", "display"), { notice });
    } catch {
      await setDoc(doc(db, "adminSettings", "display"), { notice });
    }
    setSaving(false);
    alert("保存しました！");
  };

  if (loading) return <p style={{ padding: 24 }}>読み込み中...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700 }}>お知らせ（最大5件）</h2>
      {(notice.items || []).map((item, i) => (
        <div key={i} style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#5A7370" }}>お知らせ {i + 1}</span>
            {(notice.items || []).length > 1 && (
              <button style={{ background: "none", border: "none", color: "#E53935", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                onClick={() => { const n = [...notice.items]; n.splice(i, 1); setNotice({ ...notice, items: n }); }}>
                削除
              </button>
            )}
          </div>
          <input style={s.input} placeholder="お知らせの文章" value={item.text || ""}
            onChange={(e) => { const n = [...notice.items]; n[i] = { ...n[i], text: e.target.value }; setNotice({ ...notice, items: n }); }} />
          <input style={s.input} placeholder="リンク（任意）例：https://..." value={item.link || ""}
            onChange={(e) => { const n = [...notice.items]; n[i] = { ...n[i], link: e.target.value }; setNotice({ ...notice, items: n }); }} />
        </div>
      ))}
      {(notice.items || []).length < 5 && (
        <button style={s.addBtn} onClick={() => setNotice({ ...notice, items: [...notice.items, { text: "", link: "" }] })}>
          ＋ お知らせを追加
        </button>
      )}
      <button className="submit-btn" style={{ marginTop: 8, width: "100%", padding: 14, border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer" }} onClick={handleSave} disabled={saving}>
        {saving ? "保存中..." : "設定を保存する"}
      </button>
    </div>
  );
}

const s = {
  card: { background: "white", borderRadius: 12, padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: 10 },
  input: { padding: "10px 14px", border: "1.5px solid #D0DDD9", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" },
  addBtn: { padding: "12px", background: "white", border: "1.5px dashed #D0DDD9", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#5A7370", width: "100%" },
};
