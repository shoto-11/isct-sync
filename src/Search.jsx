import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { THEME, GENRE_STYLES, GENRE_EMOJI, GENRE_TAGS, TARGET_TAGS, CAMPUS_TAGS, STYLE_TAGS, ORGANIZER_TAGS } from "./constants";
import { BG_COLOR } from "./constants";
import { Calendar, MapPin } from "lucide-react";
import "./animations.css";

export default function Search() {
  const [keyword, setKeyword] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();

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
    };
    fetch();
  }, []);

  const handleSearch = () => {
    setSearched(true);
    const filtered = allEvents.filter(event => {
      const matchKeyword = keyword === "" ||
        event.title?.toLowerCase().includes(keyword.toLowerCase()) ||
        event.detail?.toLowerCase().includes(keyword.toLowerCase()) ||
        event.location?.toLowerCase().includes(keyword.toLowerCase()) ||
        event.organizerName?.toLowerCase().includes(keyword.toLowerCase());

      const matchTags = selectedTags.length === 0 || selectedTags.every(tag =>
        event.tags?.genre === tag ||
        event.tags?.targets?.includes(tag) ||
        event.tags?.campus === tag ||
        event.tags?.style === tag ||
        event.tags?.organizer === tag
      );

      return matchKeyword && matchTags;
    });
    setResults(filtered);
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const TagSection = ({ title, tags }) => (
    <div style={s.tagSection}>
      <h3 style={s.tagSectionTitle}>{title}</h3>
      <div style={s.tagGrid}>
        {tags.map(tag => (
          <button
            key={tag}
            style={{ ...s.tagBtn, ...(selectedTags.includes(tag) ? s.tagBtnActive : {}) }}
            onClick={() => toggleTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div style={s.container}>
      <div style={s.inner}>
        <h1 style={s.heading}>イベントをさがす</h1>

        {/* 検索バー */}
        <div style={s.searchBar}>
          <input
            style={s.searchInput}
            placeholder="イベント名・場所・募集者名で検索"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            autoFocus
          />
          <button style={s.searchBtn} onClick={handleSearch}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </button>
        </div>

        {/* タグ一覧 */}
        {!searched && (
          <div style={s.tagContainer}>
            <TagSection title="ジャンル" tags={GENRE_TAGS} />
            <TagSection title="対象者" tags={TARGET_TAGS} />
            <TagSection title="キャンパス" tags={CAMPUS_TAGS} />
            <TagSection title="参加スタイル" tags={STYLE_TAGS} />
            <TagSection title="募集者" tags={ORGANIZER_TAGS} />
            {selectedTags.length > 0 && (
              <button style={s.searchBtnFull} onClick={handleSearch}>
                選択したタグで検索
              </button>
            )}
          </div>
        )}

        {/* 検索結果 */}
        {searched && (
          <div>
            <div style={s.resultHeader}>
              <span style={s.resultCount}>{results.length}件</span>
              <button style={s.resetBtn} onClick={() => { setSearched(false); setKeyword(""); setSelectedTags([]); }}>
                ← 検索条件をリセット
              </button>
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
  searchBtn: { background:"#88203a", border:"none", borderRadius:8, padding:"0 16px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
  tagContainer: { display:"flex", flexDirection:"column", gap:20 },
  tagSection: { background:"white", borderRadius:12, padding:"16px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" },
  tagSectionTitle: { fontSize:15, fontWeight:700, color:"#111", marginBottom:12, margin:"0 0 12px" },
  tagGrid: { display:"flex", flexWrap:"wrap", gap:8 },
  tagBtn: { padding:"6px 14px", borderRadius:999, border:"1.5px solid #D0DDD9", background:"white", fontSize:13, fontWeight:600, color:"#5A7370", cursor:"pointer" },
  tagBtnActive: { background:"#88203a", color:"white", border:"1.5px solid #88203a" },
  searchBtnFull: { padding:"12px", background:"#88203a", color:"white", border:"none", borderRadius:8, fontSize:15, fontWeight:700, cursor:"pointer", width:"100%" },
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