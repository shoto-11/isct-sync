import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { THEME, BG_COLOR, GENRE_STYLES, GENRE_EMOJI } from "./constants";
import { ChevronLeft, ChevronRight, X, Clock, MapPin, User } from "lucide-react";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export default function CalendarPage({ onEventSelect }) {
  const [today] = useState(new Date());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [allEvents, setAllEvents] = useState([]);
  const [statsMap, setStatsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setAllEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 人気度スコア取得
      const statsSnap = await getDocs(collection(db, "eventStats"));
      const map = {};
      statsSnap.docs.forEach(d => {
        const data = d.data();
        const key = data.eventId || d.id;
        map[key] = (data.views || []).length + (data.likes || []).length * 3 + (data.joins || []).length * 5;
      });
      setStatsMap(map);
      setLoading(false);
    };
    fetch();
  }, []);

  const filteredEvents = allEvents.filter(event => {
    if (filter === "all") return true;
    if (!event.deadline) return true;
    const deadlineStr = event.deadlineTime
      ? `${event.deadline}T${event.deadlineTime}`
      : `${event.deadline}T23:59`;
    return new Date(deadlineStr) >= new Date();
  });

  // 日付 → イベントマップ（人気順ソート済み）
  const eventsByDate = {};
  filteredEvents.forEach(event => {
    const dates = [];
    if (event.dates && event.dates.length > 0) {
      event.dates.forEach(d => { if (d.date && !d.date.includes("00")) dates.push(d); });
    } else if (event.date) {
      dates.push({ date: event.date, startTime: event.startTime, endTime: event.endTime });
    }
    dates.forEach(dateObj => {
      if (!eventsByDate[dateObj.date]) eventsByDate[dateObj.date] = [];
      eventsByDate[dateObj.date].push({ ...event, _thisDateInfo: dateObj });
    });
  });

  // 各日を人気順でソート
  Object.keys(eventsByDate).forEach(date => {
    eventsByDate[date].sort((a, b) => (statsMap[b.id] || 0) - (statsMap[a.id] || 0));
  });

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
    setSelectedDate(null);
  };

  const isToday = (day) =>
    day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  const handleDayClick = (day) => {
  if (!day) return;
  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const evs = eventsByDate[dateStr] || [];
  // 詳細パネルは時間順
  const timeSorted = [...evs].sort((a, b) =>
    (a._thisDateInfo?.startTime || "").localeCompare(b._thisDateInfo?.startTime || "")
  );
  setSelectedDate(dateStr);
  setSelectedDayEvents(timeSorted);
};

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return "";
    const [, m, d] = dateStr.split("-");
    const w = WEEKDAYS[new Date(dateStr).getDay()];
    return `${parseInt(m)}月${parseInt(d)}日（${w}）`;
  };

  const isExpired = (event) => {
    if (!event.deadline) return false;
    const deadlineStr = event.deadlineTime
      ? `${event.deadline}T${event.deadlineTime}`
      : `${event.deadline}T23:59`;
    return new Date(deadlineStr) < new Date();
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", background: BG_COLOR }}>
      <div style={{ fontSize: 14, color: "#5A7370", fontWeight: 600 }}>読み込み中...</div>
    </div>
  );

  return (
    <div style={{ background: BG_COLOR, minHeight: "100vh", paddingBottom: 40 }}>
      {/* ヘッダー */}
      <div style={{ background: THEME, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <h1 style={{ flex: 1, color: "white", fontSize: 17, fontWeight: 700, margin: 0, textAlign: "center" }}>イベントカレンダー</h1>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "12px 8px" }}>

        {/* フィルター */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, padding: "0 8px" }}>
          <button
            className={`tag-tab-btn ${filter === "active" ? "tag-active-tab" : ""}`}
            style={{ flex: 1, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            onClick={() => { setFilter("active"); setSelectedDate(null); }}
          >募集中のみ</button>
          <button
            className={`tag-tab-btn ${filter === "all" ? "tag-active-tab" : ""}`}
            style={{ flex: 1, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            onClick={() => { setFilter("all"); setSelectedDate(null); }}
          >すべて表示</button>
        </div>

        {/* カレンダー */}
        <div style={{ background: "white", borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", overflow: "hidden", marginBottom: 12 }}>

          {/* 月ナビ */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #F0F0F0" }}>
            <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", color: THEME, display: "flex", alignItems: "center", padding: 4 }}>
              <ChevronLeft size={22} />
            </button>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#111" }}>
              {currentYear}年 {currentMonth + 1}月
            </span>
            <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", color: THEME, display: "flex", alignItems: "center", padding: 4 }}>
              <ChevronRight size={22} />
            </button>
          </div>

          {/* 曜日ヘッダー */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #EEEEEE" }}>
            {WEEKDAYS.map((w, i) => (
              <div key={w} style={{
                textAlign: "center", padding: "6px 0", fontSize: 11, fontWeight: 800,
                color: i === 0 ? "#E53935" : i === 6 ? "#1565C0" : "#5A7370"
              }}>{w}</div>
            ))}
          </div>

          {/* 日付グリッド */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {cells.map((day, idx) => {
              const dateStr = day
                ? `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                : null;
              const dayEvents = dateStr ? (eventsByDate[dateStr] || []) : [];
              const totalCount = dayEvents.length;
              const displayEvents = dayEvents.slice(0, 6); // 最大6件
              const isTodayCell = day && isToday(day);
              const isSelected = dateStr === selectedDate;
              const isSun = idx % 7 === 0;
              const isSat = idx % 7 === 6;

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(day)}
                  style={{
                    minHeight: 80,
                    padding: "4px 2px 4px",
                    borderBottom: "1px solid #F0F0F0",
                    borderRight: (idx + 1) % 7 !== 0 ? "1px solid #F0F0F0" : "none",
                    background: isSelected ? "#FFF0F3" : isTodayCell ? "#FFF8F9" : "white",
                    cursor: day ? "pointer" : "default",
                    overflow: "hidden",
                    boxSizing: "border-box",
                  }}
                >
                  {day && (
                    <>
                      {/* 日付番号 */}
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%",
                        background: isTodayCell ? THEME : "none",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto 3px",
                        fontSize: 11, fontWeight: isTodayCell ? 800 : 600,
                        color: isTodayCell ? "white" : isSun ? "#E53935" : isSat ? "#1565C0" : "#333",
                        flexShrink: 0,
                      }}>{day}</div>

                      {/* イベントタグ（最大6件） */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {displayEvents.map((ev, i) => {
                          const genre = Array.isArray(ev.tags?.genre) ? ev.tags.genre[0] : ev.tags?.genre;
                          const color = GENRE_STYLES[genre]?.color || THEME;
                          const bg = GENRE_STYLES[genre]?.bg || "#F9EAED";
                          return (
                            <div
                              key={`${ev.id}-${i}`}
                              style={{
                                background: bg,
                                borderLeft: `2px solid ${color}`,
                                borderRadius: "0 3px 3px 0",
                                padding: "1px 3px",
                                fontSize: "clamp(8px, 2vw, 10px)",
                                fontWeight: 700,
                                color: "#111",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                lineHeight: 1.4,
                                minWidth: 0,
                              }}
                            >
                              {ev.title}
                            </div>
                          );
                        })}

                        {/* 件数オーバー表示 */}
                        {totalCount > 6 && (
                            <div style={{
                                fontSize: "clamp(7px, 1.8vw, 9px)",
                                color: "#9AADA8", fontWeight: 800,
                                paddingLeft: 3, lineHeight: 1.4,
                            }}>
                                ...
                            </div>
                            )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 選択日のイベント詳細パネル */}
        {selectedDate && (
          <div style={{ background: "white", borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", overflow: "hidden", margin: "0 0 12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #F0F0F0", background: "#FAFAFA" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>{formatDateLabel(selectedDate)}</span>
                <span style={{ background: "#F9EAED", color: THEME, fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999 }}>
                  {selectedDayEvents.length}件
                </span>
              </div>
              <button onClick={() => setSelectedDate(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9AADA8", display: "flex" }}>
                <X size={18} />
              </button>
            </div>

            {selectedDayEvents.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "#9AADA8", fontSize: 13 }}>
                この日のイベントはありません
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {selectedDayEvents.map((event, i) => {
                  const genre = Array.isArray(event.tags?.genre) ? event.tags.genre[0] : event.tags?.genre;
                  const genreStyle = GENRE_STYLES[genre] || { bg: "#F5F5F5", color: "#5A7370" };
                  const expired = isExpired(event);
                  const timeInfo = event._thisDateInfo;

                  return (
                    <div
                      key={`${event.id}-${i}`}
                      className="event-hover-card"
                      onClick={() => onEventSelect(event)}
                      style={{
                        display: "flex", gap: 0, cursor: "pointer",
                        borderBottom: i < selectedDayEvents.length - 1 ? "1px solid #F5F5F5" : "none",
                        opacity: expired ? 0.65 : 1,
                      }}
                    >
                      {/* 時間列 */}
                      <div style={{
                        width: 56, flexShrink: 0, padding: "12px 6px",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
                        borderRight: "1px solid #F0F0F0", background: "#FAFAFA", gap: 2,
                      }}>
                        <Clock size={10} color="#9AADA8" />
                        {timeInfo?.startTime ? (
                          <>
                            <span style={{ fontSize: 11, fontWeight: 800, color: THEME }}>{timeInfo.startTime}</span>
                            {timeInfo.endTime && <span style={{ fontSize: 9, color: "#9AADA8" }}>〜{timeInfo.endTime}</span>}
                          </>
                        ) : (
                          <span style={{ fontSize: 9, color: "#9AADA8" }}>未定</span>
                        )}
                      </div>

                      {/* イベント情報 */}
                      <div style={{ flex: 1, padding: "12px 12px", minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4, flexWrap: "wrap" }}>
                          {expired && <span style={{ fontSize: 9, fontWeight: 800, color: "#9AADA8", background: "#F5F5F5", padding: "1px 6px", borderRadius: 999 }}>締切済</span>}
                          {genre && <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 999, background: genreStyle.bg, color: genreStyle.color }}>{genre}</span>}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#111", marginBottom: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {event.title}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {event.organizerName && (
                            <span style={{ fontSize: 11, color: "#5A7370", display: "flex", alignItems: "center", gap: 3 }}>
                              <User size={11} /> {event.organizerName}
                            </span>
                          )}
                          {event.location && (
                            <span style={{ fontSize: 11, color: "#5A7370", display: "flex", alignItems: "center", gap: 3 }}>
                              <MapPin size={11} /> {event.location}
                            </span>
                          )}
                        </div>
                      </div>

                      {event.imageUrl && (
                        <div style={{ flexShrink: 0, padding: "10px 10px 10px 0" }}>
                          <img src={event.imageUrl} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: "cover" }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!selectedDate && (
          <div style={{ background: "white", borderRadius: 12, padding: "12px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", textAlign: "center", margin: "0 0 12px" }}>
            <div style={{ fontSize: 12, color: "#9AADA8" }}>日付をタップするとイベントを確認できます</div>
          </div>
        )}
      </div>
    </div>
  );
}