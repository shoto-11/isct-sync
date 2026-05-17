import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, orderBy, query, getDoc, doc } from "firebase/firestore";
import EventDetail from "./EventDetail";
import { useNavigate } from 'react-router-dom';
import logo from "./assets/logo.png";
import { THEME, GENRE_STYLES, GENRE_EMOJI } from "./constants";


function EventCard({ event, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const cs = GENRE_STYLES[event.tags?.genre] || { bg:"#F5F5F5", color:"#616161" };
  const emoji = GENRE_EMOJI[event.tags?.genre] || "📌";
  return (
    <div
      style={{
        ...s.card,
        background: hovered ? "#F8FAFA" : "white",
        transform: hovered ? "translateY(-2px)" : "none",
        boxShadow: hovered ? "0 6px 20px rgba(0,0,0,0.13)" : "0 2px 10px rgba(0,0,0,0.08)",
        transition: "all 0.18s",
      }}
      onClick={() => onSelect(event)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {event.imageUrl ? (
        <img src={event.imageUrl} alt={event.title} style={s.cardImg} />
      ) : (
        <div style={{ ...s.cardThumb, background: cs.bg }}>
          <span style={{ fontSize:40 }}>{emoji}</span>
        </div>
      )}
      <div style={s.cardBody}>
        <div style={{
          ...s.cardTitle,
          textDecoration: hovered ? "underline" : "none",
          textDecorationColor: THEME,
        }}>
          {event.title}
        </div>
        <div style={s.cardDate}>{event.date}{event.startTime ? ` ${event.startTime}` : ""}</div>
        <div style={s.cardFooter}>
          <span style={s.cardOrganizer}>
            {(event.organizerName || "").length > 12
              ? (event.organizerName || "").slice(0, 12) + "..."
              : (event.organizerName || "募集者不明")}
          </span>
          <span style={s.cardLocation}>
            {(event.location || "").length > 5
              ? event.location.slice(0, 5) + "..."
              : event.location}
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
  return (
    <div style={s.rankItem} onClick={() => onSelect(event)}>
      <div style={{ ...s.rankNum, color: rankColors[rank] }}>{rank+1}</div>
      {event.imageUrl ? (
        <img src={event.imageUrl} alt={event.title} style={s.rankImg} />
      ) : (
        <div style={{ ...s.rankThumb, background: cs.bg }}>
          <span style={{ fontSize:24 }}>{emoji}</span>
        </div>
      )}
      <div style={{ flex:1 }}>
        <div style={s.rankTitle}>{event.title}</div>
        <div style={s.rankMeta}>
          <span>📅 {event.date}</span>
          <span>📍 {event.location}</span>
        </div>
      </div>
      <div style={s.rankParticipants}>{count} {label}</div>
    </div>
  );
}

function Section({ title, badge, events, onSelect }) {
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [dragged, setDragged] = useState(false);
  const ref = { current: null };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setShowRight(el.scrollWidth > el.clientWidth + 10);
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
  setDragged(false);
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
  if (Math.abs(walk) > 5) setDragged(true);
  el.scrollLeft = scrollLeft - walk;
};

  const handleMouseUp = () => {
    setIsDragging(false);
    if (ref.current) ref.current.style.cursor = "grab";
  };

  return (
    <>
      <div style={s.sectionHeading}>
        <span style={s.sectionTitle}>{title}</span>
        <span style={s.sectionBadge}>{badge || `全${events.length}件`}</span>
      </div>
      <div style={{ position:"relative" }}>
        {showLeft && (
          <button style={{ ...s.scrollArrow, left:0 }} onClick={() => scroll("left")}>‹</button>
        )}
        {showLeft && <div style={{ ...s.fade, left:0, background:"linear-gradient(to right, white, transparent)" }} />}

        <div
          ref={el => ref.current = el}
          style={{ ...s.cardsScrollWrapper, cursor:"grab", userSelect:"none" }}
          onScroll={handleScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div style={s.cardsGrid}>
            {events.map(event => (
              <EventCard key={event.id} event={event} onSelect={dragged ? () => {} : onSelect} />
            ))}
          </div>
        </div>

        {showRight && <div style={{ ...s.fade, right:0, background:"linear-gradient(to left, white, transparent)" }} />}
        {showRight && (
          <button style={{ ...s.scrollArrow, right:0 }} onClick={() => scroll("right")}>›</button>
        )}
      </div>
    </>
  );
}

export default function EventList({ user, onLoginRequired, pendingEvent, onPendingEventClear }) {
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

  useEffect(() => {
    const fetch = async () => {
      const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const now = new Date();
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

      // サークル募集
      setCircleEvents(list.filter(e => e.tags?.organizer === "#サークル"));

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
          setRecommendedEvents(list.filter(e =>
            e.tags?.targets?.includes(`#${userData.gakunen}向け`) ||
            e.tags?.targets?.includes("#全学対象") ||
            e.tags?.targets?.includes("#学部生向け")
          ));
        }
      }

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
    if (!user) {
        navigate(`/events/${event.id}`);
        return;
    }
    const key = `history_${user.uid}`;
    const prev = JSON.parse(localStorage.getItem(key) || "[]");
    const filtered = prev.filter(e => e.id !== event.id);
    const updated = [event, ...filtered].slice(0, 30);
    localStorage.setItem(key, JSON.stringify(updated));
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

  if (loading) return (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#F4F6F5"}}>
  </div>
);
  if (selected && !user) return (
    <div style={s2.loginPrompt}>
        <p style={s2.loginPromptText}>イベントの詳細を見るにはログインが必要です</p>
        <button style={s2.loginPromptBtn} onClick={() => onLoginRequired(selected)}>ログイン</button>
    </div>
    );

  const currentRanking = rankTab === "view" ? viewRanking : rankTab === "like" ? likeRanking : joinRanking;
  const rankLabel = rankTab === "view" ? "閲覧" : rankTab === "like" ? "いいね" : "参加予定";

  return (
  <div style={{ maxWidth:1200, margin:"0 auto", padding: window.innerWidth > 768 ? "0 24px" : "0" }}>
      {/* 募集中のイベント */}
      <Section title="📅 募集中のイベント" events={events} onSelect={handleSelect} />

      {/* サークル募集 */}
      <Section title="🏫 サークル募集" events={circleEvents} onSelect={handleSelect} />

      {/* 今日が締め切り */}
      <Section title="⏰ 今日が締め切り" events={todayDeadlineEvents} onSelect={handleSelect} />

      {/* あなたへのおすすめ */}
      {user && <Section title="🎯 あなたへのおすすめ" events={recommendedEvents} onSelect={handleSelect} />}

      {/* CTA */}
      <div style={s.ctaBanner}>
        <div>
          <div style={s.ctaText}>現在募集中のイベントを見る</div>
          <div style={s.ctaSub}>全{events.length}件のイベントが掲載中</div>
        </div>
        <div style={s.ctaArrow}>›</div>
      </div>

      {/* Survey */}
      <div style={s.surveyBanner}>
        <div style={s.surveyLabel}>在学生限定</div>
        <div style={s.surveyTitle}>2026春イベント<br />リクエスト＆アンケート実施中！！</div>
        <div style={s.surveyDeadline}>📅 5/22 まで</div>
      </div>

      {/* ランキング */}
      <div style={s.rankingHeader}>
        <span style={{ fontSize:15, fontWeight:700 }}>⭐ 週間ランキング</span>
      </div>

      {/* ランキングタブ */}
      <div style={s.rankTabs}>
        {[
          { id:"view", label:"👁 閲覧数" },
          { id:"like", label:"❤️ いいね" },
          { id:"join", label:"📅 参加予定" },
        ].map(t => (
          <button
            key={t.id}
            style={{ ...s.rankTab, ...(rankTab === t.id ? s.rankTabActive : {}) }}
            onClick={() => setRankTab(t.id)}
          >
            {t.label}
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
  );
}

const s = {
  sectionHeading: { display:"flex", alignItems:"center", gap:8, padding:"16px 14px 10px" },
  sectionTitle: { fontSize:18, fontWeight:900, color:"#1A2E2B" },
  sectionBadge: { background:"#F9EAED", color:THEME, fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:999, marginLeft:4 },
  cardsScrollWrapper: { overflowX:"auto", WebkitOverflowScrolling:"touch", scrollbarWidth:"none", padding:"0 14px 16px" },
  cardsGrid: { display:"flex", flexDirection:"row", gap:12, width:"max-content" },
  card: { background:"white", borderRadius:12, overflow:"hidden", cursor:"pointer", width: window.innerWidth > 768 ? 280 : 160, flexShrink:0 },
  cardImg: { width:"100%", height: window.innerWidth > 768 ? 180 : 120, objectFit:"cover", display:"block" },
  cardThumb: { width:"100%", height: window.innerWidth > 768 ? 180 : 120, display:"flex", alignItems:"center", justifyContent:"center" },
  cardBody: { padding:"12px 14px", display:"flex", flexDirection:"column", gap:5 },
  cardTitle: { fontSize:14, fontWeight:700, lineHeight:1.4, color:"#1A2E2B", overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" },
  cardDate: { fontFamily:"monospace", fontSize:11, color:THEME, fontWeight:700 },
  cardFooter: { display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:2 },
  cardOrganizer: { fontSize:11, color:"#5A7370", overflow:"hidden", whiteSpace:"nowrap" },
  cardLocation: { fontSize:11, color:"#5A7370", overflow:"hidden", whiteSpace:"nowrap", textAlign:"right" },
  ctaBanner: { margin:"4px 14px 16px", background:`linear-gradient(135deg, ${THEME}, #c0394f)`, borderRadius:12, padding:"16px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", boxShadow:`0 4px 16px rgba(136,32,58,0.25)` },
  ctaText: { color:"white", fontSize:15, fontWeight:700 },
  ctaSub: { color:"rgba(255,255,255,0.75)", fontSize:11, marginTop:2 },
  ctaArrow: { background:"#F5A623", width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:"#111", fontSize:18, fontWeight:900 },
  surveyBanner: { margin:"0 14px 20px", background:"linear-gradient(120deg,#FFF8E7,#FFFDE7)", border:"1.5px solid #F0D98A", borderRadius:12, padding:"14px 16px" },
  surveyLabel: { fontSize:10, fontWeight:700, color:"#C8A84B", letterSpacing:"0.1em", marginBottom:4 },
  surveyTitle: { fontSize:14, fontWeight:900, lineHeight:1.4 },
  surveyDeadline: { display:"inline-flex", alignItems:"center", gap:4, background:"#C8A84B", color:"#0D1B2A", fontFamily:"monospace", fontSize:12, fontWeight:700, padding:"3px 10px", borderRadius:999, marginTop:8 },
  rankingHeader: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 14px" },
  rankTabs: { display:"flex", gap:8, padding:"0 14px 12px" },
  rankTab: { padding:"6px 14px", borderRadius:999, border:`1.5px solid #D0DDD9`, background:"white", fontSize:12, fontWeight:600, color:"#5A7370", cursor:"pointer" },
  rankTabActive: { background:THEME, color:"white", border:`1.5px solid ${THEME}` },
  rankingList: { padding:"0 14px 16px", display:"flex", flexDirection:"column", gap:8 },
  rankItem: { background:"white", borderRadius:10, padding:"12px 14px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 1px 5px rgba(0,0,0,0.06)", cursor:"pointer" },
  rankNum: { fontFamily:"monospace", fontSize:18, fontWeight:700, width:28, textAlign:"center", flexShrink:0 },
  rankImg: { width:52, height:52, borderRadius:8, objectFit:"cover", flexShrink:0 },
  rankThumb: { width:52, height:52, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  rankTitle: { fontSize:13, fontWeight:700, marginBottom:3 },
  rankMeta: { fontSize:11, color:"#5A7370", display:"flex", gap:8 },
  rankParticipants: { fontSize:11, fontWeight:700, color:THEME },
  scrollArrow: { position:"absolute", top:"50%", transform:"translateY(-50%)", zIndex:10, background:"white", border:"none", borderRadius:"50%", width:36, height:36, fontSize:24, fontWeight:900, cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,0.15)", display:"flex", alignItems:"center", justifyContent:"center", color:"#88203a" },
fade: { position:"absolute", top:0, bottom:16, width:60, zIndex:9, pointerEvents:"none" },
};

const s2 = {
  loginPrompt: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 24px", gap:16, minHeight:"60vh" },
  loginPromptText: { fontSize:15, color:"#5A7370", fontWeight:600 },
  loginPromptBtn: { padding:"12px 32px", background:THEME, color:"white", border:"none", borderRadius:8, fontSize:15, fontWeight:700, cursor:"pointer" },
  
};