import { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import { doc, updateDoc, collection, getDocs, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { User, Ban, ShieldOff } from "lucide-react";
import { THEME } from "../constants";
import "../animations.css";
import heic2any from "heic2any";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [bannedUsers, setBannedUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // "all" | "banned"
  const [banReason, setBanReason] = useState("");
  const [showBanConfirm, setShowBanConfirm] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const [usersSnap, bannedSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "bannedUsers")),
      ]);
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setBannedUsers(bannedSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetch();
  }, []);

  const handleBan = async () => {
    if (!selectedUser) return;
    try {
      await setDoc(doc(db, "bannedUsers", selectedUser.id), {
        uid: selectedUser.id,
        email: selectedUser.email || "",
        displayName: selectedUser.displayName || "",
        reason: banReason.trim() || "理由なし",
        bannedAt: new Date().toISOString(),
      });
      setBannedUsers(prev => [...prev, {
        id: selectedUser.id,
        uid: selectedUser.id,
        email: selectedUser.email || "",
        displayName: selectedUser.displayName || "",
        reason: banReason.trim() || "理由なし",
        bannedAt: new Date().toISOString(),
      }]);
      setBanReason("");
      setShowBanConfirm(false);
      setSelectedUser(null);
      setEditingUser(null);
      alert(`「${selectedUser.displayName}」の利用を停止しました。`);
    } catch (err) {
      alert("利用停止に失敗しました: " + err.message);
    }
  };

  const handleUnban = async (bannedUser) => {
    if (!window.confirm(`「${bannedUser.displayName}」の利用停止を解除しますか？`)) return;
    try {
      await deleteDoc(doc(db, "bannedUsers", bannedUser.id));
      setBannedUsers(prev => prev.filter(b => b.id !== bannedUser.id));
      alert("利用停止を解除しました。");
    } catch (err) {
      alert("解除に失敗しました: " + err.message);
    }
  };

  const isBanned = (userId) => bannedUsers.some(b => b.id === userId);

  if (loading) return <p style={{ padding: 24 }}>読み込み中...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700 }}>登録者一覧</h2>

      {/* タブ */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className={`tag-tab-btn ${activeTab === "all" ? "tag-active-tab" : ""}`}
          style={{ padding: "7px 18px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          onClick={() => setActiveTab("all")}
        >
          全ユーザー（{users.length}人）
        </button>
        <button
          className={`tag-tab-btn ${activeTab === "banned" ? "tag-active-tab" : ""}`}
          style={{ padding: "7px 18px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          onClick={() => setActiveTab("banned")}
        >
          ブラックリスト（{bannedUsers.length}人）
        </button>
      </div>

      {/* 全ユーザータブ */}
      {activeTab === "all" && (
        <>
          <input style={s.input} placeholder="名前・メールアドレスで検索..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
          {users.filter(u => !userSearch || u.displayName?.includes(userSearch) || u.email?.includes(userSearch)).map(u => (
            <div key={u.id} className="event-hover-card" style={{ ...s.listItem, cursor: "pointer", opacity: isBanned(u.id) ? 0.5 : 1 }} onClick={() => { setSelectedUser(u); setShowBanConfirm(false); setBanReason(""); }}>
              {u.avatarUrl ? <img src={u.avatarUrl} alt="avatar" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} /> : <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#F9EAED", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><User size={20} color={THEME} /></div>}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  {u.displayName}
                  {isBanned(u.id) && <span style={{ fontSize: 10, background: "#FFEBEE", color: "#C62828", fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>利用停止中</span>}
                </div>
                <div style={{ fontSize: 11, color: "#5A7370" }}>{u.email} · {u.gakuin} {u.gakukei} · {u.gakunen}</div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ブラックリストタブ */}
      {activeTab === "banned" && (
        <>
          {bannedUsers.length === 0 ? (
            <p style={{ color: "#5A7370", fontSize: 14, textAlign: "center", padding: "32px 0" }}>ブラックリストは空です</p>
          ) : bannedUsers.map(b => (
            <div key={b.id} style={{ ...s.listItem, border: "1.5px solid #FFCDD2" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#FFEBEE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Ban size={20} color="#C62828" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#C62828" }}>{b.displayName}</div>
                <div style={{ fontSize: 11, color: "#5A7370" }}>{b.email}</div>
                <div style={{ fontSize: 11, color: "#E53935", marginTop: 2 }}>理由：{b.reason}</div>
                <div style={{ fontSize: 10, color: "#9AADA8", marginTop: 1 }}>停止日：{new Date(b.bannedAt).toLocaleDateString("ja-JP")}</div>
              </div>
              <button
                style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "1.5px solid #5A7370", color: "#5A7370", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                onClick={() => handleUnban(b)}
              >
                <ShieldOff size={13} /> 停止解除
              </button>
            </div>
          ))}
        </>
      )}

      {/* ユーザー編集モーダル */}
      {selectedUser && (
        <div style={s.modal}>
          <div style={{ ...s.modalCard, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>ユーザー情報の編集</h3>
              <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20 }} onClick={() => { setSelectedUser(null); setEditingUser(null); setShowBanConfirm(false); setBanReason(""); }}>✕</button>
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
                      let file = e.target.files?.[0]; if (!file) return;
                      if (file.type === "image/heic" || file.type === "image/heif" || file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif")) {
                        try {
                          const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
                          file = new File([converted], file.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg"), { type: "image/jpeg" });
                        } catch { alert("画像の変換に失敗しました。"); return; }
                      }
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
              { label: "自己紹介", key: "bio" },
            ].map(({ label, key }) => (
              <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={s.formLabel}>{label}</label>
                {key === "bio" ? (
                  <textarea
                    style={{ ...s.input, minHeight: 80, resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }}
                    value={editingUser?.bio ?? selectedUser.bio ?? ""}
                    onChange={e => setEditingUser(prev => ({ ...(prev || selectedUser), bio: e.target.value }))}
                  />
                ) : (
                  <input style={s.input} value={editingUser?.[key] ?? selectedUser[key] ?? ""} onChange={e => setEditingUser(prev => ({ ...(prev || selectedUser), [key]: e.target.value }))} />
                )}
              </div>
            ))}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="tag-tab-btn" style={{ flex: 1, padding: 12, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={() => { setSelectedUser(null); setEditingUser(null); setShowBanConfirm(false); }}>キャンセル</button>
              <button className="submit-btn" style={{ flex: 1, padding: 12, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={async () => {
                if (!editingUser) { setSelectedUser(null); setEditingUser(null); return; }
                await updateDoc(doc(db, "users", selectedUser.id), editingUser);
                setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, ...editingUser } : u));
                setSelectedUser(null); setEditingUser(null);
                alert("保存しました！");
              }}>保存する</button>
            </div>

            {/* 利用停止セクション */}
            <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: 16, marginTop: 4 }}>
              {isBanned(selectedUser.id) ? (
                <button
                  type="button"
                  style={{ width: "100%", padding: "10px", background: "none", border: "1.5px solid #5A7370", color: "#5A7370", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  onClick={() => handleUnban(bannedUsers.find(b => b.id === selectedUser.id))}
                >
                  <ShieldOff size={14} /> 利用停止を解除する
                </button>
              ) : (
                <>
                  {!showBanConfirm ? (
                    <button
                      type="button"
                      style={{ width: "100%", padding: "10px", background: "none", border: "1.5px solid #E53935", color: "#E53935", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                      onClick={() => setShowBanConfirm(true)}
                    >
                      <Ban size={14} /> このユーザーを利用停止にする
                    </button>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <label style={s.formLabel}>停止理由（任意）</label>
                      <input style={s.input} placeholder="例：規約違反、不適切な投稿など" value={banReason} onChange={e => setBanReason(e.target.value)} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" className="tag-tab-btn" style={{ flex: 1, padding: 10, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }} onClick={() => setShowBanConfirm(false)}>キャンセル</button>
                        <button type="button" style={{ flex: 1, padding: 10, background: "#E53935", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }} onClick={handleBan}>利用停止にする</button>
                      </div>
                    </div>
                  )}
                </>
              )}
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