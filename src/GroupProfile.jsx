import { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { GENRE_STYLES, GENRE_EMOJI, THEME, BG_COLOR } from "./constants";
import { Users, Calendar, MapPin, Info, Bell, BellOff, Mail } from "lucide-react";
import { FaXTwitter, FaInstagram } from "react-icons/fa6";
import { FaGlobe } from "react-icons/fa";
import "./animations.css";

export default function GroupProfile({ groupId, onBack, onEventSelect }) {
  const [group, setGroup] = useState(null);
  const [groupEvents, setGroupEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNotifying, setIsNotifying] = useState(false);
  const currentUid = auth.currentUser?.uid;

  useEffect(() => {
    const fetchGroupData = async () => {
      if (!groupId) return;
      setLoading(true);
      try {
        const groupSnap = await getDoc(doc(db, "groups", groupId));
        if (groupSnap.exists()) setGroup(groupSnap.data());

        if (currentUid) {
          const userSnap = await getDoc(doc(db, "users", currentUid));
          if (userSnap.exists()) {
            setIsNotifying((userSnap.data().follows || []).includes(groupId));
          }
        }

        const q = query(collection(db, "events"), where("organizerId", "==", groupId));
        const eventSnap = await getDocs(q);
        const now = new Date();
        const fetchedEvents = eventSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(event => {
            if (!event.deadline) return true;
            const deadlineStr = event.deadlineTime
              ? `${event.deadline}T${event.deadlineTime}`
              : `${event.deadline}T23:59`;
            return new Date(deadlineStr) >= now;
          });
        fetchedEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
        setGroupEvents(fetchedEvents);
      } catch (err) {
        console.error("サークル情報の取得に失敗しました:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGroupData();
  }, [groupId]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: BG_COLOR }}>
      <div style={{ fontSize: 14, color: "#5A7370", fontWeight: 600 }}>読み込み中...</div>
    </div>
  );

  if (!group) return (
    <div style={{ padding: 40, textAlign: "center", background: BG_COLOR, minHeight: "100vh" }}>
      <p>サークルが見つかりませんでした。</p>
    </div>
  );

  return (
    <div style={s.container}>
      {/* ヘッダー */}
      <div style={s.header}>
        <h1 style={s.headerTitle}>グループ情報</h1>
        <div style={{ width: 44 }} />
      </div>

      <div style={s.mainContent}>

        {/* プロフィールカード */}
        <div style={s.card}>

            {/* 通知ボタン */}
            {auth.currentUser && (
              <button
                className={`tag-tab-btn ${isNotifying ? "" : "tag-active-tab"}`}
                onClick={async () => {
                  if (!currentUid) return;
                  const myRef = doc(db, "users", currentUid);
                  const groupRef = doc(db, "groups", groupId);
                  try {
                    if (isNotifying) {
                      await updateDoc(myRef, { follows: arrayRemove(groupId) });
                      await updateDoc(groupRef, { followers: arrayRemove(currentUid) });
                      setIsNotifying(false);
                    } else {
                      await updateDoc(myRef, { follows: arrayUnion(groupId) });
                      await updateDoc(groupRef, { followers: arrayUnion(currentUid) });
                      setIsNotifying(true);
                    }
                  } catch (err) {
                    console.error("通知設定の変更に失敗しました", err);
                  }
                }}
                style={{ position: "absolute", top: 16, right: 16, borderRadius: 999, fontSize: 13, fontWeight: 700, padding: "9px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                  >
                {isNotifying ? <BellOff size={14} /> : <Bell size={14} />}
              </button>
            )}
          {/* GroupManage と同じレイアウト：アバター左・テキスト右 */}
          <div style={s.groupInfo}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#F4F6F5", border: "1px solid #E0E8E7", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {group.avatarUrl
                ? <img src={group.avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Avatar" />
                : <Users size={32} color="#9AADA8" />
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 ,paddingRight: 100 }}>
              <div style={{ marginBottom: 4 }}>
                <span style={s.viewBadge}>{group.groupType || "サークル"}</span>
              </div>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: "#111", margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {group.displayName}
              </h2>
              {/* SNSボタン */}
              <div style={{ display: "flex", gap: 10, marginTop: 8, marginBottom: 4 }}>
                {group.twitterUrl && (
                  <a href={group.twitterUrl} target="_blank" rel="noreferrer"
                    style={{ ...s.snsBtnBase, background: "#111111" }} title="𝕏 (旧Twitter)"
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.2)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)"; }}>
                    <FaXTwitter size={14} color="#FFFFFF" />
                  </a>
                )}
                {group.instagramUrl && (
                  <a href={group.instagramUrl} target="_blank" rel="noreferrer"
                    style={{ ...s.snsBtnBase, background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" }} title="Instagram"
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 6px 12px rgba(220,39,67,0.3)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)"; }}>
                    <FaInstagram size={14} color="#FFFFFF" />
                  </a>
                )}
                {group.homepageUrl && (
                  <a href={group.homepageUrl} target="_blank" rel="noreferrer"
                    style={{ ...s.snsBtnBase, background: "#0066cc" }} title="ホームページ"
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,102,204,0.3)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)"; }}>
                    <FaGlobe size={14} color="#FFFFFF" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* 説明文 */}
          <div style={s.descriptionSection}>
            <div style={s.sectionIconHeader}>
              <Info size={14} />
              <span>サークル紹介</span>
            </div>
            <div style={s.descriptionBody}>
              {group.description ? (
                <div dangerouslySetInnerHTML={{ __html: group.description }} className="tiptap-view" />
              ) : (
                <span style={{ color: "#9AADA8", fontStyle: "italic" }}>紹介文はまだ登録されていません。</span>
              )}
            </div>
          </div>
        </div>

        {/* 主催イベント一覧 */}
        <div style={s.card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Calendar size={18} color={THEME} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: 0 }}>主催イベント</h3>
            <span style={s.countBadge}>{groupEvents.length}</span>
          </div>

          {groupEvents.length === 0 ? (
            <div style={s.emptyCard}>現在、公開中のイベントはありません。</div>
          ) : (
            <div style={s.eventList}>
              {groupEvents.map(event => {
                const style = GENRE_STYLES[event.tags?.genre] || { bg: "#F5F5F5", color: "#5A7370" };
                const emoji = GENRE_EMOJI[event.tags?.genre] || "📌";

                const today = new Date(); today.setHours(0, 0, 0, 0);
                const rawDates = [];
                if (event.dates && event.dates.length > 0) rawDates.push(...event.dates);
                else if (event.date) rawDates.push({ date: event.date, startTime: event.startTime });
                const upcoming = rawDates
                  .filter(d => { if (!d?.date) return false; const ed = new Date(d.date); ed.setHours(0,0,0,0); return ed >= today; })
                  .sort((a, b) => new Date(a.date) - new Date(b.date));
                const firstDate = upcoming[0] || null;
                const extraCount = upcoming.length > 1 ? upcoming.length - 1 : 0;
                const hadAnyDates = (event.dates && event.dates.length > 0) || !!event.date;
                const fmt = (s) => { const [,m,d] = s.split("-"); const w = ["日","月","火","水","木","金","土"][new Date(s).getDay()]; return `${m}-${d}（${w}）`; };
                const dateLabel = firstDate
                  ? `${fmt(firstDate.date)}${firstDate.startTime ? ` ${firstDate.startTime}` : ""}${extraCount > 0 ? ` ほか${extraCount}日程` : ""}`
                  : hadAnyDates ? "日程終了" : "通年募集";

                return (
                  <div key={event.id} className="event-hover-card" style={s.eventItem} onClick={() => onEventSelect(event)}>
                    {event.imageUrl ? (
                      <img src={event.imageUrl} alt="" style={s.eventThumb} />
                    ) : (
                      <div className="card-thumb-placeholder" style={{ ...s.eventThumb, background: style.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, aspectRatio: "1/1" }}>
                        {emoji}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                      <div className="hover-title-underline" style={s.eventTitle}>{event.title}</div>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <div style={s.metaItem}><Calendar size={11} /> <span>{dateLabel}</span></div>
                        {event.location && <div style={s.metaItem}><MapPin size={11} /> <span>{event.location}</span></div>}
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
    </div>
  );
}

const s = {
  container: { background: BG_COLOR, minHeight: "100vh", paddingBottom: 40 },
  header: { background: THEME, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, color: "white", fontSize: 17, fontWeight: 700, margin: 0, textAlign: "center" },
  mainContent: { maxWidth: 720, margin: "0 auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 },
  // profileCard のstyleに追加
card: { background: "white", borderRadius: 12, padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", position: "relative" },
groupInfo: { display: "flex", alignItems: "center", gap: 20, marginBottom: 16 },
  viewBadge: { background: "#F9EAED", color: THEME, fontWeight: 700, fontSize: 11, padding: "2px 8px", borderRadius: 4 },
  descriptionSection: { background: "#F8FAF9", borderRadius: 12, padding: "14px", marginTop: 4 },
  sectionIconHeader: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, color: "#5A7370", marginBottom: 8, letterSpacing: "0.05em" },
  descriptionBody: { fontSize: 13, color: "#334E4B", lineHeight: 1.6 },
  countBadge: { background: "#F9EAED", color: THEME, fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999 },
  emptyCard: { background: "#F8FAF9", borderRadius: 10, padding: "24px", textAlign: "center", color: "#9AADA8", fontSize: 13, border: "1.5px dashed #D0DDD9" },
  eventList: { display: "flex", flexDirection: "column", gap: 10 },
  eventItem: { background: "#FAFDFC", border: "1px solid #E2ECEB", borderRadius: 12, padding: "12px", display: "flex", gap: 12, alignItems: "center", cursor: "pointer" },
  eventThumb: { width: "64px", height: "64px", minWidth: "64px", maxWidth: "64px", borderRadius: 8, objectFit: "cover", flexShrink: 0 },
  eventTitle: { fontSize: 14, fontWeight: 800, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  metaItem: { fontSize: 11, color: "#5A7370", display: "flex", alignItems: "center", gap: 4 },
  genreTag: { fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, width: "fit-content", marginTop: 2 },
  snsBtnBase: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "32px", height: "32px", borderRadius: "50%",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    transition: "all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)",
    cursor: "pointer", textDecoration: "none",
  },
};