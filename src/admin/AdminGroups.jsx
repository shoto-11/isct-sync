import { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import { doc, updateDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Users, User, Crown } from "lucide-react";
import { THEME } from "../constants";
import "../animations.css";

export default function AdminGroups() {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMembersData, setGroupMembersData] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupEmail, setEditGroupEmail] = useState("");
  const [editGroupType, setEditGroupType] = useState("");
  const [editGroupDesc, setEditGroupDesc] = useState("");
  const [editGroupTwitter, setEditGroupTwitter] = useState("");
  const [editGroupInstagram, setEditGroupInstagram] = useState("");
  const [editGroupHomepage, setEditGroupHomepage] = useState("");
  const [editGroupAvatar, setEditGroupAvatar] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const [groupsSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, "groups")),
        getDocs(collection(db, "users")),
      ]);
      setGroups(groupsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetch();
  }, []);

  const handleOpenGroup = (group) => {
    setSelectedGroup(group);
    setEditGroupName(group.displayName || "");
    setEditGroupEmail(group.groupEmail || group.email || "");
    setEditGroupType(group.groupType || "サークル");
    setEditGroupDesc(group.description || "");
    setEditGroupTwitter(group.twitterUrl || "");
    setEditGroupInstagram(group.instagramUrl || "");
    setEditGroupHomepage(group.homepageUrl || "");
    setEditGroupAvatar(group.avatarUrl || "");
    const memberIds = group.members || [];
    setGroupMembersData(users.filter(u => memberIds.includes(u.id)));
  };

  const handleSave = async () => {
    if (!editGroupName.trim()) { alert("グループ名を入力してください。"); return; }
    setSaving(true);
    try {
      const updatedFields = {
        displayName: editGroupName.trim(),
        groupEmail: editGroupEmail.trim(), email: editGroupEmail.trim(),
        groupType: editGroupType, description: editGroupDesc.trim(),
        twitterUrl: editGroupTwitter.trim(), instagramUrl: editGroupInstagram.trim(),
        homepageUrl: editGroupHomepage.trim(), avatarUrl: editGroupAvatar,
      };
      await updateDoc(doc(db, "groups", selectedGroup.id), updatedFields);
      setGroups(prev => prev.map(g => g.id === selectedGroup.id ? { ...g, ...updatedFields } : g));
      setSelectedGroup(null);
      alert("グループ情報を更新しました。");
    } catch (err) { alert("保存に失敗しました。"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (groupId, name) => {
    if (!window.confirm(`グループ「${name}」を削除しますか？`)) return;
    await deleteDoc(doc(db, "groups", groupId));
    setGroups(prev => prev.filter(g => g.id !== groupId));
    setSelectedGroup(null);
    alert("削除しました");
  };

  if (loading) return <p style={{ padding: 24 }}>読み込み中...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700 }}>グループ一覧（{groups.length}件）</h2>
      <input style={s.input} placeholder="グループ名・メールで検索..." value={groupSearch} onChange={e => setGroupSearch(e.target.value)} />

      {groups.filter(g => !groupSearch || g.displayName?.includes(groupSearch) || g.email?.includes(groupSearch)).map(g => (
        <div key={g.id} className="event-hover-card" style={{ ...s.listItem, cursor: "pointer" }} onClick={() => handleOpenGroup(g)}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#F9EAED", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
            {g.avatarUrl ? <img src={g.avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : "👥"}
          </div>
          <div style={{ flex: 1 }}>
            <div className="hover-title-underline" style={{ fontSize: 14, fontWeight: 700 }}>{g.displayName}</div>
            <div style={{ fontSize: 11, color: "#5A7370" }}>{g.groupType} · {g.email || "アドレス未登録"} · メンバー{g.members?.length || 0}人</div>
          </div>
          <span style={{ fontSize: 12, color: THEME, fontWeight: 700 }}>詳細 ›</span>
        </div>
      ))}

      {selectedGroup && (
        <div style={s.modal}>
          <div style={{ ...s.modalCard, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>グループ詳細・編集 (管理者)</h3>
              <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20 }} onClick={() => setSelectedGroup(null)}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "#F4F6F5", padding: 16, borderRadius: 12, alignItems: "center" }}>
              {editGroupAvatar ? (
                <img src={editGroupAvatar} alt="avatar" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid white" }} />
              ) : (
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#F9EAED", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white" }}><Users size={32} color={THEME} /></div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <label style={{ padding: "5px 12px", background: "white", border: "1.5px solid #D0DDD9", borderRadius: 6, fontSize: 11, fontWeight: 700, color: "#5A7370", cursor: "pointer" }}>
                  アバターをアップロード
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => {
                    const file = e.target.files?.[0]; if (!file) return;
                    try {
                      alert("アップロード中...");
                      const storageRef = ref(storage, `groups/${selectedGroup.id}/avatar.png`);
                      await uploadBytes(storageRef, file);
                      setEditGroupAvatar(await getDownloadURL(storageRef));
                      alert("完了！（保存で確定）");
                    } catch { alert("失敗しました"); }
                  }} />
                </label>
                {editGroupAvatar && <button type="button" style={{ padding: "5px 12px", background: "#FFEBEE", border: "none", borderRadius: 6, color: "#C62828", fontSize: 11, fontWeight: 700, cursor: "pointer" }} onClick={() => setEditGroupAvatar("")}>画像をクリア</button>}
              </div>
            </div>

            <div style={s.fieldRow}><label style={s.formLabel}>グループ名 <span style={s.required}>必須</span></label><input style={s.input} value={editGroupName} onChange={e => setEditGroupName(e.target.value)} /></div>
            <div style={s.fieldRow}><label style={s.formLabel}>メールアドレス</label><input style={s.input} value={editGroupEmail} onChange={e => setEditGroupEmail(e.target.value)} placeholder="未登録" /></div>

            <div style={s.fieldRow}>
              <label style={s.formLabel}>グループ区分</label>
              <div style={s.optionGrid}>
                {["サークル", "団体", "企業", "その他"].map(t => (
                  <button key={t} type="button" className={`tag-tab-btn ${editGroupType === t ? "tag-active-tab" : ""}`} style={s.tagBtn} onClick={() => setEditGroupType(t)}>{t}</button>
                ))}
              </div>
            </div>

            <div style={s.fieldRow}><label style={s.formLabel}>説明文</label><textarea style={{ ...s.input, height: 70, resize: "vertical", lineHeight: 1.5 }} value={editGroupDesc} onChange={e => setEditGroupDesc(e.target.value)} /></div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, border: "1px solid #E0E8E7", padding: 12, borderRadius: 10, background: "#FAFDFC" }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#5A7370" }}>SNS・外部リンク</span>
              <input style={{ ...s.input, padding: "8px 12px", fontSize: 13 }} placeholder="𝕏 (Twitter) URL" value={editGroupTwitter} onChange={e => setEditGroupTwitter(e.target.value)} />
              <input style={{ ...s.input, padding: "8px 12px", fontSize: 13 }} placeholder="Instagram URL" value={editGroupInstagram} onChange={e => setEditGroupInstagram(e.target.value)} />
              <input style={{ ...s.input, padding: "8px 12px", fontSize: 13 }} placeholder="ホームページ URL" value={editGroupHomepage} onChange={e => setEditGroupHomepage(e.target.value)} />
            </div>

            <div style={s.fieldRow}>
              <label style={s.formLabel}>所属メンバー（{groupMembersData.length}人）</label>
              <div style={{ maxHeight: 150, overflowY: "auto", border: "1px solid #F0F0F0", borderRadius: 8, padding: "4px 8px" }}>
                {groupMembersData.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#9AADA8", textAlign: "center", padding: "8px 0" }}>メンバーはいません</div>
                ) : groupMembersData.map(m => {
                  const isOwner = selectedGroup.createdBy === m.id;
                  return (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #F8FAF9" }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#F9EAED", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {m.avatarUrl ? <img src={m.avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <User size={12} color={THEME} />}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{m.displayName || "名前なし"}</span>
                      {isOwner && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#FFF3E0", color: "#E65100", fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4 }}><Crown size={12} color="#E65100" fill="#E65100" /> 代表者</span>}
                      <span style={{ fontSize: 11, color: "#7A9591", marginLeft: "auto" }}>{m.gakuin} / {m.gakunen}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="tag-tab-btn" type="button" style={{ flex: 1, padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }} onClick={() => setSelectedGroup(null)}>キャンセル</button>
              <button className="submit-btn" type="button" style={{ flex: 1, padding: 12, background: THEME, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }} onClick={handleSave} disabled={saving}>{saving ? "保存中..." : "グループ変更を保存"}</button>
            </div>
            <button type="button" style={{ width: "100%", padding: "10px", background: "none", border: "1px solid #E53935", color: "#E53935", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", marginTop: 4 }}
              onClick={() => handleDelete(selectedGroup.id, selectedGroup.displayName)}>
              ⚠️ このグループを強制削除する
            </button>
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
  formLabel: { fontSize: 12, fontWeight: 700, color: "#5A7370", marginTop: 2 },
  fieldRow: { display: "flex", flexDirection: "column", gap: 4 },
  required: { background: "#E53935", color: "white", fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 3, marginLeft: 4 },
  optionGrid: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 },
  tagBtn: { padding: "5px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: "pointer" },
};
