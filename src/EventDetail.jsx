import { THEME, GENRE_STYLES, GENRE_EMOJI, GENRE_TAGS, TARGET_TAGS, CAMPUS_TAGS, STYLE_TAGS, ORGANIZER_TAGS, BG_COLOR, GAKUIN } from "./constants";
import { useState, useEffect } from "react";
import { db, storage, auth } from "./firebase";
import { doc, updateDoc, arrayUnion, arrayRemove, increment, setDoc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { MapPin, Calendar, Clock, Users, ChevronRight, User, Heart, CalendarCheck, Paperclip, Plus, ImageIcon } from "lucide-react";

export default function EventDetail({ event: initialEvent, onBack }) {
  const [event, setEvent] = useState(initialEvent);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // 編集用state
  const [editTitle, setEditTitle] = useState(event.title || "");
  const [editDetail, setEditDetail] = useState(event.detail || "");
  const [editDate, setEditDate] = useState(event.date || "");
  const [editStartTime, setEditStartTime] = useState(event.startTime || "");
  const [editEndTime, setEditEndTime] = useState(event.endTime || "");
  const [editLocation, setEditLocation] = useState(event.location || "");
  const [editDeadline, setEditDeadline] = useState(event.deadline || "");
  const [editDeadlineTime, setEditDeadlineTime] = useState(event.deadlineTime || "");
  const [editApplyLabel, setEditApplyLabel] = useState(event.applyLabel || "");
  const [editApplyLink, setEditApplyLink] = useState(event.applyLink || "");
  const [editImage, setEditImage] = useState(null);
  const [editPreview, setEditPreview] = useState(event.imageUrl || null);
  const [editGenre, setEditGenre] = useState(event.tags?.genre || "");
  const [editTargets, setEditTargets] = useState(event.tags?.targets || []);
  const [editCampus, setEditCampus] = useState(event.tags?.campus || "");
  const [editStyle, setEditStyle] = useState(event.tags?.style || "");
  const [editOrganizer, setEditOrganizer] = useState(event.tags?.organizer || "");
  const [liked, setLiked] = useState(false);
  const [joining, setJoining] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [joinCount, setJoinCount] = useState(0);

  // 💡 募集者（詳細表示用 ＆ 編集時のカード選択用）
  const [organizer, setOrganizer] = useState(null);
  const [editOrganizerType, setEditOrganizerType] = useState(event.organizerType || "personal");
  const [editOrganizerId, setEditOrganizerId] = useState(event.organizerId || event.createdBy);
  const [userProfile, setUserProfile] = useState(null);
  const [userGroups, setUserGroups] = useState([]);

  const [editTargetGakuin, setEditTargetGakuin] = useState(event.targetGakuin || []);
  const [editTargetGakukei, setEditTargetGakukei] = useState(event.targetGakukei || []);
  const [editContact, setEditContact] = useState(event.contact || "");

  // 💡 権限判定に createdByPersonal（個人UID）も考慮するように修正
  const isOwner = auth.currentUser?.uid === event.createdByPersonal || auth.currentUser?.uid === event.createdBy;
  const cs = GENRE_STYLES[event.tags?.genre] || { bg:"#F5F5F5" };

  useEffect(() => {
    window.scrollTo(0, 0);
    const fab = document.querySelector('[data-fab]');
    if (fab) fab.style.display = 'none';
    return () => { if (fab) fab.style.display = 'flex'; };
  }, []);

  useEffect(() => {
    const recordView = async () => {
      if (!auth.currentUser || !event.id) return;
      const uid = auth.currentUser.uid;
      const now = new Date();
      const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const viewRef = doc(db, "eventStats", event.id);
      const snap = await getDoc(viewRef);
      if (snap.exists()) {
        const data = snap.data();
        setLikeCount((data.likes || []).length);
        setJoinCount((data.joins || []).length);
        setLiked((data.likes || []).some(l => l.uid === uid));
        setJoining((data.joins || []).some(j => j.uid === uid));
        
        const views = (data.views || []).filter(v => new Date(v.date) > weekAgo);
        const alreadyViewed = views.some(v => v.uid === uid);
        if (!alreadyViewed) {
          await updateDoc(viewRef, {
            views: arrayUnion({ uid, date: now.toISOString() }),
          });
        }
      } else {
        await setDoc(viewRef, {
          eventId: event.id,
          deadline: event.deadline || null,
          views: [{ uid, date: now.toISOString() }],
          likes: [],
          joins: [],
        });
      }
    };
    recordView();
  }, [event.id]);

  // 詳細表示用の募集者データを動的にフェッチ
  useEffect(() => {
    const fetchOrganizer = async () => {
      const type = event.organizerType || "personal";
      const id = event.organizerId || event.createdBy;
      if (!id) return;

      try {
        if (type === "group") {
          const orgSnap = await getDoc(doc(db, "groups", id));
          if (orgSnap.exists()) setOrganizer({ type: "group", ...orgSnap.data() });
        } else {
          const orgSnap = await getDoc(doc(db, "users", id));
          if (orgSnap.exists()) setOrganizer({ type: "personal", ...orgSnap.data() });
        }
      } catch (err) {
        console.error("主催者の取得に失敗しました:", err);
      }
    };
    fetchOrganizer();
  }, [event.organizerType, event.organizerId, event.createdBy]);

  // 編集モード開示時に、コンテキストに必要なデータを先回り取得
  useEffect(() => {
    if (!editMode || !auth.currentUser) return;
    
    const fetchEditContextData = async () => {
      const uid = auth.currentUser.uid;
      try {
        const userSnap = await getDoc(doc(db, "users", uid));
        if (userSnap.exists()) setUserProfile({ id: userSnap.id, ...userSnap.data() });

        const groupsRef = collection(db, "groups");
        const q = query(groupsRef, where("members", "array-contains", uid));
        const querySnapshot = await getDocs(q);
        setUserGroups(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("編集用コンテキストの取得に失敗しました:", err);
      }
    };
    fetchEditContextData();
  }, [editMode]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setEditImage(file);
    setEditPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    // 💡 必須バリデーションの条件を作成画面（PostEvent）と完全に統一
    if (!editTitle.trim() || !editDetail.trim() || !editDate || !editLocation.trim() || !editDeadline || !editGenre || !editTargets.length || !editCampus) {
      alert("必須項目を全て入力してください");
      return;
    }

    setSaving(true);
    try {
      let imageUrl = event.imageUrl;
      if (editImage) {
        const storageRef = ref(storage, `events/${Date.now()}_${editImage.name}`);
        await uploadBytes(storageRef, editImage);
        imageUrl = await getDownloadURL(storageRef);
      }

      const currentUid = auth.currentUser.uid;
      const selectedGroup = userGroups.find(g => g.id === editOrganizerId);

      // 💡 変更された選択カードに基づく情報の更新
      const finalOrganizerType = editOrganizerType === "group" ? "group" : "personal";
      const finalOrganizerId = editOrganizerType === "group" && selectedGroup ? selectedGroup.id : currentUid;
      const organizerName = editOrganizerType === "group" && selectedGroup ? selectedGroup.displayName : (userProfile?.displayName || auth.currentUser.email);
      const organizerAvatar = editOrganizerType === "group" && selectedGroup ? (selectedGroup.avatarUrl || "") : (userProfile?.avatarUrl || "");

      const updated = {
        title: editTitle.trim(),
        detail: editDetail.trim(),
        date: editDate,
        startTime: editStartTime,
        endTime: editEndTime,
        location: editLocation.trim(),
        deadline: editDeadline,
        deadlineTime: editDeadlineTime,
        applyLabel: editApplyLabel || "参加を申し込む",
        applyLink: editApplyLink,
        imageUrl,
        tags: {
          genre: editGenre,
          targets: editTargets,
          campus: editCampus,
          style: editStyle,
          organizer: editOrganizer, // ⑤の募集者種別タグ
        },
        targetGakuin: editTargetGakuin,
        targetGakukei: editTargetGakukei,
        contact: editContact,
        organizerType: finalOrganizerType,
        organizerId: finalOrganizerId,
        createdBy: finalOrganizerId, // 互換性維持
        organizerName,
        organizerAvatar,
      };

      await updateDoc(doc(db, "events", event.id), updated);
      setEvent(prev => ({ ...prev, ...updated }));
      setEditMode(false);
      alert("イベント情報を更新しました！");
    } catch (err) {
      alert("保存に失敗しました: " + err.message);
    }
    setSaving(false);
  };
  
  const handleLike = async () => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const viewRef = doc(db, "eventStats", event.id);
    const snap = await getDoc(viewRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const likes = data.likes || [];
    
    if (liked) {
      const newLikes = likes.filter(l => l.uid !== uid);
      await updateDoc(viewRef, { likes: newLikes });
      setLiked(false);
      setLikeCount(c => c - 1);
    } else {
      const newLikes = [...likes, { uid, date: new Date().toISOString() }];
      await updateDoc(viewRef, { likes: newLikes });
      setLiked(true);
      setLikeCount(c => c + 1);
    }
  };

  const handleJoin = async () => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const viewRef = doc(db, "eventStats", event.id);
    const snap = await getDoc(viewRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const joins = data.joins || [];

    if (joining) {
      const newJoins = joins.filter(j => j.uid !== uid);
      await updateDoc(viewRef, { joins: newJoins });
      setJoining(false);
      setJoinCount(c => c - 1);
    } else {
      const newJoins = [...joins, { uid, date: new Date().toISOString() }];
      await updateDoc(viewRef, { joins: newJoins });
      setJoining(true);
      setJoinCount(c => c + 1);
    }
  };

  const handleNavigateToGroupCreation = () => {
    if (window.confirm("グループの新規作成・参加はマイページの「グループ管理」から行えます。一度編集をキャンセルしてマイページへ移動しますか？")) {
      window.location.href = "/mypage";
    }
  };

  // ─── 編集モード画面 ───
  if (editMode) return (
    <div style={s.container}>
      <div style={{ maxWidth:720, margin:"0 auto", width:"100%", padding:"8px 16px" }}>
        <button style={s.backBtn} onClick={() => setEditMode(false)}>← 編集をキャンセル</button>
      </div>
      <div style={s.editBox}>
        <h2 style={s.editTitle}>イベントを編集</h2>

        {/* 募集者選択カードセクション（必須） */}
        <div style={s.editSection}>
          <label style={s.editLabel}>募集者を変更 <span style={s.required}>必須</span></label>
          <div style={s.cardGrid}>
            <div 
              style={{
                ...s.organizerCard,
                borderColor: editOrganizerType === "personal" ? THEME : "#D0DDD9",
                background: editOrganizerType === "personal" ? "#FFF5F7" : "white",
              }}
              onClick={() => setEditOrganizerType("personal")}
            >
              <div style={s.cardAvatarWrap}>
                {userProfile?.avatarUrl ? <img src={userProfile.avatarUrl} style={s.cardAvatar} alt="user" /> : <User size={16} color={THEME} />}
              </div>
              <div style={s.cardInfo}>
                <div style={s.cardName}>{userProfile?.displayName || "あなた (個人)"}</div>
                <div style={s.cardTypeTag}>個人名義</div>
              </div>
            </div>

            {userGroups.map((group) => (
              <div 
                key={group.id}
                style={{
                  ...s.organizerCard,
                  borderColor: (editOrganizerType === "group" && editOrganizerId === group.id) ? THEME : "#D0DDD9",
                  background: (editOrganizerType === "group" && editOrganizerId === group.id) ? "#FFF5F7" : "white",
                }}
                onClick={() => {
                  setEditOrganizerType("group");
                  setEditOrganizerId(group.id);
                }}
              >
                <div style={s.cardAvatarWrap}>
                  {group.avatarUrl ? <img src={group.avatarUrl} style={s.cardAvatar} alt="group" /> : <Users size={16} color="#9AADA8" />}
                </div>
                <div style={s.cardInfo}>
                  <div style={s.cardName}>{group.displayName}</div>
                  <div style={s.cardTypeTag}>{group.groupType || "サークル"}</div>
                </div>
              </div>
            ))}

            <div style={{ ...s.organizerCard, ...s.dashedCard }} onClick={handleNavigateToGroupCreation}>
              <div style={s.plusIconWrap}><Plus size={16} color="#5A7370" /></div>
              <div style={s.cardInfo}>
                <div style={{ ...s.cardName, color: "#5A7370" }}>新しいグループ</div>
                <div style={{ ...s.cardTypeTag, color: "#7A9591" }}>作成・参加はこちら</div>
              </div>
            </div>
          </div>
        </div>

        {/* 画像 */}
        <div style={s.editSection}>
          <label style={s.editLabel}>イベント画像（任意）</label>
          <div style={s.imageArea} onClick={() => document.getElementById("editImgInput").click()}>
            {editPreview ? (
              <img src={editPreview} alt="preview" style={s.previewImg} />
            ) : (
              <div style={s.imagePlaceholder}>
                <ImageIcon size={32} color="#BACFCB" />
                <span style={s.imagePlaceholderText}>タップして画像を変更</span>
              </div>
            )}
            <input id="editImgInput" type="file" accept="image/*" style={{ display:"none" }} onChange={handleImageChange} />
          </div>
        </div>

        {/* タイトル */}
        <div style={s.editMode ? s.editSection : s.editSection}>
          <label style={s.editLabel}>イベント名 <span style={s.required}>必須</span></label>
          <input style={s.input} value={editTitle} onChange={e => setEditTitle(e.target.value)} />
        </div>

        {/* 詳細 */}
        <div style={s.editSection}>
          <label style={s.editLabel}>イベント詳細 <span style={s.required}>必須</span></label>
          <textarea style={s.textarea} value={editDetail} onChange={e => setEditDetail(e.target.value)} rows={4} />
        </div>

        {/* 日時 */}
        <div style={s.editSection}>
          <label style={s.editLabel}>イベント日時 <span style={s.required}>必須</span></label>
          <input style={s.input} type="date" value={editDate} onChange={e => setEditDate(e.target.value)} onFocus={e => e.target.showPicker()} />
          <div style={s.timeRow}>
            <div style={{ flex:1 }}>
              <label style={{ ...s.editLabel, fontSize:11 }}>開始時刻（任意）</label>
              <input style={s.input} type="time" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} onFocus={e => e.target.showPicker()} />
            </div>
            <div style={s.timeSep}>〜</div>
            <div style={{ flex:1 }}>
              <label style={{ ...s.editLabel, fontSize:11 }}>終了時刻（任意）</label>
              <input style={s.input} type="time" value={editEndTime} onChange={e => setEditEndTime(e.target.value)} onFocus={e => e.target.showPicker()} />
            </div>
          </div>
        </div>

        {/* 場所 */}
        <div style={s.editSection}>
          <label style={s.editLabel}>場所 <span style={s.required}>必須</span></label>
          <input style={s.input} value={editLocation} onChange={e => setEditLocation(e.target.value)} />
        </div>

        {/* 締切 */}
        <div style={s.editSection}>
          <label style={s.editLabel}>申し込み締切日 <span style={s.required}>必須</span></label>
          <input style={s.input} type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} onFocus={e => e.target.showPicker()} />
          <div style={{ marginTop: 8 }}>
            <label style={{ ...s.editLabel, fontSize:11 }}>申し込み締切時間（任意）</label>
            <input style={s.input} type="time" value={editDeadlineTime} onChange={e => setEditDeadlineTime(e.target.value)} onFocus={e => e.target.showPicker()} />
          </div>
        </div>

        {/* ジャンル */}
        <div style={s.editSection}>
          <label style={s.editLabel}>① ジャンル <span style={s.required}>必須</span></label>
          <div style={s.optionGrid}>
            {GENRE_TAGS.map(t => (
              <button key={t} style={{ ...s.tagBtn, ...(editGenre === t ? s.tagBtnActive : {}) }} onClick={() => setEditGenre(t)}>{t}</button>
            ))}
          </div>
        </div>

        {/* 対象者 */}
        <div style={s.editSection}>
          <label style={s.editLabel}>② 対象学年 <span style={s.required}>必須・複数選択可</span></label>
          <div style={s.optionGrid}>
            {TARGET_TAGS.map(t => (
              <button key={t} style={{ ...s.tagBtn, ...(editTargets.includes(t) ? s.tagBtnActive : {}) }}
                onClick={() => setEditTargets(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}>{t}</button>
            ))}
          </div>
        </div>
        
        {/* 対象学院 */}
        <div style={s.editSection}>
          <label style={s.editLabel}>対象学院（任意・複数選択可）</label>
          <div style={s.optionGrid}>
            {Object.keys(GAKUIN).map(g => (
              <button
                key={g}
                style={{ ...s.tagBtn, ...(editTargetGakuin.includes(g) ? s.tagBtnActive : {}) }}
                onClick={() => setEditTargetGakuin(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* 対象学系 */}
        {editTargetGakuin.length > 0 && (
          <div style={s.editSection}>
            <label style={s.editLabel}>対象学系（任意・複数選択可）</label>
            <div style={s.optionGrid}>
              {editTargetGakuin.flatMap(g => GAKUIN[g]).map(k => (
                <button
                  key={k}
                  style={{ ...s.tagBtn, ...(editTargetGakukei.includes(k) ? s.tagBtnActive : {}) }}
                  onClick={() => setEditTargetGakukei(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* キャンパス */}
        <div style={s.editSection}>
          <label style={s.editLabel}>③ キャンパス <span style={s.required}>必須</span></label>
          <div style={s.optionGrid}>
            {CAMPUS_TAGS.map(t => (
              <button key={t} style={{ ...s.tagBtn, ...(editCampus === t ? s.tagBtnActive : {}) }} onClick={() => setEditCampus(t)}>{t}</button>
            ))}
          </div>
        </div>

        {/* 参加スタイル */}
        <div style={s.editSection}>
          <label style={s.editLabel}>④ 参加スタイル（任意）</label>
          <div style={s.optionGrid}>
            {STYLE_TAGS.map(t => (
              <button key={t} style={{ ...s.tagBtn, ...(editStyle === t ? s.tagBtnActive : {}) }} onClick={() => setEditStyle(prev => prev === t ? "" : t)}>{t}</button>
            ))}
          </div>
        </div>

        {/* 募集者 */}
        <div style={s.editSection}>
          <label style={s.editLabel}>⑤ 募集者種別（任意）</label>
          <div style={s.optionGrid}>
            {ORGANIZER_TAGS.map(t => (
              <button key={t} style={{ ...s.tagBtn, ...(editOrganizer === t ? s.tagBtnActive : {}) }} onClick={() => setEditOrganizer(prev => prev === t ? "" : t)}>{t}</button>
            ))}
          </div>
        </div>

        {/* 申し込み */}
        <div style={s.editSection}>
          <label style={s.editLabel}>申し込みボタン名（任意）</label>
          <input style={s.input} placeholder="参加を申し込む" value={editApplyLabel} onChange={e => setEditApplyLabel(e.target.value)} />
        </div>
        <div style={s.editSection}>
          <label style={s.editLabel}>申し込みリンク（任意）</label>
          <input style={s.input} type="url" placeholder="https://forms.gle/..." value={editApplyLink} onChange={e => setEditApplyLink(e.target.value)} />
        </div>

        <div style={s.editSection}>
          <label style={s.editLabel}>お問い合わせ先（任意）</label>
          <input
            style={s.input}
            placeholder="例：example@m.isct.ac.jp / @Twitter"
            value={editContact}
            onChange={e => setEditContact(e.target.value)}
          />
        </div>

        <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? "保存中..." : "保存する"}
        </button>
      </div>
    </div>
  );

  // ─── 通常詳細表示モード ───
  const remaining = event.capacity - (event.participants?.length ?? 0);

  return (
    <div style={s.container}>
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={onBack}>← 戻る</button>
        {isOwner && (
          <button style={s.editEventBtn} onClick={() => setEditMode(true)}>✏️ 編集</button>
        )}
      </div>

      {event.imageUrl ? (
        <img src={event.imageUrl} alt={event.title} style={s.heroImg} />
      ) : (
        <div style={{ ...s.heroPlaceholder, background: cs.bg }}>
          <span style={{ fontSize:64 }}>{GENRE_EMOJI[event.tags?.genre] || "📌"}</span>
        </div>
      )}

      <div style={s.body}>
        <h1 style={s.title}>{event.title}</h1>
        {event.tags?.genre && (
          <span style={{ ...s.tag, background:"#F9EAED", color:"#88203a" }}>{event.tags.genre}</span>
        )}

        <div style={s.infoBox}>
          <div style={s.infoRow}>
            <span style={s.infoIcon}><Calendar size={20} color="#88203a" /></span>
            <div>
              <div style={s.infoLabel}>イベント日時</div>
              <div style={s.infoValue}>{event.date}{event.startTime && ` ${event.startTime}`}{event.endTime && ` 〜 ${event.endTime}`}</div>
            </div>
          </div>
          <div style={s.infoDivider} />
          <div style={s.infoRow}>
            <span style={s.infoIcon}><MapPin size={20} color="#88203a" /></span>
            <div>
              <div style={s.infoLabel}>場所</div>
              <div style={s.infoValue}>{event.location}</div>
            </div>
          </div>
          {event.deadline && (
            <>
              <div style={s.infoDivider} />
              <div style={s.infoRow}>
                <span style={s.infoIcon}><Clock size={20} color="#88203a" /></span>
                <div>
                  <div style={s.infoLabel}>申し込み締切</div>
                  <div style={s.infoValue}>{event.deadline}{event.deadlineTime && ` ${event.deadlineTime}`}</div>
                </div>
              </div>
            </>
          )}
          {event.capacity && (
            <>
              <div style={s.infoDivider} />
              <div style={s.infoRow}>
                <span style={s.infoIcon}><Users size={20} color="#88203a" /></span>
                <div>
                  <div style={s.infoLabel}>残り枠</div>
                  <div style={s.infoValue}>{remaining} / {event.capacity} 人</div>
                </div>
              </div>
            </>
          )}
        </div>

        {event.tags && (
          <div style={s.tagsBox}>
            {event.tags.genre && <span style={s.tagChip}>{event.tags.genre}</span>}
            {event.tags.targets?.map(t => <span key={t} style={s.tagChip}>{t}</span>)}
            {event.tags.campus && <span style={s.tagChip}>{event.tags.campus}</span>}
            {event.tags.style && <span style={s.tagChip}>{event.tags.style}</span>}
            {event.tags.organizer && <span style={s.tagChip}>{event.tags.organizer}</span>}
          </div>
        )}

        {event.detail && (
          <div style={s.section}>
            <h2 style={s.sectionTitle}>イベント詳細</h2>
            <p style={s.detailText}>{event.detail}</p>
          </div>
        )}

        {event.attachments?.length > 0 && (
          <div style={s.section}>
            <h2 style={s.sectionTitle}>添付資料</h2>
            <div style={s.attachList}>
              {event.attachments.map((a, i) => (
                <a key={i} href={a.url} target="_blank" rel="noreferrer" style={s.attachItem}>
                  <Paperclip size={14} style={{ marginRight:4 }} /> {a.name}
                </a>
              ))}
            </div>
          </div>
        )}

        {event.applyLink && (
          <a href={event.applyLink} target="_blank" rel="noreferrer" style={s.applyBtn}>
            {event.applyLabel || "参加を申し込む"} →
          </a>
        )}
        
        {organizer && (
          <div style={s.section}>
            <h2 style={s.sectionTitle}>募集者</h2>
            <div
              style={{ display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}
              onClick={() => {
                if (organizer.type === "group") {
                  window.location.href = `/groups/${event.organizerId || event.createdBy}`;
                } else {
                  if (auth.currentUser?.uid === event.createdByPersonal || auth.currentUser?.uid === event.createdBy) {
                    window.location.href = '/mypage';
                  } else {
                    window.location.href = `/users/${event.createdByPersonal || event.createdBy}`;
                  }
                }
              }}
            >
              {organizer.avatarUrl ? (
                <img src={organizer.avatarUrl} alt="avatar" style={{ width:44, height:44, borderRadius:"50%", objectFit:"cover" }} />
              ) : (
                <div style={{ width:44, height:44, borderRadius:"50%", background:"#F4F6F5", border:"1px solid #E0E8E7", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {organizer.type === "group" ? <Users size={20} color="#9AADA8" /> : <User size={18} color={THEME} />}
                </div>
              )}
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:"#111" }}>{organizer.displayName}</div>
                <div style={{ fontSize:12, color:"#5A7370", marginTop:3 }}>
                  {organizer.type === "group" ? (
                    <span style={s.organizerBadge}>{organizer.groupType || "サークル"}</span>
                  ) : (
                    <span>{organizer.gakuin} {organizer.gakukei}</span>
                  )}
                </div>
              </div>
              <ChevronRight size={18} color="#B0BEC5" style={{ marginLeft:"auto" }} />
            </div>
          </div>
        )}

        {/* お問い合わせ */}
        {event.contact && (
          <div style={s.section}>
            <h2 style={s.sectionTitle}>お問い合わせ先</h2>
            <p style={s.detailText}>{event.contact}</p>
          </div>
        )}
            
        {/* いいね・参加予定ボタン */}
        {auth.currentUser && (
          <div style={s.actionRow}>
            <button
              style={{ ...s.actionBtn, ...(liked ? s.actionBtnActive : {}) }}
              onClick={handleLike}
            >
              {liked ? <Heart size={16} fill="#E53935" color="#E53935" /> : <Heart size={16} />} いいね {likeCount > 0 && likeCount}
            </button>
            <button
              style={{ ...s.actionBtn, ...(joining ? s.actionBtnJoinActive : {}) }}
              onClick={handleJoin}
            >
              {joining ? <CalendarCheck size={16} color="#2E7D32" /> : <CalendarCheck size={16} />} 参加予定 {joinCount > 0 && joinCount}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  container: { background:BG_COLOR, minHeight:"100vh" },
  topBar: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 16px", maxWidth:720, margin:"0 auto", width:"100%" },
  backBtn: { display:"flex", alignItems:"center", gap:6, background:"none", border:"none", color:THEME, fontSize:14, fontWeight:700, cursor:"pointer", padding:"8px 0" },
  editEventBtn: { background:THEME, color:"white", border:"none", borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer" },
  heroImg: { height: window.innerWidth > 768 ? 400 : "auto", width: window.innerWidth > 768 ? "auto" : "calc(100% - 28px)", objectFit:"cover", display:"block", margin: window.innerWidth > 768 ? "0 auto" : "0 14px", maxWidth: "100%", borderRadius: 12 },
  heroPlaceholder: { height: window.innerWidth > 768 ? 400 : "auto", width: window.innerWidth > 768 ? "auto" : "calc(100% - 28px)", aspectRatio:"16/9", margin: window.innerWidth > 768 ? "0 auto" : "0 14px", display:"flex", alignItems:"center", justifyContent:"center", borderRadius: 12 },
  body: { padding:"20px 16px", maxWidth:720, margin:"0 auto", display:"flex", flexDirection:"column", gap:16 },
  title: { fontSize:24, fontWeight:900, color:"#111", lineHeight:1.3, margin:0 },
  tag: { display:"inline-block", fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:999, width:"fit-content" },
  infoBox: { background:"white", borderRadius:12, padding:"16px", boxShadow:"0 2px 8px rgba(0,0,0,0.07)", display:"flex", flexDirection:"column", gap:12 },
  infoRow: { display:"flex", alignItems:"flex-start", gap:12 },
  infoIcon: { fontSize:20, flexShrink:0 },
  infoLabel: { fontSize:11, color:"#5A7370", fontWeight:700, marginBottom:2 },
  infoValue: { fontSize:15, fontWeight:700, color:"#111" },
  infoDivider: { height:1, background:"#F0F0F0" },
  tagsBox: { display:"flex", flexWrap:"wrap", gap:6 },
  tagChip: { background:"#F9EAED", color:THEME, fontSize:12, fontWeight:700, padding:"4px 10px", borderRadius:999 },
  section: { background:"white", borderRadius:12, padding:"16px", boxShadow:"0 2px 8px rgba(0,0,0,0.07)" },
  sectionTitle: { fontSize:14, fontWeight:700, color:"#5A7370", margin:"0 0 10px" },
  detailText: { fontSize:14, color:"#1A2E2B", lineHeight:1.8, whiteSpace:"pre-wrap", margin:0 },
  attachList: { display:"flex", flexDirection:"column", gap:8 },
  attachItem: { fontSize:13, color:THEME, padding:"8px 12px", background:"#F9EAED", borderRadius:8, textDecoration:"none", fontWeight:600 },
  applyBtn: { display:"block", textAlign:"center", padding:"16px", background:THEME, color:"white", borderRadius:12, fontSize:16, fontWeight:900, textDecoration:"none", boxShadow:`0 4px 16px rgba(136,32,58,0.4)` },
  editBox: { background:"white", borderRadius:16, padding:"24px 20px", margin:"16px", boxShadow:"0 2px 12px rgba(0,0,0,0.08)", display:"flex", flexDirection:"column", gap:16, maxWidth:720, marginLeft:"auto", marginRight:"auto" },
  editTitle: { fontSize:18, fontWeight:900, color:"#111", margin:0 },
  editSection: { display:"flex", flexDirection:"column", gap:8 },
  editLabel: { fontSize:12, fontWeight:700, color:"#5A7370", letterSpacing:"0.05em" },
  required: { background:"#E53935", color:"white", fontSize:10, fontWeight:700, padding:"1px 5px", borderRadius:3, marginLeft:4 },
  input: { width:"100%", padding:"11px 13px", border:"1.5px solid #D0DDD9", borderRadius:8, fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" },
  textarea: { width:"100%", padding:"11px 13px", border:"1.5px solid #D0DDD9", borderRadius:8, fontSize:14, outline:"none", fontFamily:"inherit", resize:"vertical", lineHeight:1.6 },
  imageArea: { width:"100%", height:180, borderRadius:12, overflow:"hidden", border:"2px dashed #D0DDD9", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", background:BG_COLOR },
  previewImg: { width:"100%", height:"100%", objectFit:"cover" },
  imagePlaceholder: { display:"flex", flexDirection:"column", alignItems:"center", gap:8 },
  imagePlaceholderText: { fontSize:13, color:"#5A7370", fontWeight:600 },
  timeRow: { display:"flex", alignItems:"flex-end", gap:8, marginTop:8 },
  timeSep: { fontSize:16, color:"#5A7370", paddingBottom:10, flexShrink:0 },
  optionGrid: { display:"flex", flexWrap:"wrap", gap:8 },
  tagBtn: { padding:"6px 12px", borderRadius:999, border:"1.5px solid #D0DDD9", background:"white", fontSize:12, fontWeight:600, color:"#5A7370", cursor:"pointer" },
  tagBtnActive: { background:THEME, color:"white", border:`1.5px solid ${THEME}` },
  saveBtn: { padding:14, background:THEME, color:"white", border:"none", borderRadius:8, fontSize:15, fontWeight:700, cursor:"pointer", width:"100%" },
  actionRow: { display:"flex", gap:12 },
  actionBtn: { flex:1, padding:"12px", background:"white", border:"1.5px solid #D0DDD9", borderRadius:12, fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 },
  actionBtnActive: { background:"#FFF0F0", border:"1.5px solid #E53935", color:"#E53935" },
  actionBtnJoinActive: { background:"#E8F5E9", border:"1.5px solid #2E7D32", color:"#2E7D32" },

  cardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginTop: 4 },
  organizerCard: { display: "flex", alignItems: "center", gap: 10, padding: "10px", borderRadius: 8, border: "2px solid #D0DDD9", cursor: "pointer", transition: "all 0.2s" },
  dashedCard: { borderStyle: "dashed", background: "#F4F6F5", borderColor: "#BACFCB" },
  cardAvatarWrap: { width: 32, height: 32, borderRadius: "50%", background: "#F4F6F5", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 },
  plusIconWrap: { width: 32, height: 32, borderRadius: "50%", background: "#E0E8E7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardAvatar: { width: "100%", height: "100%", objectFit: "cover" },
  cardInfo: { minWidth: 0, flex: 1 },
  cardName: { fontSize: 12, fontWeight: 700, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" },
  cardTypeTag: { fontSize: 10, color: "#7A9591", marginTop: 1, textAlign: "left" },
  organizerBadge: { background: "#F4F6F5", color: "#5A7370", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4 },
};