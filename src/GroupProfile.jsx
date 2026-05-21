/**
 * GroupProfile.jsx
 * サークルの公開プロフィールページ
 * - サークル情報（アイコン・名前・種別・説明文）の表示
 * - そのサークルが主催するイベント一覧の表示
 */

import { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { GENRE_STYLES, GENRE_EMOJI, THEME, BG_COLOR } from "./constants";
import { Users, Mail, Calendar, MapPin, ChevronLeft, Info } from "lucide-react";

export default function GroupProfile({ groupId, onBack, onEventSelect }) {
  const [group, setGroup] = useState(null);
  const [groupEvents, setGroupEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroupData = async () => {
      if (!groupId) return;
      setLoading(true);
      try {
        // 1. グループ基本情報の取得
        const groupSnap = await getDoc(doc(db, "groups", groupId));
        if (groupSnap.exists()) {
          setGroup(groupSnap.data());
        }

        // 2. このグループが「主催者」となっているイベントを検索
        // 💡 organizerId フィールドでフィルタリングします
        const q = query(
          collection(db, "events"), 
          where("organizerId", "==", groupId)
        );
        const eventSnap = await getDocs(q);
        
        const now = new Date(); // 💡 現在時刻を取得
        const fetchedEvents = eventSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(event => {
            // 💡 締め切り日時が過ぎていないイベント（募集中）のみを抽出
            if (!event.deadline) return true; // 締め切りが設定されていないイベントは常に表示
            const deadlineStr = event.deadlineTime 
              ? `${event.deadline}T${event.deadlineTime}` 
              : `${event.deadline}T23:59`;
            return new Date(deadlineStr) >= now;
          });
        
        // 日付順にソート（新しい順）
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
      <div style={{ fontSize: 14, color: "#5A7370", fontWeight: 600, animation: "pulse 1.5s infinite" }}>読み込み中...</div>
    </div>
  );

  if (!group) return (
    <div style={{ padding: 40, textAlign: "center", background: BG_COLOR, minHeight: "100vh" }}>
      <p>サークルが見つかりませんでした。</p>
      <button style={s.backBtn} onClick={onBack}>← 戻る</button>
    </div>
  );

  return (
    <div style={s.container}>
      {/* ヘッダーナビ */}
      <div style={s.navBar}>
        <button style={s.navBackBtn} onClick={onBack}>
          <ChevronLeft size={20} />
          <span>戻る</span>
        </button>
      </div>

      <div style={s.mainContent}>
        {/* プロフィールカード */}
        <div style={s.profileCard}>
          <div style={s.headerRow}>
            {group.avatarUrl ? (
              <img src={group.avatarUrl} alt="avatar" style={s.avatar} />
            ) : (
              <div style={s.avatarPlaceholder}>
                <Users size={36} color={THEME} />
              </div>
            )}
            <div style={s.titleInfo}>
              <div style={s.badgeRow}>
                <span style={s.groupTypeBadge}>{group.groupType || "サークル"}</span>
              </div>
              <h1 style={s.groupName}>{group.displayName}</h1>
            </div>
          </div>

          {/* 活動説明文 */}
          <div style={s.descriptionSection}>
            <div style={s.sectionHeader}>
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

        {/* 主催イベント一覧 */}
        <div style={s.eventSectionHeader}>
          <Calendar size={18} color={THEME} />
          <h2 style={s.sectionTitle}>主催イベント</h2>
          <span style={s.countBadge}>{groupEvents.length}</span>
        </div>

        {groupEvents.length === 0 ? (
          <div style={s.emptyCard}>
            現在、公開中のイベントはありません。
          </div>
        ) : (
          <div style={s.eventList}>
            {groupEvents.map(event => {
              const style = GENRE_STYLES[event.tags?.genre] || { bg: "#F5F5F5", color: "#5A7370" };
              const emoji = GENRE_EMOJI[event.tags?.genre] || "📌";
              return (
                <div key={event.id} style={s.eventItem} onClick={() => onEventSelect(event)}>
                  {event.imageUrl ? (
                    <img src={event.imageUrl} alt="" style={s.eventThumb} />
                  ) : (
                    <div style={{ ...s.eventThumb, background: style.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                      {emoji}
                    </div>
                  )}
                  <div style={s.eventInfo}>
                    <div style={s.eventTitle}>{event.title}</div>
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
  navBar: { background: "white", padding: "12px 16px", borderBottom: "1px solid #E0E8E7", position: "sticky", top: 0, zIndex: 10 },
  navBackBtn: { background: "none", border: "none", color: THEME, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 },
  mainContent: { maxWidth: 640, margin: "0 auto", padding: "16px" },
  
  profileCard: { background: "white", borderRadius: 16, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", marginBottom: 24 },
  headerRow: { display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 20 },
  avatar: { width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid #F4F6F5" },
  avatarPlaceholder: { width: 72, height: 72, borderRadius: "50%", background: "#F9EAED", display: "flex", alignItems: "center", justifyContent: "center" },
  titleInfo: { flex: 1 },
  badgeRow: { marginBottom: 4 },
  groupTypeBadge: { background: THEME, color: "white", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4 },
  groupName: { fontSize: 19, fontWeight: 900, color: "#111", margin: "0 0 4px" },
  emailRow: { fontSize: 12, color: "#7A9591", display: "flex", alignItems: "center", gap: 4 },

  descriptionSection: { background: "#F8FAF9", borderRadius: 12, padding: "14px" },
  sectionHeader: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, color: "#5A7370", marginBottom: 8, letterSpacing: "0.05em" },
  descriptionBody: { fontSize: 13, color: "#334E4B", lineHeight: 1.6, whiteSpace: "pre-wrap" },

  eventSectionHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "0 4px" },
  sectionTitle: { fontSize: 16, fontWeight: 900, color: "#111", margin: 0 },
  countBadge: { background: "#F9EAED", color: THEME, fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999 },

  emptyCard: { background: "white", borderRadius: 12, padding: "32px", textAlign: "center", color: "#9AADA8", fontSize: 13, border: "1.5px dashed #D0DDD9" },
  
  eventList: { display: "flex", flexDirection: "column", gap: 10 },
  eventItem: { background: "white", borderRadius: 14, padding: "12px", display: "flex", gap: 12, alignItems: "center", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", transition: "transform 0.1s" },
  eventThumb: { width: 68, height: 68, borderRadius: 10, objectFit: "cover", flexShrink: 0 },
  eventInfo: { flex: 1, minWidth: 0 },
  eventTitle: { fontSize: 14, fontWeight: 800, color: "#111", marginBottom: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  eventMeta: { display: "flex", flexDirection: "column", gap: 2, marginBottom: 6 },
  metaItem: { fontSize: 11, color: "#5A7370", display: "flex", alignItems: "center", gap: 4 },
  genreTag: { fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, width: "fit-content" }
};