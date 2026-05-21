/**
 * GroupManage.jsx
 * マイページからグループを選択したときに表示するグループ管理画面
 * - グループ情報の表示・編集（表示名・アイコン・種別）※ 代表者のみ編集可能
 * - メンバー一覧
 * - 代表者によるメンバー脱退（キック）機能
 * - 代表者権限の他のメンバーへの譲渡機能
 * - グループから脱退
 */

import { useState, useEffect } from "react";
import { db, storage } from "./firebase";
import { doc, getDoc, updateDoc, arrayRemove } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { BG_COLOR } from "./constants";
import { User, Camera, LogOut, ShieldAlert, UserMinus, Award, Users, Edit2, X, Crown } from "lucide-react"; // 💡 Crown を追加
const THEME = "#88203a";

export default function GroupManage({ group, currentUserId, onBack, onChanged }) {
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [editMode, setEditMode] = useState(false);

  // 編集用ステート
  const [editName, setEditName] = useState(group.displayName || "");
  const [editType, setEditType] = useState(group.groupType || "サークル");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(group.avatarUrl || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 脱退・操作確認用
  const [confirmLeave, setConfirmLeave] = useState(false);

  // 💡 権限チェック：現在のユーザーがこのグループの「代表者」かどうか
  const isLeader = group.createdBy === currentUserId;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [group.id]);

  useEffect(() => {
    setEditName(group.displayName || "");
    setEditType(group.groupType || "サークル");
    setAvatarPreview(group.avatarUrl || null);
    setAvatarFile(null);
  }, [group]);

  useEffect(() => {
    const fetchMembers = async () => {
      const ids = group.members || [];
      const snaps = await Promise.all(ids.map((id) => getDoc(doc(db, "users", id))));
      setMembers(snaps.filter((s) => s.exists()).map((s) => ({ id: s.id, ...s.data() })));
      setLoadingMembers(false);
    };
    fetchMembers();
  }, [group.id, group.members]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setError("");
    if (!editName.trim()) { setError("表示名を入力してください"); return; }
    
    setSaving(true);
    try {
      let avatarUrl = group.avatarUrl || "";
      if (avatarFile) {
        const storageRef = ref(storage, `groups/${group.id}/avatar.png`);
        await uploadBytes(storageRef, avatarFile);
        avatarUrl = await getDownloadURL(storageRef);
      }

      await updateDoc(doc(db, "groups", group.id), {
        displayName: editName.trim(),
        groupType: editType,
        avatarUrl: avatarUrl,
      });

      setEditMode(false);
      setAvatarFile(null);
      onChanged();
    } catch (err) {
      console.error(err);
      setError("保存に失敗しました: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(group.displayName || "");
    setEditType(group.groupType || "サークル");
    setAvatarPreview(group.avatarUrl || null);
    setAvatarFile(null);
    setEditMode(false);
    setError("");
  };

  const handleKickMember = async (targetMember) => {
    if (!window.confirm(`本当に「${targetMember.displayName}」さんをこのグループから脱退させますか？`)) return;
    setError("");
    try {
      await updateDoc(doc(db, "groups", group.id), {
        members: arrayRemove(targetMember.id),
      });
      await updateDoc(doc(db, "users", targetMember.id), {
        groups: arrayRemove(group.id),
      });
      alert(`${targetMember.displayName}さんを脱退させました。`);
      onChanged();
    } catch (err) {
      setError("メンバーの脱退処理に失敗しました: " + err.message);
    }
  };

  const handleTransferLeadership = async (targetMember) => {
    if (!window.confirm(`本当に「${targetMember.displayName}」さんに代表者権限を譲渡しますか？\n譲渡すると、あなたはこのグループの一般メンバーとなり、メンバー削除などの管理操作ができなくなります。`)) return;
    setError("");
    try {
      await updateDoc(doc(db, "groups", group.id), {
        createdBy: targetMember.id
      });
      alert(`代表者権限を ${targetMember.displayName} さんに譲渡しました。`);
      onChanged();
    } catch (err) {
      setError("権限の譲渡に失敗しました: " + err.message);
    }
  };

  const handleLeave = async () => {
    if (isLeader && group.members.length > 1) {
      alert("あなたは代表者です。グループを脱退する前に、他のメンバーに代表者権限を譲渡してください。");
      setConfirmLeave(false);
      return;
    }
    try {
      await updateDoc(doc(db, "groups", group.id), {
        members: arrayRemove(currentUserId),
      });
      await updateDoc(doc(db, "users", currentUserId), {
        groups: arrayRemove(group.id),
      });
      onChanged();
    } catch (err) {
      setError("脱退に失敗しました: " + err.message);
    }
  };
  // 📄 ⭐【ここを新規追加】メンバーの非同期読み込みが終わるまで、画面の描画を完全にブロック！
  if (loadingMembers) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F4F6F5" }}>
        <div style={{ fontSize: 14, color: "#5A7370", fontWeight: 600, animation: "pulse 1.5s infinite" }}>
          グループ情報を読み込み中...
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </div>
    );
  }
  
  return (
    <div style={s.container}>
      {/* ヘッダー */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>← 戻る</button>
        <h1 style={s.headerTitle}>グループ管理</h1>
        <div style={{ width: 44 }} />
      </div>

      <div style={s.body}>
        {error && <div style={s.errorBox}>{error}</div>}

        {/* グループ基本情報カード */}
        <div style={s.infoCardRelative}>
          {/* 代表者のみ、カードの右上に絶対配置 */}
          {isLeader && (
            <button 
              style={editMode ? s.cardCloseBtn : s.cardEditBtn} 
              onClick={() => editMode ? handleCancelEdit() : setEditMode(true)}
            >
              {editMode ? (
                <>
                  <X size={13} />
                  <span>閉じる</span>
                </>
              ) : (
                <>
                  <Edit2 size={12} />
                  <span>編集</span>
                </>
              )}
            </button>
          )}

          {editMode ? (
            <div style={s.editForm}>
              {/* アイコン編集 */}
              <div style={s.avatarRow}>
                <div style={s.avatarWrap} onClick={() => !saving && document.getElementById("groupAvatarEdit").click()}>
                  {avatarPreview ? (
                    <img src={avatarPreview} style={s.avatar} alt="Preview" />
                  ) : (
                    <div style={s.avatarPlaceholder}>
                      <Users size={28} color="#9AADA8" />
                    </div>
                  )}
                  <div style={s.avatarEditBtnBadge}>
                    <Camera size={13} color="white" />
                  </div>
                  <input id="groupAvatarEdit" type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} disabled={saving} />
                </div>
                
                <div style={{ flex: 1 }}>
                  <label style={s.label}>グループ名 / サークル名</label>
                  <input style={s.input} value={editName} onChange={(e) => setEditName(e.target.value)} disabled={saving} placeholder="サークル名を入力" />
                </div>
              </div>

              {/* 種別 */}
              <div style={{ marginTop: 4 }}>
                <label style={s.label}>グループ区分</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  {["サークル", "団体", "企業", "null"].map((t) => {
                    const label = t === "null" ? "その他" : t;
                    return (
                      <button 
                        type="button"
                        key={t}
                        style={{ 
                          padding: "8px 16px", borderRadius: 8, 
                          border: `1.5px solid ${editType === label ? THEME : "#D0DDD9"}`, 
                          background: editType === label ? THEME : "white", 
                          color: editType === label ? "white" : "#5A7370", 
                          fontSize: 12, fontWeight: 600, cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                        onClick={() => setEditType(label)}
                        disabled={saving}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <button style={s.cancelBtn} onClick={handleCancelEdit} disabled={saving}>キャンセル</button>
                <button style={s.saveBtn} onClick={handleSave} disabled={saving || !editName.trim()}>
                  {saving ? "保存中..." : "保存する"}
                </button>
              </div>
            </div>
          ) : (
            /* ── 通常表示モード ── */
            <div style={s.groupInfo}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#F4F6F5", border: "1px solid #E0E8E7", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {group.avatarUrl ? (
                  <img src={group.avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Avatar" />
                ) : (
                  <Users size={32} color="#9AADA8" />
                )}
              </div>
              <div style={{ paddingRight: 68 }}>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: "#111", margin: "0 0 4px" }}>{group.displayName}</h2>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={s.viewBadge}>{group.groupType || "サークル"}</span>
                  <span style={{ fontSize: 12, color: "#7A9591" }}>{group.groupEmail}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* メンバー一覧セクション */}
        <div style={s.card}>
          <h3 style={s.sectionTitle}>メンバー（{members.length}人）</h3>
          {loadingMembers ? (
            <p style={s.loading}>読み込み中...</p>
          ) : (
            <div style={s.memberList}>
              {members.map((m) => {
                const isTargetLeader = group.createdBy === m.id;
                return (
                  <div key={m.id} style={s.memberItem}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#F9EAED", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {m.avatarUrl ? <img src={m.avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="User" /> : <User size={18} color={THEME} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.displayName}</span>
                        {m.id === currentUserId && <span style={s.youBadge}>あなた</span>}
                        {isTargetLeader && (
                          <span style={{ ...s.leaderBadge, display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <Crown size={12} color="#E65100" />
                            <span>代表者</span>
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#5A7370" }}>{m.gakuin} / {m.gakukei}</div>
                    </div>

                    {isLeader && m.id !== currentUserId && (
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button 
                          style={{ ...s.smallActionBtn, color: "#007A6E", background: "#E0F2F1" }} 
                          title="代表者権限を譲渡"
                          onClick={() => handleTransferLeadership(m)}
                        >
                          <Award size={14} />
                          <span style={s.btnLabelText}>権限譲渡</span>
                        </button>
                        <button 
                          style={{ ...s.smallActionBtn, color: "#C62828", background: "#FFEBEE" }} 
                          title="グループから脱退させる"
                          onClick={() => handleKickMember(m)}
                        >
                          <UserMinus size={14} />
                          <span style={s.btnLabelText}>脱退</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 脱退セクション */}
        <div style={s.card}>
          {!confirmLeave ? (
            <button style={s.leaveBtn} onClick={() => setConfirmLeave(true)}>
              <LogOut size={16} /> {isLeader ? "グループを解散または脱退する" : "このグループから脱退する"}
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontSize: 14, color: "#C62828", fontWeight: 700 }}>
                {isLeader && group.members.length === 1 
                  ? "あなたが脱退するとメンバーが0人になるため、グループは実質解散状態になります。よろしいですか？"
                  : `本当に「${group.displayName}」から脱退しますか？`}
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button style={s.cancelBtn} onClick={() => setConfirmLeave(false)}>キャンセル</button>
                <button style={{ ...s.saveBtn, background: "#C62828" }} onClick={handleLeave}>脱退する</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  container: { background: BG_COLOR, minHeight: "100vh" },
  header: { background: THEME, padding: "14px 20px", display: "flex", alignItems: "center", justifyItems: "center" },
  backBtn: { background: "none", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  headerTitle: { flex: 1, color: "white", fontSize: 17, fontWeight: 900, margin: 0, textAlign: "center" },
  body: { maxWidth: 720, margin: "0 auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 },
  
  infoCardRelative: { background: "white", borderRadius: 12, padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", position: "relative" },
  card: { background: "white", borderRadius: 12, padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  
  // 💡 【アイコン化】ボタン内部の構成要素を横並びにするためのスタイル調整
  cardEditBtn: { position: "absolute", top: 16, right: 16, border: `1.5px solid ${THEME}`, color: THEME, background: "white", borderRadius: 6, fontSize: 12, fontWeight: 700, padding: "5px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s" },
  cardCloseBtn: { position: "absolute", top: 16, right: 16, border: "none", color: "#5A7370", background: "#F4F6F5", borderRadius: 6, fontSize: 12, fontWeight: 700, padding: "5px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 },

  groupInfo: { display: "flex", alignItems: "center", gap: 20 },
  editForm: { display: "flex", flexDirection: "column", gap: 16 },
  avatarRow: { display: "flex", alignItems: "center", gap: 16 },
  avatarWrap: { position: "relative", width: 72, height: 72, flexShrink: 0, cursor: "pointer" },
  avatar: { width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid #D0DDD9" },
  avatarPlaceholder: { width: "100%", height: "100%", borderRadius: "50%", background: "#F4F6F5", display: "flex", alignItems: "center", justifyContent: "center", border: "2.5px dashed #D0DDD9" },
  avatarEditBtnBadge: { position: "absolute", bottom: 0, right: 0, background: THEME, color: "white", border: "none", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" },
  label: { fontSize: 12, fontWeight: 700, color: "#5A7370", letterSpacing: "0.05em" },
  input: { width: "100%", padding: "12px", border: "1.5px solid #D0DDD9", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "inherit", marginTop: 6, boxSizing: "border-box" },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 12px" },
  memberList: { display: "flex", flexDirection: "column", gap: 12 },
  memberItem: { display: "flex", alignItems: "center", gap: 12, paddingBottom: 4, borderBottom: "1px solid #F5F5F5" },
  
  youBadge: { background: "#F5F5F5", color: "#5A7370", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 999, marginLeft: 4 },
  leaderBadge: { background: "#FFF3E0", color: "#E65100", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 999, marginLeft: 4 },
  viewBadge: { background: "#F9EAED", color: THEME, fontWeight: 700, fontSize: 11, padding: "2px 8px", borderRadius: 4, marginRight: 4 },
  
  smallActionBtn: { display: "flex", alignItems: "center", gap: 4, border: "none", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "opacity 0.2s" },
  btnLabelText: { display: window.innerWidth > 480 ? "inline" : "none" },

  loading: { color: "#5A7370", fontSize: 13 },
  leaveBtn: { background: "none", border: "1.5px solid #C62828", color: "#C62828", borderRadius: 8, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  saveBtn: { flex: 1, padding: "12px 20px", background: THEME, color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  cancelBtn: { flex: 1, padding: "12px 20px", background: "#F4F6F5", color: "#5A7370", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  errorBox: { color: "#C62828", fontSize: 12, background: "#FFEBEE", padding: "10px", borderRadius: 8, fontWeight: 500, marginBottom: 12 },
};