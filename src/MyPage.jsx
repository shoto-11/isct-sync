import { useState, useEffect } from "react";
import { db, auth, storage } from "./firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { GENRE_STYLES, GENRE_EMOJI, GAKUIN, GAKUNEN, GENDER } from "./constants";
import GroupManage from "./GroupManage";
import { BG_COLOR } from "./constants";
import { Camera, Pencil, GraduationCap, BookOpen, User, Building2, Calendar, MapPin, Users, ChevronRight, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./animations.css";

const THEME = "#88203a";

// MyPage の export default function の外、上に定義
function EventCard({ event, onEventSelect, userGroups }) {
  const bg = GENRE_STYLES[event.tags?.genre]?.bg || "#F5F5F5";
  const emoji = GENRE_EMOJI[event.tags?.genre] || "📌";
  const isGroupEvent = userGroups.some((g) => g.id === event.createdBy);
  const THEME = "#88203a";
  return (
    <div className="event-hover-card" style={s.eventItem} onClick={() => onEventSelect(event)}>
      {event.imageUrl ? (
        <img src={event.imageUrl} alt={event.title} style={s.eventThumb} />
      ) : (
        <div className="card-thumb-placeholder" style={{ ...s.eventThumb, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, aspectRatio: "1/1" }}>
          {emoji}
        </div>
      )}
      <div style={s.eventInfo}>
        <div className="hover-title-underline" style={s.eventTitle}>{event.title}</div>
        <div style={{ fontSize: 11, color: "#5A7370", display: "flex", alignItems: "center", gap: 6 }}>
          <Calendar size={11} /> {event.date} <MapPin size={11} /> {event.location}
        </div>
        {isGroupEvent && (
          <span style={{ ...s.groupBadge, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Users size={11} />
            <span>{userGroups.find((g) => g.id === event.createdBy)?.displayName}</span>
          </span>
        )}
      </div>
    </div>
  );
}

export default function MyPage({ user, userGroups = [], onEventSelect, onGroupsChanged }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("events");
  const [editName, setEditName] = useState("");
  const [editGakuin, setEditGakuin] = useState("");
  const [editGakukei, setEditGakukei] = useState("");
  const [editGakunen, setEditGakunen] = useState("");
  const [editGender, setEditGender] = useState("");
  const [likedEvents, setLikedEvents] = useState([]);
  const [joinedEvents, setJoinedEvents] = useState([]);
  const [followCount, setFollowCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [history, setHistory] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null); // GroupManage表示用
  const [editBio, setEditBio] = useState("");

  const uid = auth.currentUser?.uid;
  useEffect(() => {
    // selectedGroup が null になった（詳細から戻ってきた）タイミング、
    // あるいはマイページが最初にマウントされた時にトップにスクロール
    window.scrollTo(0, 0);
  }, [selectedGroup]);

  useEffect(() => {
    const fetchData = async () => {
      if (!uid) return;
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        setFollowCount((data.follows || []).length);
        setFollowerCount((data.followers || []).length);
        setAvatarUrl(data.avatarUrl || null);
        setEditName(data.displayName || "");
        setEditGakuin(data.gakuin || "");
        setEditGakukei(data.gakukei || "");
        setEditGakunen(data.gakunen || "");
        setEditGender(data.gender || "");
        setEditBio(data.bio || "");
      }

      // 自分が投稿したイベント（個人 + グループ両方）
      const groupIds = userGroups.map((g) => g.id);
      const allCreatorIds = [uid, ...groupIds];
      const eventSnaps = await Promise.all(
        allCreatorIds.map((id) => getDocs(query(collection(db, "events"), where("createdBy", "==", id))))
      );
      const allEvents = eventSnaps.flatMap((s) => s.docs.map((d) => ({ id: d.id, ...d.data() })));
      setMyEvents(allEvents);

      // 閲覧履歴
      const histRaw = JSON.parse(localStorage.getItem(`history_${uid}`) || "[]");
      const histIds = histRaw.map(e => e.id).filter(Boolean);
      if (histIds.length > 0) {
        const eventsSnap2 = await getDocs(collection(db, "events"));
        const eventsMap = Object.fromEntries(eventsSnap2.docs.map(d => [d.id, { id: d.id, ...d.data() }]));
        const freshHist = histIds.map(id => eventsMap[id]).filter(Boolean);
        setHistory(freshHist);
      } else {
        setHistory([]);
      }

      // いいね・参加予定
      const statsSnap = await getDocs(collection(db, "eventStats"));
      const eventsSnap = await getDocs(collection(db, "events"));
      const allEventsMap = Object.fromEntries(eventsSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() }]));

      const liked = [], joined = [];
      statsSnap.docs.forEach((d) => {
        const data = d.data();
        const event = allEventsMap[data.eventId];
        if (!event) return;
        if ((data.likes || []).some((l) => l.uid === uid)) liked.push(event);
        if ((data.joins || []).some((j) => j.uid === uid)) joined.push(event);
      });
      setLikedEvents(liked);
      setJoinedEvents(joined);
      setLoading(false);
    };
    fetchData();
  }, [uid, userGroups.length]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const storageRef = ref(storage, `avatars/${uid}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    setAvatarUrl(url);
    await updateDoc(doc(db, "users", uid), { avatarUrl: url });
    setUploading(false);
  };

  const handleSaveProfile = async () => {
    const updated = { displayName: editName, gakuin: editGakuin, gakukei: editGakukei, gakunen: editGakunen, gender: editGender, bio: editBio };
    await updateDoc(doc(db, "users", uid), updated);
    setProfile((prev) => ({ ...prev, ...updated }));
    setEditMode(false);
  };

  if (loading) return <p style={{ padding: 24, color: "#5A7370" }}>読み込み中...</p>;

  return (
    <div style={s.outer}>
      <div style={s.container}>

        {/* ── プロフィールヘッダー ── */}
        <div style={s.profileHeader}>
          <div style={s.avatarWrap}>
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" style={s.avatar} />
              : <div style={s.avatarPlaceholder}><User size={36} color={THEME} /></div>
            }
            <button style={s.avatarEditBtn} onClick={() => document.getElementById("avatarInput").click()}>
              {uploading ? "..." : <Camera size={14} />}
            </button>
            <input id="avatarInput" type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
          </div>

          <div style={s.nameRow}>
            <h2 style={s.name}>{profile?.displayName}</h2>
            <button 
              className="imp-tab-btn" 
              style={{ ...s.editBtn, "--normal-bg": "none", "--normal-color": THEME, "--normal-border": `1px solid ${THEME}` }} 
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? "✕ 閉じる" : <><Pencil size={14} /> 編集</>}
            </button>
          </div>

          <p style={s.email}>{auth.currentUser?.email}</p>
        </div>

        {/* ── プロフィール編集 ── */}
        {editMode && (
          <div style={s.editBox}>
            <h3 style={s.editTitle}>プロフィール編集</h3>
            <div style={s.editSection}>
              <label style={s.editLabel}>表示名</label>
              <input style={s.editInput} value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div style={s.editSection}>
              <label style={s.editLabel}>学院</label>
              <div style={s.optionGrid}>
                {Object.keys(GAKUIN).map((g) => (
                  <button key={g}
                  className={`tag-tab-btn ${editGakuin === g ? "tag-active-tab" : ""}`}
                  style={s.optionBtn}
                  onClick={() => { setEditGakuin(g); setEditGakukei(""); }}>{g}</button>
                ))}
              </div>
            </div>
            {editGakuin && (
              <div style={s.editSection}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={s.editLabel}>学系 <span style={{ fontSize: 10, color: "#9AADA8", fontWeight: "normal", marginLeft: 4 }}>(任意)</span></label>
                  {editGakukei && (
                    <button 
                      className="tag-tab-btn"
                        style={s.optionBtn}
                      onClick={() => setEditGakukei("")}
                    >
                      選択をクリア
                    </button>
                  )}
                </div>
                <div style={s.optionGrid}>
                  {/* 未所属用の明示的なボタン枠 */}
                  <button 
                    type="button" 
                    className={`tag-tab-btn ${editGakukei === "" ? "tag-active-tab" : ""}`}
                    style={s.optionBtn}
                    onClick={() => setEditGakukei("")}
                  >
                    未所属 / その他
                  </button>

                  {GAKUIN[editGakuin].map((k) => {
                    const isSelected = editGakukei === k;
                    return (
                      <button 
                        type="button"
                        key={k} 
                        className={`tag-tab-btn ${editGakukei === k ? "tag-active-tab" : ""}`}
                        style={s.optionBtn}
                        onClick={() => setEditGakukei(isSelected ? "" : k)} // 💡 すでに選択されていれば未選択へトグル
                      >
                        {k}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div style={s.editSection}>
              <label style={s.editLabel}>学年・教職員</label>
              <div style={s.optionGrid}>
                {GAKUNEN.map((g) => (
                  <button key={g} 
                  className={`tag-tab-btn ${editGakunen === g ? "tag-active-tab" : ""}`}
                  style={s.optionBtn}
                    onClick={() => setEditGakunen(g)}>{g}</button>
                ))}
              </div>
            </div>
            <div style={s.editSection}>
              <label style={s.editLabel}>性別</label>
              <div style={s.optionGrid}>
                {GENDER.map((g) => (
                  <button key={g} 
                  className={`tag-tab-btn ${editGender === g ? "tag-active-tab" : ""}`}
                  style={s.optionBtn}
                  onClick={() => setEditGender(g)}>{g}</button>
                ))}
              </div>
            </div>
            <div style={s.editSection}>
              <label style={s.editLabel}>自己紹介（任意）</label>
              <textarea
                style={{ ...s.editInput, minHeight: 80, resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }}
                placeholder="あなたの自己紹介や活動内容を書いてみましょう"
                value={editBio}
                onChange={e => setEditBio(e.target.value)}
              />
            </div>
            <div style={s.editBtnRow}>
              <button className="tag-tab-btn" style={s.cancelBtn} onClick={() => setEditMode(false)}>キャンセル</button>
              <button className="submit-btn" style={s.saveBtn} onClick={handleSaveProfile}>保存する</button>
            </div>
          </div>
        )}

        {/* ── 基本情報 ── */}
        {!editMode && (
  <div style={s.infoBox}>
    {[
      { icon: <Building2 size={14} />, label: "学院", value: profile?.gakuin },
      { icon: <BookOpen size={14} />, label: "学系", value: profile?.gakukei },
      { icon: <GraduationCap size={14} />, label: "学年", value: profile?.gakunen },
      { icon: <User size={14} />, label: "性別", value: profile?.gender },
    ].map(({ icon, label, value }, i, arr) => (
      <div key={label}>
        <div style={s.infoRow}>
          <span style={s.infoLabel}>{icon} {label}</span>
          <span style={s.infoValue}>{value}</span>
        </div>
        {i < arr.length - 1 && <div style={s.infoDivider} />}
      </div>
    ))}

    {/* 自己紹介 */}
    <div style={s.infoDivider} />
    <div style={s.infoRow}>
      <span style={s.infoLabel}><User size={14} /> 自己紹介</span>
    </div>
    {profile?.bio ? (
      <div style={{ fontSize: 13, color: "#1A2E2B", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
        {profile.bio}
      </div>
    ) : (
      <span style={{ fontSize: 13, color: "#9AADA8", fontStyle: "italic" }}>自己紹介はまだ登録されていません。</span>
    )}
  </div>
)}
       {/* ── 🔔 【機能変更】フォロー・フォロワー数から新着通知設定の一覧管理へ ── */}
        <div style={{ background: "white", padding: "14px 20px", borderRadius: 12, margin: "0 14px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}><Bell size={16} color={THEME} /></span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1A2E2B" }}>通知設定中のユーザー</span>
          </div>
          <button 
            type="button"
            className="imp-tab-btn"
            onClick={() => navigate(`/notification-settings/${uid}`)} 
            style={{ ...s.outlineBtn, padding: "6px 14px", fontSize: 12, "--normal-bg": "white", "--normal-color": THEME, "--normal-border": `1.5px solid ${THEME}` }}
          >
            一覧を見る
          </button>
        </div>

        {/* ── グループ一覧 ── */}
        <div style={s.groupSection}>
          <div style={s.groupHeader}>
            <span style={s.groupHeaderTitle}><Users size={16} /> 所属グループ</span>
            <button 
              className="imp-tab-btn" 
              style={{ ...s.addGroupBtn, "--normal-bg": "none", "--normal-color": THEME, "--normal-border": `1px solid ${THEME}` }} 
              onClick={() => navigate("/group-setup")}
            >
              ＋ グループを追加
            </button>
          </div>
          {userGroups.length === 0 ? (
            <div style={s.groupEmpty}>
              <p style={{ fontSize: 13, color: "#5A7370" }}>グループに参加していません</p>
              <button style={s.outlineBtn} onClick={() => navigate("/group-setup")}>グループを作成・参加する</button>
            </div>
          ) : (
            <div style={s.groupList}>
              {userGroups.map((group) => (
                <div 
                  key={group.id} 
                  /* 💡 イベントカードと全く同じ共通ホバー・クリックアニメーションクラスを適用！ */
                  className="event-hover-card" 
                  style={s.groupItem} 
                  onClick={() => navigate(`/groups/${group.id}/manage`)}
                >
                  {/* アイコン画像エリア */}
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#F4F6F5", border: "1px solid #E0E8E7", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {group.avatarUrl ? (
                      <img src={group.avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Avatar" />
                    ) : (
                      <Users size={20} color="#9AADA8" />
                    )}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    {/* 💡 グループ名もホバー時に連動して下線が走るようにクラス名を追加 */}
                    <div className="hover-title-underline" style={{ fontSize: 14, fontWeight: 700 }}>
                      {group.displayName}
                    </div>
                    <div style={{ fontSize: 11, color: "#5A7370" }}>{group.groupType} · {group.members?.length || 0}人</div>
                  </div>
                  
                  {/* 右端の「詳細 ›」 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 2, color: THEME, fontSize: 12, fontWeight: 700 }}>
                    <span>詳細</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── タブ ── */}
        <div style={s.tabs}>
          {[
            { id: "events", label: "募集中" },
            { id: "expired", label: "募集終了" },
            { id: "liked", label: "いいね" },
            { id: "joined", label: "参加予定" },
            { id: "history", label: "閲覧履歴" },
          ].map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button 
                key={t.id} 
                /* 💡 共通アニメーションクラスを追加！ */
                /* 💡 選択中のタブには tag-active-tab を付与してホバー色（ピンク）をスキップさせます */
                className={`tag-tab-btn ${isActive ? "tag-active-tab" : ""}`}
                /* 💡 初期色は元のスタイル（s.tab、s.tabActive）通りに動くよう、CSS変数で安全に渡します */
                style={{ 
                  ...s.tab, 
                  ...(isActive ? s.tabActive : {}),
                  "--normal-bg": "none",
                  "--normal-color": isActive ? THEME : "#5A7370",
                  "--normal-border": "none"
                }}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ── タブコンテンツ ── */}
        <div style={s.tabContent}>
          {(() => {
            const now = new Date();
            // 💡 投稿した全イベント(myEvents)から「募集中(期限内)」を抽出
            const activeEvents = myEvents.filter(event => {
              if (!event.deadline) return true;
              const deadlineStr = event.deadlineTime ? `${event.deadline}T${event.deadlineTime}` : `${event.deadline}T23:59`;
              return new Date(deadlineStr) >= now;
            });

            // 💡 「募集終了(期限切れ)」を抽出
            const expiredEvents = myEvents.filter(event => {
              if (!event.deadline) return false;
              const deadlineStr = event.deadlineTime ? `${event.deadline}T${event.deadlineTime}` : `${event.deadline}T23:59`;
              return new Date(deadlineStr) < now;
            });

            // 💡 タブIDに応じて出し分けるコンテンツスイッチ
            if (activeTab === "events") {
              return activeEvents.length === 0
                ? <p style={s.empty}>まだ募集中のイベントはありません</p>
                : activeEvents.map((event) => <EventCard key={event.id} event={event} onEventSelect={onEventSelect} userGroups={userGroups} />)
            }
            
            if (activeTab === "expired") {
              return expiredEvents.length === 0
                ? <p style={s.empty}>募集終了したイベントはありません</p>
                : expiredEvents.map((event) => <EventCard key={event.id} event={event} onEventSelect={onEventSelect} userGroups={userGroups} />)
            }
          })()}

          {activeTab === "liked" && (
            likedEvents.length === 0
              ? <p style={s.empty}>いいねしたイベントはありません</p>
              : likedEvents.map((event) => <EventCard key={event.id} event={event} onEventSelect={onEventSelect} userGroups={userGroups} />)
          )}
          {activeTab === "joined" && (
            joinedEvents.length === 0
              ? <p style={s.empty}>参加予定のイベントはありません</p>
              : joinedEvents.map((event) => <EventCard key={event.id} event={event} onEventSelect={onEventSelect} userGroups={userGroups} />)
          )}
          {activeTab === "history" && (
            history.length === 0
              ? <p style={s.empty}>閲覧履歴はありません</p>
              : history.map((event) => <EventCard key={event.id} event={event} onEventSelect={onEventSelect} userGroups={userGroups} />)
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  outer: { background: BG_COLOR, minHeight: "100vh", padding: "0 0 40px" },
  container: { maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 },
  profileHeader: { background: "white", padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  avatarWrap: { position: "relative", width: 90, height: 90 },
  avatar: { width: 90, height: 90, borderRadius: "50%", objectFit: "cover" },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: "50%", background: BG_COLOR, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #E0E8E7" },
  avatarEditBtn: { position: "absolute", bottom: 0, right: 0, background: THEME, color: "white", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  nameRow: { display: "flex", alignItems: "center", gap: 8 },
  name: { fontSize: 20, fontWeight: 700, color: "#111", margin: 0 },
  editBtn: { background: "none", border: `1px solid ${THEME}`, color: THEME, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  email: { fontSize: 12, color: "#5A7370", margin: 0 },
  editBox: { background: "white", borderRadius: 12, padding: "20px", margin: "0 14px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: 16 },
  editTitle: { fontSize: 16, fontWeight: 700, color: "#111", margin: 0 },
  editSection: { display: "flex", flexDirection: "column", gap: 8 },
  editLabel: { fontSize: 12, fontWeight: 700, color: "#5A7370", letterSpacing: "0.05em" },
  editInput: { width: "100%", padding: "10px 12px", border: "1.5px solid #D0DDD9", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "inherit" },
  optionGrid: { display: "flex", flexWrap: "wrap", gap: 8 },
  optionBtn: { padding:"6px 14px", borderRadius:999, fontSize:13, fontWeight:600, cursor:"pointer" },
  editBtnRow: { display: "flex", gap: 10, justifyContent: "flex-end" },
  saveBtn: { padding: "10px 24px", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  cancelBtn: { padding: "10px 24px", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  infoBox: { background: "white", margin: "0 14px", borderRadius: 12, padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: 10 },
  infoRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  infoLabel: { fontSize: 13, color: "#5A7370", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 },
  infoValue: { fontSize: 13, fontWeight: 700, color: "#111" },
  infoDivider: { height: 1, background: "#F0F0F0" },
  groupSection: { background: "white", margin: "0 14px", borderRadius: 12, padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  groupHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  groupHeaderTitle: { fontSize: 14, fontWeight: 700, color: "#111", display: "flex", alignItems: "center", gap: 6 },
  addGroupBtn: { background: "none", border: `1px solid ${THEME}`, color: THEME, borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  groupEmpty: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "12px 0" },
  groupList: { display: "flex", flexDirection: "column", gap: 8 },
  groupItem: { display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: "#FAFAFA", cursor: "pointer", border: "1px solid #F0F0F0" },
  outlineBtn: { padding: "8px 20px", background: "white", border: `1.5px solid ${THEME}`, color: THEME, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  tabs: { display: "flex", background: "white", borderBottom: "1px solid #E0E8E7" },
  tab: { flex: 1, padding: "12px 0", border: "none", background: "none", fontSize: 13, fontWeight: 600, color: "#5A7370", cursor: "pointer", borderBottom: "2px solid transparent" },
  tabActive: { color: THEME, borderBottom: `2px solid ${THEME}` },
  tabContent: { padding: "8px 14px" },
  empty: { color: "#5A7370", fontSize: 14, textAlign: "center", padding: "32px 0" },
  eventItem: { background: "white", borderRadius: 10, padding: "12px", display: "flex", gap: 12, alignItems: "center", marginBottom: 8, cursor: "pointer", boxShadow: "0 1px 5px rgba(0,0,0,0.06)" },
  eventThumb: { width: 60, height: 60, borderRadius: 8, objectFit: "cover", flexShrink: 0 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 4 },
  groupBadge: { background: "#F9EAED", color: THEME, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, marginTop: 4, display: "inline-block" },
};