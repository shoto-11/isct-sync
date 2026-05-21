/**
 * GroupManage.jsx
 * マイページからグループを選択したときに表示するグループ管理画面
 * - グループ情報の表示・編集（表示名・アイコン・種別）
 * - メンバー一覧
 * - 【新規】代表者によるメンバー脱退（キック）機能
 * - 【新規】代表者権限の他のメンバーへの譲渡機能
 * - グループから脱退
 */

import { useState, useEffect } from "react";
import { db, storage } from "./firebase";
import { doc, getDoc, updateDoc, arrayRemove } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { BG_COLOR } from "./constants";
import { User, Camera, LogOut, ShieldAlert, UserMinus, Award } from "lucide-react";

const THEME = "#88203a";

export default function GroupManage({ group, currentUserId, onBack, onChanged }) {
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [editMode, setEditMode] = useState(false);

  // 編集用
  const [editName, setEditName] = useState(group.displayName || "");
  const [editType, setEditType] = useState(group.groupType || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(group.avatarUrl || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 脱退・操作確認用
  const [confirmLeave, setConfirmLeave] = useState(false);

  // 💡 権限チェック：現在のユーザーがこのグループの「代表者」かどうか
  const isLeader = group.createdBy === currentUserId;

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
        const storageRef = ref(storage, `groups/${group.id}/avatar`);
        await uploadBytes(storageRef, avatarFile);
        avatarUrl = await getDownloadURL(storageRef);
      }
      await updateDoc(doc(db, "groups", group.id), {
        displayName: editName.trim(),
        groupType: editType,
        avatarUrl,
      });
      setEditMode(false);
      onChanged();
    } catch (err) {
      setError("保存に失敗しました: " + err.message);
    }
    setSaving(false);
  };

  // 💡 【新規機能】代表者が特定のメンバーをグループから強制脱退（キック）させる処理
  const handleKickMember = async (targetMember) => {
    if (!window.confirm(`本当に「${targetMember.displayName}」さんをこのグループから脱退させますか？`)) return;
    
    setError("");
    try {
      // 1. グループの members 配列から対象のUIDを削除
      await updateDoc(doc(db, "groups", group.id), {
        members: arrayRemove(targetMember.id),
      });
      // 2. 対象ユーザー側の users.groups 配列からこのグループIDを削除
      await updateDoc(doc(db, "users", targetMember.id), {
        groups: arrayRemove(group.id),
      });
      
      alert(`${targetMember.displayName}さんを脱退させました。`);
      onChanged(); // 画面を更新
    } catch (err) {
      setError("メンバーの脱退処理に失敗しました: " + err.message);
    }
  };

  // 💡 【新規機能】代表者権限を他のメンバーに譲渡する処理
  const handleTransferLeadership = async (targetMember) => {
    if (!window.confirm(`本当に「${targetMember.displayName}」さんに代表者権限を譲渡しますか？\n譲渡すると、あなたはこのグループの一般メンバーとなり、メンバー削除などの管理操作ができなくなります。`)) return;

    setError("");
    try {
      // グループドキュメントの createdBy を対象のUIDに書き換える
      await updateDoc(doc(db, "groups", group.id), {
        createdBy: targetMember.id
      });

      alert(`代表者権限を ${targetMember.displayName} さんに譲渡しました。`);
      onChanged(); // 画面を更新して権限状態をリセット
    } catch (err) {
      setError("権限の譲渡に失敗しました: " + err.message);
    }
  };

  // 自分が能動的に脱退する処理
  const handleLeave = async () => {
    // 💡 代表者の場合は、メンバーが他にいるなら譲渡してから脱退させる安全策
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

  return (
    <div style={s.container}>
      {/* ヘッダー */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>← 戻る</button>
        <h1 style={s.headerTitle}>グループ管理</h1>
        <button style={s.editToggle} onClick={() => setEditMode(!editMode)}>
          {editMode ? "✕ 閉じる" : "✏️ 編集"}
        </button>
      </div>

      <div style={s.body}>
        {error && <div style={s.errorBox}>{error}</div>}

        {/* グループ基本情報 */}
        <div style={s.card}>
          {editMode ? (
            <div style={s.editForm}>
              {/* アイコン編集 */}
              <div style={s.avatarRow}>
                <div style={s.avatarWrap}>
                  {avatarPreview
                    ? <img src={avatarPreview} style={s.avatar} />
                    : <div style={s.avatarPlaceholder}><span style={{ fontSize: 28 }}>👥</span></div>
                  }
                  <button style={s.avatarEditBtn} onClick={() => document.getElementById("groupAvatarEdit").click()}>
                    <Camera size={13} />
                  </button>
                  <input id="groupAvatarEdit" type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>表示名</label>
                  <input style={s.input} value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
              </div>

              {/* 種別 */}
              <div>
                <label style={s.label}>グループ種別</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                  {["サークル", "団体", "企業", "その他"].map((t) => (
                    <button key={t}
                      style={{ padding: "6px 14px", borderRadius: 999, border: `1.5px solid ${editType === t ? THEME : "#D0DDD9"}`, background: editType === t ? THEME : "white", color: editType === t ? "white" : "#5A7370", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                      onClick={() => setEditType(t)}>{t}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button style={s.cancelBtn} onClick={() => setEditMode(false)}>キャンセル</button>
                <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
                  {saving ? "保存中..." : "保存する"}
                </button>
              </div>
            </div>
          ) : (
            <div style={s.groupInfo}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#F9EAED", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, flexShrink: 0 }}>
                {group.avatarUrl ? <img src={group.avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👥"}
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 4px" }}>{group.displayName}</h2>
                <p style={{ fontSize: 13, color: "#5A7370", margin: 0 }}>{group.groupType}</p>
                <p style={{ fontSize: 12, color: "#5A7370", margin: "4px 0 0" }}>{group.groupEmail}</p>
              </div>
            </div>
          )}
        </div>

        {/* メンバー一覧 */}
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
                      {m.avatarUrl ? <img src={m.avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <User size={18} color={THEME} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.displayName}</span>
                        {m.id === currentUserId && <span style={s.youBadge}>あなた</span>}
                        {isTargetLeader && <span style={s.leaderBadge}>👑 代表者</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#5A7370" }}>{m.gakuin} / {m.gakukei}</div>
                    </div>

                    {/* 💡 自分が代表者、かつ「自分以外の他メンバー」に対して操作ボタンを表示 */}
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
                  ? "あなたが脱退するとメンバーが0人になるため、グループは実質解散状態になります。よかしいですか？"
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
  header: { background: THEME, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 },
  backBtn: { background: "none", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  headerTitle: { flex: 1, color: "white", fontSize: 17, fontWeight: 900, margin: 0, textAlign: "center" },
  editToggle: { background: "rgba(255,255,255,0.2)", border: "none", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "6px 14px", borderRadius: 999 },
  body: { maxWidth: 720, margin: "0 auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 },
  card: { background: "white", borderRadius: 12, padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  groupInfo: { display: "flex", alignItems: "center", gap: 20 },
  editForm: { display: "flex", flexDirection: "column", gap: 16 },
  avatarRow: { display: "flex", alignItems: "center", gap: 16 },
  avatarWrap: { position: "relative", width: 72, height: 72, flexShrink: 0 },
  avatar: { width: 72, height: 72, borderRadius: "50%", objectFit: "cover" },
  avatarPlaceholder: { width: 72, height: 72, borderRadius: "50%", background: "#F9EAED", display: "flex", alignItems: "center", justifyContent: "center" },
  avatarEditBtn: { position: "absolute", bottom: 0, right: 0, background: THEME, color: "white", border: "none", borderRadius: "50%", width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  label: { fontSize: 12, fontWeight: 700, color: "#5A7370", letterSpacing: "0.05em" },
  input: { width: "100%", padding: "10px 12px", border: "1.5px solid #D0DDD9", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "inherit", marginTop: 6 },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 12px" },
  memberList: { display: "flex", flexDirection: "column", gap: 12 },
  memberItem: { display: "flex", alignItems: "center", gap: 12, paddingBottom: 4, borderBottom: "1px solid #F5F5F5" },
  
  youBadge: { background: "#F5F5F5", color: "#5A7370", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 999, marginLeft: 4 },
  leaderBadge: { background: "#FFF3E0", color: "#E65100", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 999, marginLeft: 4 },
  
  // 💡 追加されたアクションボタンのスタイル
  smallActionBtn: { display: "flex", alignItems: "center", gap: 4, border: "none", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "opacity 0.2s" },
  btnLabelText: { display: window.innerWidth > 480 ? "inline" : "none" }, // スマホ画面ではアイコンだけにして省スペース化

  loading: { color: "#5A7370", fontSize: 13 },
  leaveBtn: { background: "none", border: "1.5px solid #C62828", color: "#C62828", borderRadius: 8, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  saveBtn: { flex: 1, padding: "10px 20px", background: THEME, color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  cancelBtn: { flex: 1, padding: "10px 20px", background: "#F4F6F5", color: "#5A7370", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  errorBox: { color: "#C62828", fontSize: 12, background: "#FFEBEE", padding: "10px", borderRadius: 8, fontWeight: 500, marginBottom: 12 },
};