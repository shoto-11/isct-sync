import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, getDocs, orderBy, query, getDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { THEME, GENRE_STYLES, GENRE_EMOJI, GENRE_TAGS, TARGET_TAGS, CAMPUS_TAGS, STYLE_TAGS, ORGANIZER_TAGS,RECRUIT_TAGS } from "./constants";
import { BG_COLOR } from "./constants";
import { Calendar, MapPin } from "lucide-react";
import "./animations.css";

const TagSection = ({ title, tags, selectedTags, onToggle }) => (
    <div style={s.tagSection}>
    <h3 style={s.tagSectionTitle}>{title}</h3>
    <div style={s.tagGrid}>
        {tags.map(tag => {
        const isActive = selectedTags.includes(tag);
        return (
            <button
            key={tag}
            className={`tag-tab-btn ${isActive ? "tag-active-tab" : ""}`}
            style={s.tagBtn}
            onClick={() => onToggle(tag)}
            >
            {tag}
            </button>
        );
        })}
    </div>
    </div>
);

export default function Search() {
  const [keyword, setKeyword] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();
  const [sortMode, setSortMode] = useState("newest");
const [statsMap, setStatsMap] = useState({});

  useEffect(() => {
    const fetch = async () => {
      const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const now = new Date();
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(event => {
          if (!event.deadline) return true;
          const deadlineStr = event.deadlineTime
            ? `${event.deadline}T${event.deadlineTime}`
            : `${event.deadline}T23:59`;
          return new Date(deadlineStr) > now;
        });
      setAllEvents(list);
      const statsSnap = await getDocs(collection(db, "eventStats"));
      const map = {};
      statsSnap.docs.forEach(d => {
        const data = d.data();
        const key = data.eventId || d.id;
        map[key] = {
          views: (data.views || []).length,
          likes: (data.likes || []).length,
          joins: (data.joins || []).length,
          applies: data.applyCount || 0,
        };
      });
      setStatsMap(map);
    };
    fetch();
  }, []);

  useEffect(() => {
    if (searched) setResults(prev => sortResults(prev, sortMode));
  }, [sortMode]);

    const handleSearch = () => {
    setSearched(true);  // ← これも抜けていたので追加
    const filtered = allEvents.filter(event => {
      const matchKeyword = keyword === "" ||
        event.title?.toLowerCase().includes(keyword.toLowerCase()) ||
        event.detail?.toLowerCase().includes(keyword.toLowerCase()) ||
        event.location?.toLowerCase().includes(keyword.toLowerCase()) ||
        event.organizerName?.toLowerCase().includes(keyword.toLowerCase());

      const matchTags = selectedTags.length === 0 || (() => {
        const selectedGenre = selectedTags.filter(t => GENRE_TAGS.includes(t));
        const selectedRecruit = selectedTags.filter(t => RECRUIT_TAGS.includes(t));
        const selectedTarget = selectedTags.filter(t => TARGET_TAGS.includes(t));
        const selectedCampus = selectedTags.filter(t => CAMPUS_TAGS.includes(t));
        const selectedStyle = selectedTags.filter(t => STYLE_TAGS.includes(t));
        const selectedOrganizer = selectedTags.filter(t => ORGANIZER_TAGS.includes(t));

        if (selectedGenre.length > 0 && !selectedGenre.some(t => event.tags?.genre === t)) return false;
        if (selectedRecruit.length > 0 && !selectedRecruit.some(t => event.tags?.recruit === t)) return false;
        if (selectedTarget.length > 0 && !selectedTarget.some(t => event.tags?.targets?.includes(t))) return false;
        if (selectedCampus.length > 0 && !selectedCampus.some(t => event.tags?.campus === t)) return false;
        if (selectedStyle.length > 0 && !selectedStyle.some(t => event.tags?.style === t)) return false;
        if (selectedOrganizer.length > 0 && !selectedOrganizer.some(t => event.tags?.organizer === t)) return false;
        return true;
      })();

      return matchKeyword && matchTags;
    });
    setResults(sortResults(filtered, sortMode)); // ← filtered定義の後に移動
  };

const sortResults = (list, mode) => {
  return [...list].sort((a, b) => {
    const sa = statsMap[a.id] || {};
    const sb = statsMap[b.id] || {};
    if (mode === "views") return (sb.views || 0) - (sa.views || 0);
    if (mode === "likes") return (sb.likes || 0) - (sa.likes || 0);
    if (mode === "joins") return (sb.joins || 0) - (sa.joins || 0);
    if (mode === "applies") return (sb.applies || 0) - (sa.applies || 0);
    const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return tb - ta;
  });
};

  const toggleTag = (tag) => {
  setSelectedTags(prev => {
    const next = prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag];
    
    // 検索済みの場合は自動で再検索
    if (searched) {
      const filtered = allEvents.filter(event => {
        const matchKeyword = keyword === "" ||
          event.title?.toLowerCase().includes(keyword.toLowerCase()) ||
          event.detail?.toLowerCase().includes(keyword.toLowerCase()) ||
          event.location?.toLowerCase().includes(keyword.toLowerCase()) ||
          event.organizerName?.toLowerCase().includes(keyword.toLowerCase());

        const selectedGenre = next.filter(t => GENRE_TAGS.includes(t));
        const selectedRecruit = next.filter(t => RECRUIT_TAGS.includes(t));
        const selectedTarget = next.filter(t => TARGET_TAGS.includes(t));
        const selectedCampus = next.filter(t => CAMPUS_TAGS.includes(t));
        const selectedStyle = next.filter(t => STYLE_TAGS.includes(t));
        const selectedOrganizer = next.filter(t => ORGANIZER_TAGS.includes(t));

        const matchTags = next.length === 0 || (() => {
          if (selectedGenre.length > 0 && !selectedGenre.some(t => event.tags?.genre === t)) return false;
          if (selectedRecruit.length > 0 && !selectedRecruit.some(t => event.tags?.recruit === t)) return false;
          if (selectedTarget.length > 0 && !selectedTarget.some(t => event.tags?.targets?.includes(t))) return false;
          if (selectedCampus.length > 0 && !selectedCampus.some(t => event.tags?.campus === t)) return false;
          if (selectedStyle.length > 0 && !selectedStyle.some(t => event.tags?.style === t)) return false;
          if (selectedOrganizer.length > 0 && !selectedOrganizer.some(t => event.tags?.organizer === t)) return false;
          return true;
        })();

        return matchKeyword && matchTags;
      });
      setResults(sortResults(filtered, sortMode));
    }
    return next;
  });
};

  return (
    <div style={s.container}>
      <div style={s.inner}>
        <h1 style={s.heading}>イベントをさがす</h1>

        {/* 検索バー */}
        <div style={s.searchBar}>
          <input
            style={s.searchInput}
            placeholder="イベント名・場所・主催者名で検索"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            autoFocus
          />
          <button className="submit-btn" style={s.searchBtn} onClick={handleSearch}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </button>
        </div>

        {/* タグ一覧 */}
        {!searched && (
          <div style={s.tagContainer}>
            <TagSection title="ジャンル" tags={GENRE_TAGS} selectedTags={selectedTags} onToggle={toggleTag} />
            <TagSection title="募集種別" tags={RECRUIT_TAGS} selectedTags={selectedTags} onToggle={toggleTag} />
            <TagSection title="対象者" tags={TARGET_TAGS} selectedTags={selectedTags} onToggle={toggleTag} />
            <TagSection title="キャンパス" tags={CAMPUS_TAGS} selectedTags={selectedTags} onToggle={toggleTag} />
            <TagSection title="参加スタイル" tags={STYLE_TAGS} selectedTags={selectedTags} onToggle={toggleTag} />
            <TagSection title="主催者種別" tags={ORGANIZER_TAGS} selectedTags={selectedTags} onToggle={toggleTag} />
            {selectedTags.length > 0 && (
              <button className="submit-btn" style={s.searchBtnFull} onClick={handleSearch}>
                選択したタグで検索
              </button>
            )}
          </div>
        )}

        {/* 検索結果 */}
        {searched && (
  <div>
    {/* 検索条件に戻る＋ソート */}
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <button style={s.resetBtn} onClick={() => { setSearched(false); }}>
        ← 検索条件に戻る
      </button>
      <select
        style={{ padding: "6px 12px", border: "1.5px solid #D0DDD9", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#5A7370", background: "white", cursor: "pointer", outline: "none" }}
        value={sortMode} onChange={e => setSortMode(e.target.value)}
      >
        <option value="newest">新着順</option>
        <option value="views">閲覧数順</option>
        <option value="likes">いいね数順</option>
        <option value="joins">参加予定数順</option>
        <option value="applies">申し込み数順</option>
      </select>
    </div>

        {/* 選択中タグ */}
        {selectedTags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {[...GENRE_TAGS, ...RECRUIT_TAGS, ...TARGET_TAGS, ...CAMPUS_TAGS, ...STYLE_TAGS, ...ORGANIZER_TAGS]
              .filter(tag => selectedTags.includes(tag))
              .map(tag => (
                <span
                  key={tag}
                  className="tag-tab-btn tag-active-tab"
                  style={{ padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  onClick={() => toggleTag(tag)}
                >
                  {tag} ✕
                </span>
              ))}
          </div>
        )}

        {/* 件数 */}
        <div style={{ marginBottom: 12 }}>
          <span style={s.resultCount}>{results.length}件</span>
        </div>

            {results.length === 0 ? (
              <p style={s.empty}>該当するイベントが見つかりませんでした</p>
            ) : (
              <div style={s.resultList}>
                {results.map(event => {
                  const cs = GENRE_STYLES[event.tags?.genre] || { bg:"#F5F5F5", color:"#616161" };
                  const emoji = GENRE_EMOJI[event.tags?.genre] || "📌";
                  return (
                    <div 
                      key={event.id} 
                      className="event-hover-card" /* 💡 animations.css の共通ホバークラスを適用 */
                      style={s.resultItem} 
                      onClick={() => navigate(`/events/${event.id}`)}
                    >
                      {event.imageUrl ? (
                        <img src={event.imageUrl} alt={event.title} style={s.resultThumb} />
                      ) : (
                        <div style={{ ...s.resultThumb, background:cs.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>
                          {emoji}
                        </div>
                      )}
                      <div style={s.resultInfo}>
                        {/* 💡 ホバー時に下線が連動して引かれるクラス名を追加 */}
                        <div className="hover-title-underline" style={s.resultTitle}>
                          {event.title}
                        </div>
                        <div style={{ ...s.resultMeta, display:"flex", alignItems:"center", gap:6 }}>
                          <Calendar size={11} /> {event.date} <MapPin size={11} /> {event.location}
                        </div>
                        <div style={s.resultTags}>
                          {event.tags?.genre && <span style={{ ...s.resultTag, background:cs.bg, color:cs.color }}>{event.tags.genre}</span>}
                          {event.tags?.campus && <span style={s.resultTagGray}>{event.tags.campus}</span>}
                        </div>
                        <div style={s.resultOrganizer}>{event.organizerName}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  container: { background:BG_COLOR, minHeight:"100vh" },
  inner: { maxWidth:800, margin:"0 auto", padding:"24px 16px" },
  heading: { fontSize:22, fontWeight:700, color:"#111", marginBottom:20 },
  searchBar: { display:"flex", gap:8, marginBottom:24 },
  searchInput: { flex:1, padding:"12px 16px", border:"2px solid #88203a", borderRadius:8, fontSize:15, outline:"none", fontFamily:"inherit" },
  searchBtn: { borderRadius:8, padding:"0 16px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
  searchBtnFull: { padding:"12px", borderRadius:8, fontSize:15, fontWeight:700, cursor:"pointer", width:"100%" },
  tagContainer: { display:"flex", flexDirection:"column", gap:20 },
  tagSection: { background:"white", borderRadius:12, padding:"16px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" },
  tagSectionTitle: { fontSize:15, fontWeight:700, color:"#111", marginBottom:12, margin:"0 0 12px" },
  tagGrid: { display:"flex", flexWrap:"wrap", gap:8 },
  tagBtn: { padding:"6px 14px", borderRadius:999, fontSize:13, fontWeight:600, cursor:"pointer" },
  resultHeader: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 },
  resultCount: { fontSize:16, fontWeight:700, color:"#111" },
  resetBtn: { background:"none", border:"none", color:"#88203a", fontSize:13, fontWeight:700, cursor:"pointer" },
  empty: { color:"#5A7370", fontSize:14, textAlign:"center", padding:"32px 0" },
  resultList: { display:"flex", flexDirection:"column", gap:12 },
  resultItem: { background:"white", borderRadius:12, padding:"12px", display:"flex", gap:12, cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" },
  resultThumb: { width:80, height:80, borderRadius:8, objectFit:"cover", flexShrink:0 },
  resultInfo: { flex:1, display:"flex", flexDirection:"column", gap:4 },
  resultTitle: { fontSize:15, fontWeight:700, color:"#111" },
  resultMeta: { fontSize:12, color:"#5A7370" },
  resultTags: { display:"flex", gap:6, flexWrap:"wrap" },
  resultTag: { fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:999 },
  resultTagGray: { fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:999, background:"#F5F5F5", color:"#616161" },
  resultOrganizer: { fontSize:11, color:"#5A7370" },
};