/**
 * GroupProfile.jsx
 * サークルの公開プロフィールページ
 * - サークル情報（アイコン・名前・種別・説明文）の表示
 * - そのサークルが主催するイベント一覧の表示
 */

import { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore"; // 💡 メソッドを追加
import { GENRE_STYLES, GENRE_EMOJI, THEME, BG_COLOR } from "./constants";
import { Users, Calendar, MapPin, ChevronLeft, Info, Bell, BellOff } from "lucide-react"; // 💡 Bell, BellOff を追加
import { FaXTwitter, FaInstagram } from "react-icons/fa6";
import { FaGlobe } from "react-icons/fa";
import TiptapEditor from "./TiptapEditor";
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
        // 1. グループ基本情報の取得
        const groupSnap = await getDoc(doc(db, "groups", groupId));
        if (groupSnap.exists()) {
          setGroup(groupSnap.data());
        }

        // 💡 ログイン中なら、自分がこのグループを通知設定しているかチェック
        if (currentUid) {
          const userSnap = await getDoc(doc(db, "users", currentUid));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const follows = userData.follows || [];
            setIsNotifying(follows.includes(groupId));
          }
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
      {/*<button style={s.backBtn} onClick={onBack}>← 戻る</button>*/}
    </div>
  );

  return (
    <div style={s.container}>
      {/* ヘッダーナビ */}
      <div style={s.navBar}>
        {/*<button style={s.navBackBtn} onClick={onBack}>← 戻る</button>*/}
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

              {/* 💡 各ブランドカラーをまとわせた、ホバー時に浮かび上がるボタンUI */}
              <div style={{ display: "flex", gap: 10, marginTop: 10, marginBottom: 4 }}>
                {group.twitterUrl && (
                  <a 
                    href={group.twitterUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{ ...s.snsBtnBase, background: "#111111" }} // 𝕏ブランドカラー（漆黒）
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
                    <FaXTwitter size={15} color="#FFFFFF" />
                  </a>
                )}
                
                {group.instagramUrl && (
                  <a 
                    href={group.instagramUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{ ...s.snsBtnBase, background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" }} // インスタグラデーション
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
                    <FaInstagram size={15} color="#FFFFFF" />
                  </a>
                )}
                
                {group.homepageUrl && (
                  <a 
                    href={group.homepageUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{ ...s.snsBtnBase, background: "#0066cc" }} // ホームページ（信頼のブルー）
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
                    <FaGlobe size={15} color="#FFFFFF" />
                  </a>
                )}
              </div>
            </div>

          {/* 💡 🔔 通知オン/オフの切り替え処理を追加 */}
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
                {isNotifying ? <><BellOff size={14} /></> : <><Bell size={14} /></>}
                </button>
          )}
          
          </div>

          {/* 活動説明文 */}
          <div style={s.descriptionSection}>
            <div style={s.sectionHeader}>
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

              const today = new Date(); today.setHours(0,0,0,0);
              const rawDates = [];
              if (event.dates && event.dates.length > 0) rawDates.push(...event.dates);
              else if (event.date) rawDates.push({ date: event.date, startTime: event.startTime });
              const upcoming = rawDates.filter(d => { if (!d?.date) return false; const ed = new Date(d.date); ed.setHours(0,0,0,0); return ed >= today; }).sort((a,b) => new Date(a.date)-new Date(b.date));
              const firstDate = upcoming[0] || null;
              const extraCount = upcoming.length > 1 ? upcoming.length - 1 : 0;
              const hadAnyDates = (event.dates && event.dates.length > 0) || !!event.date;
              const fmt = (s) => { const [,m,d] = s.split("-"); const w=["日","月","火","水","木","金","土"][new Date(s).getDay()]; return `${m}-${d}（${w}）`; };
              const dateLabel = firstDate ? `${fmt(firstDate.date)}${firstDate.startTime?` ${firstDate.startTime}`:""}${extraCount>0?` ほか${extraCount}日程`:""}` : hadAnyDates ? "日程終了" : "通年募集";

              
              return (
                <div 
                  key={event.id} 
                  /* 💡 animations.css の共通ホバー・クリックアニメーションクラスを適用！ */
                  className="event-hover-card"
                  style={s.eventItem} 
                  onClick={() => onEventSelect(event)}
                >
                  {event.imageUrl ? (
                    <img src={event.imageUrl} alt="" style={s.eventThumb} />
                  ) : (
                    /* 💡 画像がない場合の枠。ホバー時に連動して暗くなるよう、styleに「aspectRatio」の目印を追加 */
                    <div className="card-thumb-placeholder" style={{ ...s.eventThumb, background: style.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, aspectRatio: "1/1" }}>
                      {emoji}
                    </div>
                  )}
                  <div style={s.eventInfo}>
                    {/* 💡 イベントタイトルにホバー時下線連動クラスを追加 */}
                    <div className="hover-title-underline" style={s.eventTitle}>{event.title}</div>
                    <div style={s.eventMeta}>
                      <div style={s.metaItem}><Calendar size={11} /> {dateLabel}</div>
                      {event.location && <div style={s.metaItem}><MapPin size={11} /> {event.location}</div>}
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
  
  profileCard: { background: "white", borderRadius: 16, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", marginBottom: 24 },
  headerRow: { display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 20 },
  avatar: { width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid #F4F6F5" },
  avatarPlaceholder: { width: 72, height: 72, borderRadius: "50%", background: "#F9EAED", display: "flex", alignItems: "center", justifyContent: "center" },
  titleInfo: { flex: 1 },
  badgeRow: { marginBottom: 4 },
  groupTypeBadge: { background: THEME, color: "white", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4 },
  groupName: { fontSize: 19, fontWeight: 700, color: "#111", margin: "0 0 4px" },
  emailRow: { fontSize: 12, color: "#7A9591", display: "flex", alignItems: "center", gap: 4 },

  descriptionSection: { background: "#F8FAF9", borderRadius: 12, padding: "14px" },
  sectionHeader: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, color: "#5A7370", marginBottom: 8, letterSpacing: "0.05em" },
  descriptionBody: { fontSize: 13, color: "#334E4B", lineHeight: 1.6, whiteSpace: "pre-wrap" },

  eventSectionHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "0 4px" },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: "#111", margin: 0 },
  countBadge: { background: "#F9EAED", color: THEME, fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999 },

  emptyCard: { background: "white", borderRadius: 12, padding: "32px", textAlign: "center", color: "#9AADA8", fontSize: 13, border: "1.5px dashed #D0DDD9" },
  
  eventList: { display: "flex", flexDirection: "column", gap: 10 },
  eventItem: { background: "white", borderRadius: 14, padding: "12px", display: "flex", gap: 12, alignItems: "center", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", transition: "transform 0.1s" },
  eventThumb: { width: 68, height: 68, borderRadius: 10, objectFit: "cover", flexShrink: 0 },
  eventInfo: { flex: 1, minWidth: 0 },
  eventTitle: { fontSize: 14, fontWeight: 800, color: "#111", marginBottom: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  eventMeta: { display: "flex", flexDirection: "row", gap: 12, flexWrap: "wrap", marginBottom: 2 },
  metaItem: { fontSize: 11, color: "#5A7370", display: "flex", alignItems: "center", gap: 4 },
  genreTag: { fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, width: "fit-content" },
  snsBtnBase: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    transition: "all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)", // 滑らかなアニメーションカーブ
    cursor: "pointer",
    textDecoration: "none",
  },
  // 💡 既存の navBar, navBackBtn, mainContent を以下のように書き換えてください
  navBar: { 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "space-between", 
    padding: "8px 16px", 
    maxWidth: 640,          // 💡 下の mainContent と横幅の開始位置をピタッと合わせます
    margin: "0 auto", 
    width: "100%" 
  },
  navBackBtn: { 
    display: "flex", 
    alignItems: "center", 
    gap: 6, 
    background: "none", 
    border: "none", 
    color: THEME, 
    fontSize: 14, 
    fontWeight: 700, 
    cursor: "pointer", 
    padding: "8px 0" 
  },
  mainContent: { 
    maxWidth: 640, 
    margin: "0 auto", 
    padding: "0 16px 16px" // 💡 上の余白を少し詰めて戻るボタンとの距離感を最適化します
  },
};