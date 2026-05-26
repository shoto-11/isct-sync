import { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import { doc, updateDoc, collection, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { User } from "lucide-react";
import { THEME } from "../constants";
import "../animations.css";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(collection(db, "users"));
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <p style={{ padding: 24 }}>読み込み中...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700 }}>登録者一覧（{users.length}人）</h2>
      <input style={s.input} placeholder="名前・メールアドレスで検索..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />

      {users.filter(u => !userSearch || u.displayName?.includes(userSearch) || u.email?.includes(userSearch)).map(u => (
        <div key={u.id} className="event-hover-card" style={{ ...s.listItem, cursor: "pointer" }} onClick={() => setSelectedUser(u)}>
          {u.avatarUrl ? <img src={u.avatarUrl} alt="avatar" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} /> : <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#F9EAED", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><User size={20} color={THEME} /></div>}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{u.displayName}</div>
            <div style={{ fontSize: 11, color: "#5A7370" }}>{u.email} · {u.gakuin} {u.gakukei} · {u.gakunen}</div>
          </div>
        </div>
      ))}

      {selectedUser && (
        <div style={s.modal}>
          <div style={{ ...s.modalCard, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>ユーザー情報の編集</h3>
              <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20 }} onClick={() => { setSelectedUser(null); setEditingUser(null); }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "#F4F6F5", padding: 16, borderRadius: 12, alignItems: "center" }}>
              {(editingUser?.avatarUrl ?? selectedUser.avatarUrl) ? (
                <img src={editingUser?.avatarUrl ?? selectedUser.avatarUrl} alt="avatar" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "2px solid white", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }} />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#F9EAED", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white" }}><User size={36} color={THEME} /></div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <label style={{ padding: "6px 12px", background: "white", border: "1.5px solid #D0DDD9", borderRadius: 6, fontSize: 12, fontWeight: 700, color: "#5A7370", cursor: "pointer" }}>
                  画像をアップロード
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => {
                    const file = e.target.files?.[0]; if (!file) return;
                    try {
                      alert("アップロード中...");
                      const storageRef = ref(storage, `avatars/${selectedUser.id}/${file.name}`);
                      await uploadBytes(storageRef, file);
                      const url = await getDownloadURL(storageRef);
                      setEditingUser({ ...(editingUser || selectedUser), avatarUrl: url });
                      alert("完了！（保存するで確定します）");
                    } catch (err) { alert("失敗しました"); }
                  }} />
                </label>
                {(editingUser?.avatarUrl ?? selectedUser.avatarUrl) && (
                  <button type="button" style={{ padding: "6px 12px", background: "#FFEBEE", border: "none", borderRadius: 6, color: "#C62828", fontSize: 12, fontWeight: 700, cursor: "pointer" }} onClick={() => setEditingUser({ ...(editingUser || selectedUser), avatarUrl: "" })}>画像をクリア</button>
                )}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={s.formLabel}>画像URL（直接指定）</label>
              <input style={s.input} placeholder="https://example.com/avatar.jpg" value={editingUser?.avatarUrl ?? selectedUser.avatarUrl ?? ""} onChange={e => setEditingUser({ ...(editingUser || selectedUser), avatarUrl: e.target.value })} />
            </div>

            {[
              { label: "表示名", key: "displayName" },
              { label: "メール", key: "email" },
              { label: "学院", key: "gakuin" },
              { label: "学系", key: "gakukei" },
              { label: "学年", key: "gakunen" },
              { label: "性別", key: "gender" },
            ].map(({ label, key }) => (
              <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={s.formLabel}>{label}</label>
                <input style={s.input} value={editingUser?.[key] ?? selectedUser[key] ?? ""} onChange={e => setEditingUser(prev => ({ ...(prev || selectedUser), [key]: e.target.value }))} />
              </div>
            ))}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="tag-tab-btn" style={{ flex: 1, padding: 12, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={() => { setSelectedUser(null); setEditingUser(null); }}>キャンセル</button>
              <button className="submit-btn" style={{ flex: 1, padding: 12, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={async () => {
                if (!editingUser) { setSelectedUser(null); setEditingUser(null); return; }
                await updateDoc(doc(db, "users", selectedUser.id), editingUser);
                setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, ...editingUser } : u));
                setSelectedUser(null); setEditingUser(null);
                alert("保存しました！");
              }}>保存する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  listItem: { background: "white", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  input: { padding: "10px 14px", border: "1.5px solid #D0DDD9", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" },
  modal: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  modalCard: { background: "white", borderRadius: 16, padding: "20px", width: "100%", maxWidth: 540, display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" },
  formLabel: { fontSize: 11, fontWeight: 700, color: "#5A7370" },
};
