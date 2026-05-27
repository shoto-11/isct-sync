import { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { GENRE_STYLES, GENRE_EMOJI } from "./constants";
import { BG_COLOR, COMMON_BACK_BTN_STYLE, THEME } from "./constants";
import { User, Building2, Calendar, MapPin, Bell, BellOff, ArrowLeft, Info } from "lucide-react";
import "./animations.css";

export default function UserProfile({ userId, onBack, onEventSelect }) {
  const [profile, setProfile] = useState(null);
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const currentUid = auth.currentUser?.uid;
  const isOwn = currentUid === userId;

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      const snap = await getDoc(doc(db, "users", userId));
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        const followers = data.followers || [];
        if (currentUid) setIsFollowing(followers.includes(currentUid));
      }
      const q = query(collection(db, "events"), where("createdBy", "==", userId));
      const eventSnap = await getDocs(q);
      const now = new Date();
      const events = eventSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(event => {
          if (!event.deadline) return true;
          const deadlineStr = event.deadlineTime
            ? `${event.deadline}T${event.deadlineTime}`
            : `${event.deadline}T23:59`;
          return new Date(deadlineStr) >= now;
        });
      events.sort((a, b) => new Date(b.date) - new Date(a.date));
      setMyEvents(events);
      setLoading(false);
    };
    fetchData();
  }, [userId]);

  const handleFollow = async () => {
    if (!currentUid) return;
    const userRef = doc(db, "users", userId);
    const myRef = doc(db, "users", currentUid);
    if (isFollowing) {
      await updateDoc(userRef, { followers: arrayRemove(currentUid) });
      await updateDoc(myRef, { follows: arrayRemove(userId) });
      setIsFollowing(false);
    } else {
      await updateDoc(userRef, { followers: arrayUnion(currentUid) });
      await updateDoc(myRef, { follows: arrayUnion(userId) });
      setIsFollowing(true);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: BG_COLOR }}>
      <div style={{ fontSize: 14, color: "#5A7370", fontWeight: 600, animation: "pulse 1.5s infinite" }}>読み込み中...</div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  );

  if (!profile) return (
    <div style={{ padding: 40, textAlign: "center", background: BG_COLOR, minHeight: "100vh" }}>
      <p>ユーザーが見つかりませんでした。</p>
    </div>
  );

  return (
    <div style={s.container}>
      {/* ナビバー */}
      <div style={s.navBar}>
        {/* 必要に応じて戻るボタンを有効化 */}
      </div>

      <div style={s.mainContent}>
        {/* プロフィールカード */}
        <div style={s.profileCard}>
          <div style={s.headerRow}>
            {/* アバター */}
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="avatar" style={s.avatar} />
            ) : (
              <div style={s.avatarPlaceholder}>
                <User size={36} color={THEME} />
              </div>
            )}

            {/* 名前・所属 */}
            <div style={s.titleInfo}>
              <div style={s.badgeRow}>
                <span style={s.typeBadge}>{profile.gakunen || "在学生"}</span>
              </div>
              <h1 style={s.name}>{profile.displayName}</h1>
              <div style={{ fontSize: 13, color: "#7A9591", marginTop: 2 }}>
                {profile.gakuin}{profile.gakukei ? ` / ${profile.gakukei}` : ""}
              </div>
              {profile.organization && (
                <div style={{ fontSize: 12, color: "#5A7370", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <Building2 size={12} /> {profile.organization}
                </div>
              )}
            </div>

            {/* 通知ボタン */}
            {!isOwn && auth.currentUser && (
              <button
                className={`tag-tab-btn ${isFollowing ? "" : "tag-active-tab"}`}
                onClick={handleFollow}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 20px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {isFollowing ? <BellOff size={14} /> : <Bell size={14} />}
              </button>
            )}
          </div>

          {/* 自己紹介 */}
          <div style={s.descriptionSection}>
            <div style={s.sectionHeader}>
              <Info size={14} />
              <span>プロフィール</span>
            </div>
            <div style={s.descriptionBody}>
              {profile.bio ? (
                profile.bio.split("\n").map((line, i) => (
                  <span key={i}>{line}<br /></span>
                ))
              ) : (
                <span style={{ color: "#9AADA8", fontStyle: "italic" }}>自己紹介はまだ登録されていません。</span>
              )}
            </div>
          </div>
        </div>

        {/* 主催イベント一覧 */}
        <div style={s.eventSectionHeader}>
          <Calendar size={18} color={THEME} />
          <h2 style={s.sectionTitle}>募集中のイベント</h2>
          <span style={s.countBadge}>{myEvents.length}</span>
        </div>

        {myEvents.length === 0 ? (
          <div style={s.emptyCard}>現在、公開中のイベントはありません。</div>
        ) : (
          <div style={s.eventList}>
            {myEvents.map(event => {
              const style = GENRE_STYLES[event.tags?.genre] || { bg: "#F5F5F5", color: "#5A7370" };
              const emoji = GENRE_EMOJI[event.tags?.genre] || "📌";
              return (
                <div
                  key={event.id}
                  className="event-hover-card"
                  style={s.eventItem}
                  onClick={() => onEventSelect(event)}
                >
                  {event.imageUrl ? (
                    <img src={event.imageUrl} alt="" style={s.eventThumb} />
                  ) : (
                    <div className="card-thumb-placeholder" style={{ ...s.eventThumb, background: style.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, aspectRatio: "1/1" }}>
                      {emoji}
                    </div>
                  )}
                  <div style={s.eventInfo}>
                    <div className="hover-title-underline" style={s.eventTitle}>{event.title}</div>
                    <div style={s.eventMeta}>
                      <div style={s.metaItem}><Calendar size={11} /> {event.date}</div>
                      <div style={s.metaItem}><MapPin size={11} /> {event.location}</div>
                    </div>
                    {event.tags?.genre && (
                      <span style={{ ...s.genreTag, background: style.bg, color: style.color }}>{event.tags.genre}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  container: { background: BG_COLOR, minHeight: "100vh", paddingBottom: 40 },
  navBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 16px",
    maxWidth: 640,
    margin: "0 auto",
    width: "100%"
  },
  mainContent: {
    maxWidth: 640,
    margin: "0 auto",
    padding: "0 16px 16px"
  },
  profileCard: { background: "white", borderRadius: 16, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", marginBottom: 24 },
  headerRow: { display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 20 },
  avatar: { width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid #F4F6F5", flexShrink: 0 },
  avatarPlaceholder: { width: 72, height: 72, borderRadius: "50%", background: "#F9EAED", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  titleInfo: { flex: 1 },
  badgeRow: { marginBottom: 4 },
  typeBadge: { background: THEME, color: "white", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4 },
  name: { fontSize: 19, fontWeight: 700, color: "#111", margin: "0 0 4px" },
  descriptionSection: { background: "#F8FAF9", borderRadius: 12, padding: "14px" },
  sectionHeader: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, color: "#5A7370", marginBottom: 8, letterSpacing: "0.05em" },
  descriptionBody: { fontSize: 13, color: "#334E4B", lineHeight: 1.6, whiteSpace: "pre-wrap" },
  eventSectionHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "0 4px" },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: "#111", margin: 0 },
  countBadge: { background: "#F9EAED", color: THEME, fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999 },
  emptyCard: { background: "white", borderRadius: 12, padding: "32px", textAlign: "center", color: "#9AADA8", fontSize: 13, border: "1.5px dashed #D0DDD9" },
  eventList: { display: "flex", flexDirection: "column", gap: 10 },
  eventItem: { background: "white", borderRadius: 14, padding: "12px", display: "flex", gap: 12, alignItems: "center", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
  eventThumb: { width: 68, height: 68, borderRadius: 10, objectFit: "cover", flexShrink: 0 },
  eventInfo: { flex: 1, minWidth: 0 },
  eventTitle: { fontSize: 14, fontWeight: 800, color: "#111", marginBottom: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  eventMeta: { display: "flex", flexDirection: "row", gap: 12, flexWrap: "wrap", marginBottom: 2 },
  metaItem: { fontSize: 11, color: "#5A7370", display: "flex", alignItems: "center", gap: 4 },
  genreTag: { fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, width: "fit-content" },
};