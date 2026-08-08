import { db } from "./firebase";
import { collection, getDocs, orderBy, query, getDoc, doc } from "firebase/firestore";
import EventDetail from "./EventDetail";
import { useNavigate } from 'react-router-dom';
import logo from "./assets/logo.png";
import { THEME, GENRE_STYLES, GENRE_EMOJI } from "./constants";
import { useEffect, useState, useRef } from "react";
import { BG_COLOR } from "./constants";
import { Calendar, Users, Clock, Target, 
  Star, Eye, Heart, CalendarCheck, MapPin, Zap, TrendingUp,User, CalendarDays, ChevronRight, } from "lucide-react";
import "./animations.css";

// 💡 【共通定義】アプリ内のすべてのイベント要素で使い回すYouTubeライクな高品質アニメーション
// コンポーネントの外、または最上部に一度だけインジェクションします
function EventCard({ event, onSelect, size = "small" }) {
  const cs = GENRE_STYLES[event.tags?.genre] || { bg:"#F5F5F5", color:"#616161" };
  const emoji = GENRE_EMOJI[event.tags?.genre] || "📌";
  const cardWidth = size === "large"
    ? (window.innerWidth > 768 ? 330 : 220)
    : (window.innerWidth > 768 ? 250 : 180);

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split("-");
    const [, m, d] = parts;
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const w = weekdays[dateObj.getDay()];
    return `${m}-${d}（${w}）`;
  };

  // 1. 判定用の「今日」を YYYY-MM-DD 形式の文字列で確実に取得（JSTズレ完全防止）
  const now = new Date();
  const todayStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");

  // 2. 💡【データ統合の修正】条件分岐のすり抜けを防ぐため、dates と date を完全にフラットな1つの配列に集約
  const rawDates = [];
  if (event.dates && event.dates.length > 0) {
    rawDates.push(...event.dates);
  } else if (event.date) {
    rawDates.push({ date: event.date, startTime: event.startTime, endTime: event.endTime });
  }
  const today = new Date();
today.setHours(0, 0, 0, 0);
  // 3. 💡【完全絞り込み】今日よりも前の過去日を「100%確実に」配列から完全に消し去る
  const upcomingDates = rawDates
  .filter(d => {
    if (!d?.date) return false;

    const eventDate = new Date(d.date);
    eventDate.setHours(0, 0, 0, 0);

    return eventDate >= today;
  })
  .sort((a, b) => {
    const da = new Date(a.date);
    const db = new Date(b.date);
    return da - db;
  });

  // 4. 今日以降で「最も近い開催日（メイン表示される1日分）」
  const firstDate = upcomingDates[0] || null;
  
  // 5. 💡【カウント計算】未来の予定（今日含む）から、今カードに見えている1日分（firstDate）を引き算する
  const extraCount = upcomingDates.length > 1 ? upcomingDates.length - 1 : 0;
  
  // 過去に1つでも日程データが存在していたかどうかの厳密なフラグ
  const hadAnyDates = (event.dates && event.dates.length > 0) || !!event.date;

  return (
    <div
      className="event-hover-card"
      style={{ ...s.card, width: cardWidth, background: "white", boxShadow: "0 2px 10px rgba(0,0,0,0.08)" }}
      onClick={() => onSelect(event)}
    >
      {event.imageUrl ? (
        <img src={event.imageUrl} alt={event.title} style={s.cardImg} />
      ) : (
        <div className="card-thumb-placeholder" style={{ ...s.cardThumb, background: cs.bg }}>
          <span style={{ fontSize: 40 }}>{emoji}</span>
        </div>
      )}
      <div style={s.cardBody}>
        <div className="hover-title-underline" style={s.cardTitle}>
          {event.title}
        </div>

        {/* 日時 */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Calendar size={11} color={THEME} strokeWidth={2.5} style={{ flexShrink: 0 }} />
          <span style={s.cardDate}>
            {firstDate
              ? `${formatDate(firstDate.date)}${firstDate.startTime ? ` ${firstDate.startTime}` : ""}${extraCount > 0 ? ` ほか${extraCount}日程` : ""}`
              : hadAnyDates
                ? "日程終了"
                : "通年募集"}
          </span>
        </div>

        {/* 主催者（右下） */}
        <div style={s.cardFooter}>
          <User size={11} color="#5A7370" strokeWidth={2.5} style={{ flexShrink: 0 }} />
          <span style={s.cardOrganizer}>
            {(event.organizerName || "").length > 16
              ? (event.organizerName || "").slice(0, 16) + "..."
              : (event.organizerName || "募集者不明")}
          </span>
        </div>
      </div>
    </div>
  );
}

function RankItem({ event, rank, count, label, onSelect }) {
  const cs = GENRE_STYLES[event.tags?.genre] || { bg:"#F5F5F5", color:"#616161" };
  const emoji = GENRE_EMOJI[event.tags?.genre] || "📌";
  const rankColors = ["#C8A84B","#8E9EAB","#A0674A","#B0BEC5"];

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const [, m, d] = dateStr.split("-");
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const w = weekdays[new Date(dateStr).getDay()];
    return `${m}-${d}（${w}）`;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rawDates = [];
  if (event.dates && event.dates.length > 0) {
    rawDates.push(...event.dates);
  } else if (event.date) {
    rawDates.push({ date: event.date, startTime: event.startTime });
  }

  const upcomingDates = rawDates
    .filter(d => {
      if (!d?.date) return false;
      const eventDate = new Date(d.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const firstDate = upcomingDates[0] || null;
  const extraCount = upcomingDates.length > 1 ? upcomingDates.length - 1 : 0;
  const hadAnyDates = (event.dates && event.dates.length > 0) || !!event.date;
    
  return (
    <div className="event-hover-card" style={s.rankItem} onClick={() => onSelect(event)}>
      <div style={{ ...s.rankNum, color: rankColors[rank] }}>{rank+1}</div>
      {event.imageUrl ? (
        <img src={event.imageUrl} alt={event.title} style={s.rankImg} />
      ) : (
        <div className="card-thumb-placeholder" style={{ ...s.rankThumb, background: cs.bg }}>
          <span style={{ fontSize:24 }}>{emoji}</span>
        </div>
      )}
      <div style={{ flex:1 }}>
        <div className="hover-title-underline" style={s.rankTitle}>{event.title}</div>
        <div style={s.rankMeta}>
          <span style={{ display:"flex", alignItems:"center", gap:4 }}>
            <Calendar size={11} color="#5A7370" />
            {firstDate
              ? `${formatDate(firstDate.date)}${firstDate.startTime ? ` ${firstDate.startTime}` : ""}${extraCount > 0 ? ` ほか${extraCount}日程` : ""}`
              : hadAnyDates ? "日程終了" : "通年募集"}
            </span>
          {event.location && (
            <span style={{ display:"flex", alignItems:"center", gap:4 }}>
              <MapPin size={11} color="#5A7370" /> {event.location}
            </span>
          )}
        </div>
        <div style={{ ...s.rankMeta, marginTop: 3 }}>
          <span style={{ display:"flex", alignItems:"center", gap:4 }}>
            <User size={11} color="#5A7370" /> {event.organizerName || "募集者不明"}
          </span>
        </div>
      </div>
      {/* ランキング数非表示 */}
       {/*<div style={s.rankParticipants}>{count} {label}</div> */}
    </div>
  );
}

function Section({ title, badge, events, onSelect, icon, maxItems = 20, cardSize = "small" }) {
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hovered, setHovered] = useState(false);
  const ref = { current: null };
  const displayEvents = events.slice(0, maxItems);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
  const el = ref.current;
  if (!el) return;
  setShowLeft(el.scrollLeft > 10);
  setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
});

  if (events.length === 0) return null;

  const scroll = (dir) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  const handleScroll = (e) => {
    const el = e.target;
    setShowLeft(el.scrollLeft > 10);
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  const handleMouseDown = (e) => {
    const el = ref.current;
    if (!el) return;
    setIsDragging(true);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeft(el.scrollLeft);
    el.style.cursor = "grabbing";
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const el = ref.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 1.5;
    el.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (ref.current) ref.current.style.cursor = "grab";
  };

  const [dragged, setDragged] = useState(false);

  return (
    <>
      <div style={s.sectionHeading}>
        {icon && icon}
        <span style={s.sectionTitle}>{title}</span>
        <span style={s.sectionBadge}>{badge || `全${events.length}件`}</span>
        </div>
      <div
        style={{ position:"relative" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* 左矢印 */}
        <button style={{
          ...s.scrollArrow, left:0,
          opacity: hovered && showLeft ? 1 : 0,
          pointerEvents: hovered && showLeft ? "auto" : "none",
          transition: "opacity 0.4s ease",
        }} onClick={() => scroll("left")}>‹</button>
        {showLeft && <div style={{ ...s.fade, left:0, background:"linear-gradient(to right, white, transparent)", opacity: hovered ? 1 : 0, transition: "opacity 0.4s ease" }} />}

        <div
          ref={el => ref.current = el}
          style={{ ...s.cardsScrollWrapper, cursor:"grab", userSelect:"none" }}
          onScroll={handleScroll}
          onMouseDown={(e) => { setDragged(false); handleMouseDown(e); }}
          onMouseMove={(e) => { if (Math.abs(e.pageX - startX) > 5) setDragged(true); handleMouseMove(e); }}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div style={s.cardsGrid}>
            {displayEvents.map(event => (
            <EventCard key={event.id} event={event} onSelect={dragged ? () => {} : onSelect} size={cardSize} />
            ))}
          </div>
        </div>

        {/* 右矢印 */}
        <div style={{ ...s.fade, right:0, background:"linear-gradient(to left, white, transparent)", opacity: hovered && showRight ? 1 : 0, transition: "opacity 0.4s ease", pointerEvents:"none" }} />
        <button style={{
          ...s.scrollArrow, right:0,
          opacity: hovered && showRight ? 1 : 0,
          pointerEvents: hovered && showRight ? "auto" : "none",
          transition: "opacity 0.4s ease",
        }} onClick={() => scroll("right")}>›</button>
      </div>
    </>
  );
}

function Carousel({ events, onSelect }) {
  const [index, setIndex] = useState(0);
  const [startX, setStartX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const wrapperRef = useRef(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    forceUpdate(n => n + 1);
  }, []);

  const timerRef = useRef(null);
  const items = events.slice(0, 10);
  const total = items.length;

  // 💡 解決策：前後に2枚ずつダミーを結合して、広い画面でも絶対に隙間（空白）が見えないようにする
  // total が1件のときに items[-1] などが undefined になるのを防ぐため、循環参照で取得する
  const wrap = i => items[((i % total) + total) % total];
  const extendedItems = [
    wrap(total - 2), wrap(total - 1),
    ...items,
    wrap(0), wrap(1)
  ];

  // 💡 ダミーが前に2枚入ったので、初期位置（本物の1枚目）はインデックス「2」からスタート
  const [extIndex, setExtIndex] = useState(2);
  const [transitioning, setTransitioning] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    resetTimer();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setReady(true);
      });
    });
    return () => clearInterval(timerRef.current);
  }, []);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => goNext(), 3300);
  };

  useEffect(() => {
    resetTimer();
    return () => clearInterval(timerRef.current);
  }, []);

  const goNext = () => {
    setTransitioning(true);
    setExtIndex(i => i + 1);
    resetTimer();
  };

  const goPrev = () => {
    setTransitioning(true);
    setExtIndex(i => i - 1);
    resetTimer();
  };

  useEffect(() => {
    // 本物のインデックス計算（前に2枚あるので -2 する）
    setIndex((extIndex - 2 + total) % total);

    // 💡 端に到達した時のワープ処理の判定を調整
    if (extIndex === 1) {
      setTimeout(() => {
        setTransitioning(false);
        setExtIndex(total + 1);
      }, 400);
    } else if (extIndex === total + 2) {
      setTimeout(() => {
        setTransitioning(false);
        setExtIndex(2);
      }, 400);
    }
  }, [extIndex, total]);

  const slideWidth = wrapperRef.current ? wrapperRef.current.offsetWidth * (window.innerWidth > 768 ? 0.55 : 0.88) : 0;
  const offset = wrapperRef.current ? (wrapperRef.current.offsetWidth - slideWidth) / 2 - extIndex * slideWidth : 0;

  return (
    <div ref={wrapperRef} style={{ position:"relative", overflow:"hidden", width:"100%", paddingBottom:24, userSelect:"none", opacity: ready ? 1 : 0, transition:"opacity 0.3s ease" }}>
      <div
        style={{ display:"flex", transform:`translateX(${offset}px)`, transition: transitioning ? "transform 0.4s ease" : "none", willChange:"transform" }}
        onMouseDown={e => { setDragging(false); setStartX(e.pageX); }}
        onMouseMove={e => { if (Math.abs(e.pageX - startX) > 5) setDragging(true); }}
        onMouseUp={e => {
          const diff = e.pageX - startX;
          if (Math.abs(diff) > 50) { diff < 0 ? goNext() : goPrev(); }
        }}
        onTouchStart={e => { setStartX(e.touches[0].pageX); }}
        onTouchEnd={e => {
          const diff = e.changedTouches[0].pageX - startX;
          if (Math.abs(diff) > 50) { diff < 0 ? goNext() : goPrev(); }
        }}
      >
        {extendedItems.map((event, i) => (
          <div
            key={`${event.id}-${i}`}
            style={{
              width: slideWidth || (window.innerWidth > 768 ? "75%" : "85%"),
              flexShrink:0,
              padding:"0 8px",
              overflow:"hidden",
              position:"relative",
              opacity: i === extIndex ? (hoveredIndex === i ? 0.8 : 1) : 1,
              transition:"opacity 0.2s ease",
              cursor:"pointer",
            }}
            onClick={() => { if (!dragging) { if (i === extIndex) onSelect(event); else i < extIndex ? goPrev() : goNext(); } }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {event.imageUrl ? (
              <img src={event.imageUrl} alt={event.title} style={{ width:"100%", aspectRatio:"16/9", objectFit:"cover", display:"block", borderRadius:12, pointerEvents:"none" }} />
            ) : (
              <div style={{ width:"100%", aspectRatio:"16/9", background: GENRE_STYLES[event.tags?.genre]?.bg || "#F5F5F5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:60, borderRadius:12 }}>
                {GENRE_EMOJI[event.tags?.genre] || "📌"}
              </div>
            )}
          </div>
        ))}
      </div>

      <button style={{ position:"absolute", top:"85%", left:4, transform:"translateY(-50%)", background:"rgba(255,255,255,0.9)", border:"none", borderRadius:"50%", width: window.innerWidth > 768 ? 52 : 40, height: window.innerWidth > 768 ? 52 : 40, fontSize: window.innerWidth > 768 ? 32 : 24, cursor:"pointer", color:"#88203a", boxShadow:"0 2px 8px rgba(0,0,0,0.15)", zIndex:10, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={goPrev}>
        <svg width={window.innerWidth > 768 ? 24 : 18} height={window.innerWidth > 768 ? 24 : 18} viewBox="0 0 24 24" fill="none" stroke="#88203a" strokeWidth="3"><polyline points="15 18 9 12 15 6"/></svg>
      </button>

      <button style={{ position:"absolute", top:"85%", right:4, transform:"translateY(-50%)", background:"rgba(255,255,255,0.9)", border:"none", borderRadius:"50%", width: window.innerWidth > 768 ? 52 : 40, height: window.innerWidth > 768 ? 52 : 40, fontSize: window.innerWidth > 768 ? 32 : 24, cursor:"pointer", color:"#88203a", boxShadow:"0 2px 8px rgba(0,0,0,0.15)", zIndex:10, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={goNext}>
        <svg width={window.innerWidth > 768 ? 24 : 18} height={window.innerWidth > 768 ? 24 : 18} viewBox="0 0 24 24" fill="none" stroke="#88203a" strokeWidth="3"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    
      <div style={{ position:"absolute", bottom:8, left:"50%", transform:"translateX(-50%)", display:"flex", gap:6 }}>
        {items.map((_, i) => (
          <div key={i} style={{ height:4, width: i === index ? 32 : 16, borderRadius999:999, borderRadius:999, background: i === index ? "#88203a" : "rgba(0,0,0,0.2)", cursor:"pointer", transition:"all 0.3s" }} onClick={() => { setTransitioning(true); setExtIndex(i + 2); resetTimer(); }} />
        ))}
      </div>
    </div>
  );
}
export default function EventList({ 
  user, 
  onLoginRequired, 
  pendingEvent, 
  onPendingEventClear, 
  noticeItems = [], 
  noticeIndex = 0 
}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [circleEvents, setCircleEvents] = useState([]);
  const [todayDeadlineEvents, setTodayDeadlineEvents] = useState([]);
  const [recommendedEvents, setRecommendedEvents] = useState([]);
  const [viewRanking, setViewRanking] = useState([]);
  const [likeRanking, setLikeRanking] = useState([]);
  const [joinRanking, setJoinRanking] = useState([]);
  const [rankTab, setRankTab] = useState("view");
  const navigate = useNavigate();
  const [carouselIndex, setCarouselIndex] = useState(0);
const [isDraggingCarousel, setIsDraggingCarousel] = useState(false);
const [carouselStartX, setCarouselStartX] = useState(0);
const [carouselEvents, setCarouselEvents] = useState([]);
const [todayEvents, setTodayEvents] = useState([]);
const [popularWeekEvents, setPopularWeekEvents] = useState([]);
const [recruitEvents, setRecruitEvents] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
     const now = new Date();
      now.setHours(0, 0, 0, 0);

      const list = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(event => {
          if (!event.deadline) return true;
          const deadlineStr = event.deadlineTime
            ? `${event.deadline}T${event.deadlineTime}`
            : `${event.deadline}T23:59`;
          return new Date(deadlineStr) > now;
        });
      // 各イベントの作成者の表示名を取得
        const updatedList = await Promise.all(list.map(async (event) => {
        if (!event.createdBy) return event;
        const userSnap = await getDoc(doc(db, "users", event.createdBy));
        if (userSnap.exists()) {
            return { ...event, organizerName: userSnap.data().displayName };
        }
        return event;
        }));
        setEvents(updatedList);
        
        // ── カルーセル設定を取得 ──
        const adminSnap = await getDoc(doc(db, "adminSettings", "display"));
        if (adminSnap.exists()) {
          const carouselIds = adminSnap.data().carouselEventIds || [];
          if (carouselIds.length > 0) {
            // 1. まず、管理者画面で選択されたIDを持つイベントだけを抽出
            const carouselEvs = updatedList.filter(e => carouselIds.includes(e.id));
            
            // 2. 💡 管理者画面の「carouselIds」に保存されているインデックス（順番）通りにソートする
            const sortedCarouselEvs = carouselEvs.sort((a, b) => {
              return carouselIds.indexOf(a.id) - carouselIds.indexOf(b.id);
            });
            
            setCarouselEvents(sortedCarouselEvs);
          } else {
            setCarouselEvents(updatedList);
          }
        } else {
          setCarouselEvents(updatedList);
        }

      // サークル募集
      setCircleEvents(list.filter(e => {
        const org = Array.isArray(e.tags?.organizer) ? e.tags.organizer : e.tags?.organizer ? [e.tags.organizer] : [];
        return org.includes("#サークル");
      }));

      // 今日が締め切り
      const today = now.toISOString().split("T")[0];
      setTodayDeadlineEvents(list.filter(e => e.deadline === today));

      // ランキング取得
      const statsSnap = await getDocs(collection(db, "eventStats"));
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const statsData = statsSnap.docs.map(d => {
        const data = d.data();
        const event = list.find(e => e.id === data.eventId);
        if (!event) return null;
        const viewCount = (data.views || []).filter(v => new Date(v.date) > weekAgo).length;
        const likeCount = (data.likes || []).filter(l => new Date(l.date) > weekAgo).length;
        const joinCount = (data.joins || []).filter(j => new Date(j.date) > weekAgo).length;
        return { event, viewCount, likeCount, joinCount };
      }).filter(Boolean);

      setViewRanking([...statsData].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5));
        setLikeRanking([...statsData].sort((a, b) => b.likeCount - a.likeCount).slice(0, 5));
        setJoinRanking([...statsData].sort((a, b) => b.joinCount - a.joinCount).slice(0, 5));

      // おすすめ
        if (user) {
            const userSnap = await getDoc(doc(db, "users", user.uid));
            if (userSnap.exists()) {
                const userData = userSnap.data();
                const recommended = updatedList
                  .filter(e =>
                    e.tags?.targets?.includes(`#${userData.gakunen}向け`) ||
                    e.tags?.targets?.includes("#全学対象") ||
                    e.tags?.targets?.includes("#学部生向け") ||
                    e.tags?.targets?.includes("#教員向け") && userData.gakunen === "教員" ||
                    (e.targetGakuin?.length === 0 || !e.targetGakuin) ||
                    e.targetGakuin?.includes(userData.gakuin) ||
                    e.targetGakukei?.includes(userData.gakukei)
                  )
                .sort((a, b) => {
                    // マッチスコア計算
                    const matchScore = (event) => {
                        let score = 0;
                        
                        // マッチした分だけ加点
                        if (event.targetGakuin?.includes(userData.gakuin)) score += 10;
                        if (event.targetGakukei?.includes(userData.gakukei)) score += 20;
                        if (event.tags?.targets?.includes(`#${userData.gakunen}向け`)) score += 15;
                        if (event.tags?.targets?.includes("#全学対象")) score += 5;
                        if (event.tags?.targets?.includes("#学部生向け") && userData.gakunen?.includes("学部")) score += 8;
                        // matchScore関数内に追加
                        if (event.tags?.targets?.includes("#教員向け") && userData.gakunen === "教員") score += 15;

                        // タグが多いほど減点（絞り込みが甘いペナルティ）
                        const gakuinCount = event.targetGakuin?.length || 0;
                        const gakukeiCount = event.targetGakukei?.length || 0;
                        const targetCount = event.tags?.targets?.length || 0;
                        score -= gakuinCount * 2;
                        score -= gakukeiCount * 1;
                        score -= targetCount * 1;
                        // 全学対象・学部生向けは広すぎるので追加減点
                        if (event.tags?.targets?.includes("#全学対象")) score -= 5;
                        if (event.tags?.targets?.includes("#学部生向け")) score -= 3;

                        return score;
                        };
                    const aMatch = matchScore(a);
                    const bMatch = matchScore(b);
                    if (bMatch !== aMatch) return bMatch - aMatch;
                    // 同じマッチスコアなら人気順
                    const aData = statsData.find(s => s.event.id === a.id);
                    const bData = statsData.find(s => s.event.id === b.id);
                    const aScore = (aData?.viewCount || 0) * 1 + (aData?.likeCount || 0) * 5 + (aData?.joinCount || 0) * 10;
                    const bScore = (bData?.viewCount || 0) * 1 + (bData?.likeCount || 0) * 5 + (bData?.joinCount || 0) * 10;
                    return bScore - aScore;
                });
                setRecommendedEvents(recommended);
            }
            }

      // 今日参加できるイベント
        const todayStr = now.toISOString().split("T")[0];
        setTodayEvents(updatedList.filter(event => event.date === todayStr));

        // 今週の人気イベント（総合スコア）
            const popularThisWeek = [...updatedList]
            .sort((a, b) => {
                const aData = statsData.find(s => s.event.id === a.id);
                const bData = statsData.find(s => s.event.id === b.id);
                const aScore = (aData?.viewCount || 0) * 1 + (aData?.likeCount || 0) * 5 + (aData?.joinCount || 0) * 10;
                const bScore = (bData?.viewCount || 0) * 1 + (bData?.likeCount || 0) * 5 + (bData?.joinCount || 0) * 10;
                return bScore - aScore;
            })
            .slice(0, 20);
            setPopularWeekEvents(popularThisWeek);
            setRecruitEvents(list.filter(e => e.tags?.recruit));
      setLoading(false);
    };
    fetch();
  }, []);

  useEffect(() => {
    if (user && pendingEvent && !selected) {
      const timer = setTimeout(() => {
        setSelected(pendingEvent);
        onPendingEventClear();
        window.history.pushState({ eventId: pendingEvent.id }, "");
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, pendingEvent]);

  const handleSelect = (event) => {
    navigate(`/events/${event.id}`);
  };

  const handleBack = () => {
    setSelected(null);
    window.history.back();
  };

  useEffect(() => {
    const onPopState = () => setSelected(null);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
    // 自動スライド
    useEffect(() => {
    if (events.length === 0) return;
    const timer = setInterval(() => {
    setCarouselIndex(i => (i + 1) % Math.min(events.length, 5));
    }, 3000);
    return () => clearInterval(timer);
    }, [events.length]);

  if (loading) return (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:BG_COLOR}}>
  </div>
);
  if (selected && !user) return (
    <div style={s2.loginPrompt}>
        <p style={s2.loginPromptText}>イベントの詳細を見るにはログインが必要です</p>
        <button style={s2.loginPromptBtn} onClick={() => onLoginRequired(selected)}>ログイン</button>
    </div>
    );

  const currentRanking = rankTab === "view" ? viewRanking : rankTab === "like" ? likeRanking : joinRanking;
  const rankLabel = rankTab === "view" ? "閲覧" : rankTab === "like" ? "いいね" : "マイリスト";
  return (
  <div>
    {/* ── 💡 完全に元のスタイルを適用した Notice Bar ── */}
    {noticeItems && noticeItems.length > 0 && (
      <div
        style={{ ...s.noticeBar, cursor: noticeItems[noticeIndex]?.link ? "pointer" : "default" }}
        onClick={() => noticeItems[noticeIndex]?.link && window.open(noticeItems[noticeIndex].link, "_blank")}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", height: "100%" }}>
          {/* アイコンの右側の余白（marginRight: 10）も維持 */}
          <div style={{ ...s.noticeIcon, display: "flex", alignItems: "center", marginRight: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#007A6E" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div style={{ flex: 1, overflow: "hidden", position: "relative", height: "100%", display: "flex", alignItems: "center" }}>
            {noticeItems.map((item, i) => {
              const total = noticeItems.length;
              const isCurrent = i === noticeIndex;
              const isNext = !isCurrent && i === (noticeIndex + 1) % total;
              const isPrev = !isCurrent && !isNext && i === (noticeIndex - 1 + total) % total;

              let translateY = "100%";
              let opacity = 0;
              let hasTransition = false;

              if (isCurrent) {
                translateY = "0";
                opacity = 1;
                hasTransition = true;
              } else if (isNext) {
                translateY = "100%";
                opacity = 0;
                hasTransition = false;
              } else if (isPrev) {
                translateY = "-100%";
                opacity = 0;
                hasTransition = true;
              }
              return (
                <div key={i} style={{
                  position: "absolute",
                  width: "100%",
                  opacity: opacity,
                  transform: `translateY(${translateY})`,
                  transition: hasTransition ? "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s ease" : "none",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#1A2E2B",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>{item.text}</div>
              );
            })}
          </div>
          <div style={{ color: "#B0BEC5", fontSize: 16, flexShrink: 0 }}>›</div>
        </div>
      </div>
    )}
        
{/* ── カルーセル ── */}
{carouselEvents.length > 0 && <Carousel events={carouselEvents} onSelect={handleSelect} />}

  <div style={{ maxWidth:1200, margin:"0 auto", padding: window.innerWidth > 768 ? "0 24px" : "0", overflow:"hidden", width:"100%", boxSizing:"border-box" }}>
    {user && <Section title="あなたへのおすすめ" icon={<Target size={20} color="#88203a" />} events={recommendedEvents} onSelect={handleSelect} cardSize="large" />}
    <div
      className="banner-hover"
      style={s.ctaBanner}
      onClick={() => navigate("/calendar")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: "rgba(255,255,255,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <CalendarDays size={24} color="white" />
        </div>
        <div>
          <div style={s.ctaText}>カレンダーでイベントを見る</div>
          <div style={s.ctaSub}>今月のイベントをまとめて確認</div>
        </div>
      </div>
      <ChevronRight size={20} color="rgba(255,255,255,0.8)" />
    </div>

      <Section title="新着イベント" icon={<Calendar size={20} color="#88203a" />} events={events} onSelect={handleSelect} />
        <Section title="サークルイベント" icon={<Users size={20} color="#88203a" />} events={circleEvents} onSelect={handleSelect} />
        <Section title="今週の人気イベント" icon={<TrendingUp size={20} color="#88203a" />} events={popularWeekEvents} onSelect={handleSelect} />
        <Section title="今日が締め切り" icon={<Clock size={20} color="#88203a" />} events={todayDeadlineEvents} onSelect={handleSelect} />
        <Section title="今日参加できるイベント" icon={<Zap size={20} color="#88203a" />} events={todayEvents} onSelect={handleSelect} />
        <Section title="長期メンバー募集中" icon={<Users size={20} color="#88203a" />} events={recruitEvents} onSelect={handleSelect} />


      {/* Survey */}
      {/*
      <div
        className="banner-hover"
        style={s.surveyBanner}
        onClick={() => window.open("https://www.youtube.com/", "_blank")}
      >
        <div style={s.surveyLabel}>在学生限定</div>
        <div style={s.surveyTitle}>2026春イベント<br />リクエスト＆アンケート実施中！！</div>
        <div style={s.surveyDeadline}>📅 5/22 まで</div>
      </div>*/}

      {/* ランキング */}
      <div style={s.rankingHeader}>
        <span style={{ fontSize:15, fontWeight:700, display:"flex", alignItems:"center", gap:6 }}>
            <Star size={18} color="#88203a" fill="#88203a" /> 週間ランキング
        </span>
        </div>

      {/* ランキングタブ */}
      <div style={s.rankTabs}>
        {[
            { id:"view", label:"閲覧数", icon:<Eye size={14} /> },
            { id:"like", label:"いいね", icon:<Heart size={14} /> },
            { id:"join", label:"マイリスト", icon:<CalendarCheck size={14} /> },
            ].map(t => (
            <button
                key={t.id}
                /* 💡 共通化クラス「tag-tab-btn」を追加！さらに選択中なら「tag-active-tab」も追加 */
                className={`tag-tab-btn ${rankTab === t.id ? "tag-active-tab" : ""}`}
                style={{ ...s.rankTab, ...(rankTab === t.id ? s.rankTabActive : {}), display:"flex", alignItems:"center", gap:4 }}
                onClick={() => setRankTab(t.id)}
            >
                {t.icon}{t.label}
            </button>
            ))}
      </div>

      <div style={s.rankingList}>
        {currentRanking.length === 0 ? (
          <p style={{ padding:"16px 14px", color:"#5A7370", fontSize:14 }}>まだデータがありません</p>
        ) : (
          currentRanking.map((item, i) => (
            <RankItem
              key={item.event.id}
              event={item.event}
              rank={i}
              count={rankTab === "view" ? item.viewCount : rankTab === "like" ? item.likeCount : item.joinCount}
              label={rankLabel}
              onSelect={handleSelect}
            />
          ))
        )}
      </div>
    </div>
    </div>
  );
}
const s = {
    // ─── 💡 ここからお知らせバー用のCSSを追加 ───
noticeBar: { 
  background: "white", 
  borderLeft: `4px solid ${THEME}`,
  margin: "12px auto",
  maxWidth: 1000,
  width: window.innerWidth > 768 ? "calc(100% - 200px)" : "calc(100% - 28px)",
  borderRadius: 6, 
  padding: "10px 14px", 
  display: "flex", 
  alignItems: "center", 
  gap: 10, 
  boxShadow: "0 1px 4px rgba(0,0,0,0.07)", 
  overflow: "hidden", 
  height: 48,
  boxSizing: "border-box"
},
  noticeIcon: { 
    background: "#F9EAED", // ← 薄いピンクの円形背景
    borderRadius: "50%", 
    width: 32, 
    height: 32, 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    flexShrink: 0 
  },
  sectionHeading: { display:"flex", alignItems:"center", gap:8, padding:"16px 14px 10px" },
  sectionTitle: { fontSize:24, fontWeight:700, color:"#1A2E2B" },
  sectionBadge: { background:"#F9EAED", color:THEME, fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:999, marginLeft:4 },
  cardsScrollWrapper: { overflowX:"auto", WebkitOverflowScrolling:"touch", scrollbarWidth:"none", padding:"0 14px 16px" },
  cardsGrid: { display:"flex", flexDirection:"row", gap:12, width:"max-content" },
  card: { background:"white", borderRadius:12, overflow:"hidden", cursor:"pointer", width: window.innerWidth > 768 ? 330 : 220, flexShrink:0 },
  cardImg: { width:"100%", aspectRatio:"16/9", objectFit:"cover", display:"block" },
  cardThumb: { width:"100%", aspectRatio:"16/9", display:"flex", alignItems:"center", justifyContent:"center" },
  cardBody: { padding:"12px 14px", display:"flex", flexDirection:"column", gap:5 },
  cardTitle: { fontSize:14, fontWeight:700, lineHeight:1.4, color:"#1A2E2B", overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" },
  cardDate: { fontFamily: "monospace", fontSize: 11, color: THEME, fontWeight: 700 },
  cardOrganizer: { fontSize: 11, color: "#5A7370", overflow: "hidden", whiteSpace: "nowrap" },
  cardFooter: { display:"flex", justifyContent:"flex-end", alignItems:"center", marginTop:2 },
  cardLocation: { fontSize:11, color:"#5A7370", overflow:"hidden", whiteSpace:"nowrap", textAlign:"right" },
  ctaBanner: { margin:"4px 14px 16px", background:`linear-gradient(135deg, ${THEME}, #c0394f)`, borderRadius:12, padding:"14px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", boxShadow:`0 4px 16px rgba(136,32,58,0.25)`, width:"calc(100% - 28px)", boxSizing:"border-box" },
  ctaText: { color:"white", fontSize:15, fontWeight:700 },
  ctaSub: { color:"rgba(255,255,255,0.75)", fontSize:11, marginTop:2 },
  ctaArrow: { background:"#F5A623", width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:"#111", fontSize:18, fontWeight:700 },
  surveyBanner: { margin:"0 14px 20px", background:"linear-gradient(120deg,#FFF8E7,#FFFDE7)", border:"1.5px solid #F0D98A", borderRadius:12, padding:"14px 16px", width:"calc(100% - 28px)", boxSizing:"border-box" },
  surveyLabel: { fontSize:10, fontWeight:700, color:"#C8A84B", letterSpacing:"0.1em", marginBottom:4 },
  surveyTitle: { fontSize:14, fontWeight:700, lineHeight:1.4 },
  surveyDeadline: { display:"inline-flex", alignItems:"center", gap:4, background:"#C8A84B", color:"#0D1B2A", fontFamily:"monospace", fontSize:12, fontWeight:700, padding:"3px 10px", borderRadius:999, marginTop:8 },
  rankingHeader: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 14px", width:"100%", boxSizing:"border-box" },
  rankTabs: { display:"flex", gap:8, padding:"0 14px 12px", width:"100%", boxSizing:"border-box", flexWrap:"wrap" },
  rankTab: { padding:"6px 14px", borderRadius:999, border:`1.5px solid #D0DDD9`, background:"white", fontSize:12, fontWeight:600, color:"#5A7370", cursor:"pointer" },
  rankTabActive: { background:THEME, color:"white", border:`1.5px solid ${THEME}` },
  rankingList: { padding:"0 14px 16px", display:"flex", flexDirection:"column", gap:8, width:"100%", boxSizing:"border-box" },
  rankItem: { background:"white", borderRadius:10, padding:"12px 14px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 2px 10px rgba(0,0,0,0.08)", cursor:"pointer", boxSizing:"border-box", overflow:"hidden", width:"100%" },
  rankNum: { fontFamily:"monospace", fontSize:18, fontWeight:700, width:28, textAlign:"center", flexShrink:0 },
  rankImg: { width:92, height:52, borderRadius:8, objectFit:"cover", flexShrink:0 },
  rankThumb: { width:92, height:52, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  rankTitle: { fontSize:13, fontWeight:700, marginBottom:3 },
  rankMeta: { fontSize:11, color:"#5A7370", display:"flex", gap:8, flexWrap:"wrap" },
  rankParticipants: { fontSize:11, fontWeight:700, color:THEME },
  scrollArrow: { position:"absolute", top:"50%", transform:"translateY(-50%)", zIndex:10, background:"white", border:"none", borderRadius:"50%", width:36, height:36, fontSize:24, fontWeight:700, cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,0.15)", display:"flex", alignItems:"center", justifyContent:"center", color:"#88203a" },
  fade: { position:"absolute", top:0, bottom:16, width:60, zIndex:9, pointerEvents:"none" },
};

const s2 = {
  loginPrompt: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 24px", gap:16, minHeight:"60vh" },
  loginPromptText: { fontSize:15, color:"#5A7370", fontWeight:600 },
  loginPromptBtn: { padding:"12px 32px", background:THEME, color:"white", border:"none", borderRadius:8, fontSize:15, fontWeight:700, cursor:"pointer" },
  
};