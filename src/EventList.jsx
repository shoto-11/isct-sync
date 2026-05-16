import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import EventDetail from "./EventDetail";

const CATEGORY_STYLES = {
  スポーツ: { bg:"#E8F5E9", color:"#2E7D32" },
  勉強会:   { bg:"#E3F2FD", color:"#1565C0" },
  文化:     { bg:"#FFF3E0", color:"#E65100" },
  テック:   { bg:"#E0F2F1", color:"#00695C" },
  交流:     { bg:"#F3E5F5", color:"#6A1B9A" },
  その他:   { bg:"#F5F5F5", color:"#616161" },
};

const CATEGORY_EMOJI = {
  スポーツ:"⚽", 勉強会:"📚", 文化:"🎨", テック:"💻", 交流:"🎉", その他:"📌"
};

function EventCard({ event, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const cs = CATEGORY_STYLES[event.category] || CATEGORY_STYLES["その他"];
  const remaining = event.capacity - (event.participants?.length ?? 0);

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
          <span style={{ fontSize:40 }}>{CATEGORY_EMOJI[event.category] || "📌"}</span>
        </div>
      )}
      <div style={s.cardBody}>
        <span style={{ ...s.cardTag, background:cs.bg, color:cs.color }}>{event.category}</span>
        <div style={{
          ...s.cardTitle,
          textDecoration: hovered ? "underline" : "none",
          textDecorationColor: "#007A6E",
        }}>
          {event.title}
        </div>
        <div style={s.cardMeta}>
          <span style={s.cardDate}>{event.date}{event.startTime ? ` ${event.startTime}` : ""}</span>
          {event.capacity && <span style={{ fontSize:11, color:"#5A7370" }}>残{remaining}枠</span>}
        </div>
        <div style={{ fontSize:11, color:"#5A7370", marginTop:2 }}>📍 {event.location}</div>
      </div>
    </div>
  );
}

export default function EventList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <p style={{ padding:24, color:"#5A7370" }}>読み込み中...</p>;

  // 詳細画面
  if (selected) return (
    <EventDetail event={selected} onBack={() => setSelected(null)} />
  );

  return (
    <div>
      {/* ── Section heading ── */}
      <div style={s.sectionHeading}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007A6E" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span style={s.sectionTitle}>募集中のイベント</span>
        <span style={s.sectionBadge}>全{events.length}件</span>
      </div>

      {events.length === 0 ? (
        <p style={{ padding:"16px 14px", color:"#5A7370", fontSize:14 }}>まだイベントがありません。最初のイベントを作りましょう！</p>
      ) : (
        <div style={s.cardsScrollWrapper}>
          <div style={s.cardsGrid}>
            {events.map(event => (
              <EventCard key={event.id} event={event} onSelect={setSelected} />
            ))}
          </div>
        </div>
      )}

      {/* ── CTA banner ── */}
      <div style={s.ctaBanner}>
        <div>
          <div style={s.ctaText}>現在募集中の春イベントを見る</div>
          <div style={s.ctaSub}>全{events.length}件のイベントが掲載中</div>
        </div>
        <div style={s.ctaArrow}>›</div>
      </div>

      {/* ── Survey banner ── */}
      <div style={s.surveyBanner}>
        <div style={s.surveyLabel}>在学生限定</div>
        <div style={s.surveyTitle}>2026春イベント<br />リクエスト＆アンケート実施中！！</div>
        <div style={s.surveyDeadline}>📅 5/22 まで</div>
      </div>

      {/* ── Ranking ── */}
      <div style={s.rankingHeader}>
        <span style={{ fontSize:15, fontWeight:700 }}>⭐ 人気ランキング</span>
        <span style={{ fontSize:12, color:"#007A6E", fontWeight:600 }}>すべて見る ›</span>
      </div>

      <div style={s.rankingList}>
        {events.slice(0, 4).map((event, i) => {
          const cs = CATEGORY_STYLES[event.category] || CATEGORY_STYLES["その他"];
          const rankColors = ["#C8A84B","#8E9EAB","#A0674A","#B0BEC5"];
          return (
            <div key={event.id} style={s.rankItem} onClick={() => setSelected(event)}>
              <div style={{ ...s.rankNum, color: rankColors[i] }}>{i+1}</div>
              {event.imageUrl ? (
                <img src={event.imageUrl} alt={event.title} style={s.rankImg} />
              ) : (
                <div style={{ ...s.rankThumb, background: cs.bg }}>
                  <span style={{ fontSize:24 }}>{CATEGORY_EMOJI[event.category] || "📌"}</span>
                </div>
              )}
              <div style={{ flex:1 }}>
                <div style={s.rankTitle}>{event.title}</div>
                <div style={s.rankMeta}>
                  <span>📅 {event.date}{event.startTime ? ` ${event.startTime}` : ""}</span>
                  <span>📍 {event.location}</span>
                </div>
              </div>
              <div style={s.rankParticipants}>{event.participants?.length ?? 0}人</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s = {
  sectionHeading: { display:"flex", alignItems:"center", gap:8, padding:"16px 14px 10px" },
  sectionTitle: { fontSize:15, fontWeight:700 },
  sectionBadge: { background:"#E6F5F4", color:"#007A6E", fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:999, marginLeft:4 },
  cardsScrollWrapper: { overflowX:"auto", WebkitOverflowScrolling:"touch", scrollbarWidth:"none", padding:"0 14px 16px" },
  cardsGrid: { display:"flex", flexDirection:"row", gap:12, width:"max-content" },
  card: { background:"white", borderRadius:12, overflow:"hidden", cursor:"pointer", width: window.innerWidth > 768 ? 280 : 160, flexShrink:0 },
  cardImg: { width:"100%", height: window.innerWidth > 768 ? 180 : 120, objectFit:"cover", display:"block" },
  cardThumb: { width:"100%", height: window.innerWidth > 768 ? 180 : 120, display:"flex", alignItems:"center", justifyContent:"center" },
  cardBody: { padding:"12px 14px", display:"flex", flexDirection:"column", gap:5 },
  cardTag: { display:"inline-block", fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:4, width:"fit-content" },
  cardTitle: { fontSize:14, fontWeight:700, lineHeight:1.4, color:"#1A2E2B" },
  cardMeta: { display:"flex", justifyContent:"space-between", alignItems:"center" },
  cardDate: { fontFamily:"monospace", fontSize:11, color:"#007A6E", fontWeight:700 },
  ctaBanner: { margin:"4px 14px 16px", background:"linear-gradient(135deg,#007A6E,#00A896)", borderRadius:12, padding:"16px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", boxShadow:"0 4px 16px rgba(0,122,110,0.25)" },
  ctaText: { color:"white", fontSize:15, fontWeight:700 },
  ctaSub: { color:"rgba(255,255,255,0.75)", fontSize:11, marginTop:2 },
  ctaArrow: { background:"#C8A84B", width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:"#0D1B2A", fontSize:18, fontWeight:900 },
  surveyBanner: { margin:"0 14px 20px", background:"linear-gradient(120deg,#FFF8E7,#FFFDE7)", border:"1.5px solid #F0D98A", borderRadius:12, padding:"14px 16px" },
  surveyLabel: { fontSize:10, fontWeight:700, color:"#C8A84B", letterSpacing:"0.1em", marginBottom:4 },
  surveyTitle: { fontSize:14, fontWeight:900, lineHeight:1.4 },
  surveyDeadline: { display:"inline-flex", alignItems:"center", gap:4, background:"#C8A84B", color:"#0D1B2A", fontFamily:"monospace", fontSize:12, fontWeight:700, padding:"3px 10px", borderRadius:999, marginTop:8 },
  rankingHeader: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 14px" },
  rankingList: { padding:"0 14px 16px", display:"flex", flexDirection:"column", gap:8 },
  rankItem: { background:"white", borderRadius:10, padding:"12px 14px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 1px 5px rgba(0,0,0,0.06)", cursor:"pointer" },
  rankNum: { fontFamily:"monospace", fontSize:18, fontWeight:700, width:28, textAlign:"center", flexShrink:0 },
  rankImg: { width:52, height:52, borderRadius:8, objectFit:"cover", flexShrink:0 },
  rankThumb: { width:52, height:52, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  rankTitle: { fontSize:13, fontWeight:700, marginBottom:3 },
  rankMeta: { fontSize:11, color:"#5A7370", display:"flex", gap:8 },
  rankParticipants: { fontSize:11, fontWeight:700, color:"#007A6E" },
};