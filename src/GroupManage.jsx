/**
 * GroupManage.jsx
 * マイページからグループを選択したときに表示するグループ管理画面
 * - グループ情報の表示・編集（表示名・アイコン・種別）※ 代表者のみ編集可能
 * - メンバー一覧
 * - 代表者によるメンバー脱退（キック）機能
 * - 代表者権限の他のメンバーへの譲渡機能
 * - グループから脱退
 */
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { auth, db, storage } from "./firebase"; // 💡 auth を追加インポート
import { doc, getDoc, updateDoc, arrayRemove, collection, query, where, getDocs} from "firebase/firestore";// 💡 collection群を追加
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { THEME, GENRE_STYLES, GENRE_EMOJI, BG_COLOR } from "./constants"; // 💡 THEMEなどを constants から統合// 💡 「Instagram」の最後のTは大文字ではなく小文字の「t」にします
import { User, Camera, LogOut, UserMinus, Award, Users, Edit2, X, Crown, Info, Calendar, MapPin, Mail } from "lucide-react";
import { FaXTwitter, FaInstagram } from "react-icons/fa6"; // X(Twitter) と Instagram
import { FaGlobe } from "react-icons/fa"; // 地球儀（ホームページ用）
import "./animations.css";
export default function GroupManage({ onEventSelect }) {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const currentUserId = auth.currentUser?.uid;

  const [group, setGroup] = useState(null);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [editMode, setEditMode] = useState(false);

  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("サークル");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [groupEvents, setGroupEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventTab, setEventTab] = useState("active");
  const [editTwitter, setEditTwitter] = useState("");
  const [editInstagram, setEditInstagram] = useState("");
  const [editHomepage, setEditHomepage] = useState("");

  // isLeader は group が取得できてから計算
  const isLeader = group?.createdBy === currentUserId;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [groupId]);

  // グループ情報をFirestoreから取得
  useEffect(() => {
    const fetch = async () => {
      if (!groupId) return;
      try {
        const snap = await getDoc(doc(db, "groups", groupId));
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          setGroup(data);
          setEditName(data.displayName || "");
          setEditType(data.groupType || "サークル");
          setEditDescription(data.description || "");
          setEditTwitter(data.twitterUrl || "");
          setEditInstagram(data.instagramUrl || "");
          setEditHomepage(data.homepageUrl || "");
          setAvatarPreview(data.avatarUrl || null);
        } else {
          alert("グループが見つかりませんでした。");
          navigate("/mypage");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingGroup(false);
      }
    };
    fetch();
  }, [groupId]);

  // メンバー取得
  useEffect(() => {
    if (!group?.members?.length) {
      setMembers([]);
      setLoadingMembers(false);
      return;
    }
    const fetch = async () => {
      try {
        const q = query(collection(db, "users"), where("__name__", "in", group.members));
        const snap = await getDocs(q);
        setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingMembers(false);
      }
    };
    fetch();
  }, [group]);

  // イベント取得
  useEffect(() => {
    if (!group?.id) return;
    const fetch = async () => {
      setLoadingEvents(true);
      try {
        const q = query(collection(db, "events"), where("organizerId", "==", group.id));
        const snap = await getDocs(q);
        const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        fetched.sort((a, b) => new Date(b.date) - new Date(a.date));
        setGroupEvents(fetched);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingEvents(false);
      }
    };
    fetch();
  }, [group?.id]);

  if (loadingGroup) return <div style={{ background: BG_COLOR, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#5A7370" }}>読み込み中...</div>;
  if (!group) return null;

  if (!currentUserId) { navigate("/login"); return null; }
if (!group.members?.includes(currentUserId)) { navigate("/"); return null; }

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

      // 💡 updateDoc 内に、新しく3つのSNS・リンクフィールドを追加します
      await updateDoc(doc(db, "groups", group.id), {
        displayName: editName.trim(),
        groupType: editType,
        description: editDescription.trim(),
        twitterUrl: editTwitter.trim(),     // 💡 追加
        instagramUrl: editInstagram.trim(), // 💡 追加
        homepageUrl: editHomepage.trim(),   // 💡 追加
        avatarUrl: avatarUrl,
      });

      setEditMode(false);
      setAvatarFile(null);
      navigate("/mypage"); 
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
    setEditDescription(group.description || "");
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
    navigate("/mypage");
  } catch (err) {
    setError("脱退に失敗しました: " + err.message);
  }
};



  // メンバーの非同期読み込みが終わるまで、画面の描画を完全にブロック！
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
        {/* <button style={s.backBtn} onClick={onBack}>← 戻る</button> */}
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
              className={`imp-tab-btn`}
              style={s.cardEditBtn}
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
                        className={`tag-tab-btn ${editType === label ? "tag-active-tab" : ""}`}
                        style={{ 
                          padding: "8px 16px", borderRadius: 8, 
                          fontSize: 12, fontWeight: 600, cursor: "pointer",
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
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                <label style={s.label}>グループ説明文</label>
                <textarea 
                  style={{ ...s.input, minHeight: 90, resize: "vertical", lineHeight: 1.5 }} 
                  value={editDescription} 
                  onChange={e => setEditDescription(e.target.value)} 
                  disabled={saving}
                  placeholder="サークルの紹介文や新歓情報などを記入してください。"
                />
              </div>
              <div style={{ marginTop: 12, display:"flex", flexDirection:"column", gap:8 }}>
                <label style={s.label}>SNS・リンク編集</label>
                <input style={s.input} placeholder="𝕏 (旧Twitter) URL (https://x.com/...)" value={editTwitter} onChange={e => setEditTwitter(e.target.value)} disabled={saving} />
                <input style={s.input} placeholder="Instagram URL (https://instagram.com/...)" value={editInstagram} onChange={e => setEditInstagram(e.target.value)} disabled={saving} />
                <input style={s.input} placeholder="ホームページ URL" value={editHomepage} onChange={e => setEditHomepage(e.target.value)} disabled={saving} />
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <button className="tag-tab-btn" style={s.cancelBtn} onClick={handleCancelEdit} disabled={saving}>キャンセル</button>
                <button className="submit-btn" style={s.saveBtn} onClick={handleSave} disabled={saving || !editName.trim()}>
                  {saving ? "保存中..." : "保存する"}
                </button>
              </div>
            </div>
          ) : (
            /* ── 通常表示モード ── */
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={s.groupInfo}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#F4F6F5", border: "1px solid #E0E8E7", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {group.avatarUrl ? (
                  <img src={group.avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Avatar" />
                ) : (
                  <Users size={32} color="#9AADA8" />
                )}
              </div>
              <div style={{ paddingRight: 68, flex: 1, minWidth: 0 }}>
                <div style={{ marginBottom: 4 }}>
                  <span style={s.viewBadge}>{group.groupType || "サークル"}</span>
                </div>
                <h2 style={{ fontSize: 19, fontWeight: 700, color: "#111", margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.displayName}</h2>
                
                {/* 💡 【ここに綺麗に収まりました！】登録されているSNSのみ、ブランドカラーのホバーボタンを表示 */}
                <div style={{ display: "flex", gap: 10, marginTop: 8, marginBottom: 8 }}>
                  {group.twitterUrl && (
                    <a 
                      href={group.twitterUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      style={{ ...s.snsBtnBase, background: "#111111" }} 
                      title="𝕏 (旧Twitter)"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-3px)";
                        e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                      }}
                    >
                      <FaXTwitter size={14} color="#FFFFFF" />
                    </a>
                  )}
                  
                  {group.instagramUrl && (
                    <a 
                      href={group.instagramUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      style={{ ...s.snsBtnBase, background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" }} 
                      title="Instagram"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-3px)";
                        e.currentTarget.style.boxShadow = "0 6px 12px rgba(220,39,67,0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                      }}
                    >
                      <FaInstagram size={14} color="#FFFFFF" />
                    </a>
                  )}
                  
                  {group.homepageUrl && (
                    <a 
                      href={group.homepageUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      style={{ ...s.snsBtnBase, background: "#0066cc" }} 
                      title="ホームページ"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-3px)";
                        e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,102,204,0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                      }}
                    >
                      <FaGlobe size={14} color="#FFFFFF" />
                    </a>
                  )}
                </div>

                <div style={{ fontSize: 12, color: "#7A9591", display: "flex", alignItems: "center", gap: 4 }}>
                  <Mail size={12} />
                  <span>{group.groupEmail || group.email}</span>
                </div>
              </div>
            </div>

            {/* 💡 【説明文紹介ブロックをGroupProfileと同一に】 */}
            <div style={s.descriptionSection}>
              <div style={s.sectionIconHeader}>
                <Info size={14} />
                <span>サークル紹介</span>
              </div>
              <div style={s.descriptionBody}>
                {group.description ? (
                  group.description.split("\n").map((line, i) => (
                    <span key={i}>{line}<br /></span>
                  ))
                ) : (
                  <span style={{ color: "#9AADA8", fontStyle: "italic" }}>紹介文はまだ登録されていません。</span>
                )}
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
        {/* 主催イベント一覧セクション */}
        <div style={s.card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Calendar size={18} color={THEME} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: 0 }}>主催イベント</h3>
          </div>

          {/* 💡 主催イベント切り替え用タブUI */}
          <div style={{ display: "flex", gap: 12, marginBottom: 12, borderBottom: "1px solid #E2ECEB", paddingBottom: 4 }}>
            <button 
              type="button"
              style={{ background: "none", border: "none", padding: "6px 12px", fontSize: 13, fontWeight: 700, color: eventTab === "active" ? THEME : "#5A7370", borderBottom: eventTab === "active" ? `2px solid ${THEME}` : "2px solid transparent", cursor: "pointer" }}
              onClick={() => setEventTab("active")}
            >
              募集中
            </button>
            <button 
              type="button"
              style={{ background: "none", border: "none", padding: "6px 12px", fontSize: 13, fontWeight: 700, color: eventTab === "expired" ? THEME : "#5A7370", borderBottom: eventTab === "expired" ? `2px solid ${THEME}` : "2px solid transparent", cursor: "pointer" }}
              onClick={() => setEventTab("expired")}
            >
              募集終了
            </button>
          </div>

          {loadingEvents ? (
            <div style={{ fontSize: 12, color: "#5A7370", textAlign: "center", padding: "16px 0" }}>イベントを読み込み中...</div>
          ) : (() => {
            // 💡 現在時刻を基準にして、イベントをリアルタイムに振り分けます
            const now = new Date();
            const filteredEvents = groupEvents.filter(event => {
              if (!event.deadline) return eventTab === "active"; // 締め切りがないものは募集中扱い
              const deadlineStr = event.deadlineTime ? `${event.deadline}T${event.deadlineTime}` : `${event.deadline}T23:59`;
              const isExpired = new Date(deadlineStr) < now;
              return eventTab === "active" ? !isExpired : isExpired;
            });

            if (filteredEvents.length === 0) {
              return (
                <div style={s.emptyEventCard}>
                  {eventTab === "active" ? "現在、募集中の公開イベントはありません。" : "過去に募集終了したイベントはありません。"}
                </div>
              );
            }
return (
              <div style={s.eventListGrid}>
                {filteredEvents.map(event => {
                  const style = GENRE_STYLES[event.tags?.genre] || { bg: "#F5F5F5", color: "#5A7370" };
                  const emoji = GENRE_EMOJI[event.tags?.genre] || "📌";
                  return (
                    <div 
                      key={event.id} 
                      /* 💡 animations.css の共通ホバー・クリックアニメーションクラスを適用！ */
                      className="event-hover-card"
                      style={s.eventCardItem} 
                      onClick={() => onEventSelect && onEventSelect(event)}
                    >
                      {event.imageUrl ? (
                        <img src={event.imageUrl} alt="" style={s.eventThumb} />
                      ) : (
                        /* 💡 画像がない場合の枠。ホバー時に連動して暗くなるよう、styleに「aspectRatio」の目印を追加 */
                        <div className="card-thumb-placeholder" style={{ ...s.eventThumb, background: style.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, aspectRatio: "1/1" }}>
                          {emoji}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                        <div className="hover-title-underline" style={s.eventCardTitle}>
                          {event.title}
                        </div>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          <div style={s.eventMetaRow}><Calendar size={11} /> <span>{event.date}</span></div>
                          <div style={s.eventMetaRow}><MapPin size={11} /> <span>{event.location}</span></div>
                        </div>
                        {event.tags?.genre && (
                          <span style={{ ...s.genreTagLabel, background: style.bg, color: style.color }}>{event.tags.genre}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
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
  headerTitle: { flex: 1, color: "white", fontSize: 17, fontWeight: 700, margin: 0, textAlign: "center" },
  body: { maxWidth: 720, margin: "0 auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 },
  
  infoCardRelative: { background: "white", borderRadius: 12, padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", position: "relative" },
  card: { background: "white", borderRadius: 12, padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  
  // 💡 【アイコン化】ボタン内部の構成要素を横並びにするためのスタイル調整
  cardEditBtn: { position: "absolute", top: 16, right: 16,  borderRadius: 6, fontSize: 12, fontWeight: 700, padding: "5px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s" },

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
  // 💡 スタイルの末尾に以下をそのままコピーして追加してください
  descriptionSection: { background: "#F8FAF9", borderRadius: 12, padding: "14px", marginTop: 4 },
  sectionIconHeader: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, color: "#5A7370", marginBottom: 8, letterSpacing: "0.05em" },
  descriptionBody: { fontSize: 13, color: "#334E4B", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-all" },
  countBadge: { background: "#F9EAED", color: THEME, fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999, marginLeft: 4 },
  emptyEventCard: { background: "white", borderRadius: 12, padding: "24px", textAlign: "center", color: "#9AADA8", fontSize: 13, border: "1.5px dashed #D0DDD9" },
  eventListGrid: { display: "flex", flexDirection: "column", gap: 10 },
  eventCardItem: { background: "#FAFDFC", border: "1px solid #E2ECEB", borderRadius: 12, padding: "12px", display: "flex", gap: 12, alignItems: "center", cursor: "pointer", transition: "transform 0.1s" },
  eventCardTitle: { fontSize: 14, fontWeight: 800, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  eventMetaRow: { fontSize: 11, color: "#5A7370", display: "flex", alignItems: "center", gap: 4 },
  genreTagLabel: { fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, width: "fit-content", marginTop: 2 },
  // 💡 横幅を固定し、フレックスボックス内で絶対に縮まない・はみ出さないよう flexShrink と max-width を固定強化します
  eventThumb: { width: "64px", height: "64px", minWidth: "64px", maxWidth: "64px", borderRadius: 8, objectFit: "cover", flexShrink: 0 },
  snsBtnBase: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    transition: "all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)",
    cursor: "pointer",
    textDecoration: "none",
  },
};