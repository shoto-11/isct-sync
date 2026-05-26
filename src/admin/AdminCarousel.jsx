import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { THEME } from "../constants";
import "../animations.css";

export default function AdminCarousel() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [carouselEventIds, setCarouselEventIds] = useState([]);
  const [carouselSearch, setCarouselSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDoc(doc(db, "adminSettings", "display"));
      if (snap.exists()) {
        const saved = localStorage.getItem("carouselEventIds");
        setCarouselEventIds(saved ? JSON.parse(saved) : (snap.data().carouselEventIds || []));
      }
      const eventsSnap = await getDocs(collection(db, "events"));
      setEvents(eventsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "adminSettings", "display"), { carouselEventIds });
    } catch {
      await setDoc(doc(db, "adminSettings", "display"), { carouselEventIds });
    }
    setSaving(false);
    alert("保存しました！");
  };

  const toggleCarousel = (eventId) => {
    setCarouselEventIds(prev => {
      const next = prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId];
      localStorage.setItem("carouselEventIds", JSON.stringify(next));
      return next;
    });
  };

  const moveCarousel = (eventId, dir) => {
    setCarouselEventIds(prev => {
      const index = prev.indexOf(eventId);
      if (index === -1) return prev;
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      localStorage.setItem("carouselEventIds", JSON.stringify(next));
      return next;
    });
  };

  if (loading) return <p style={{ padding: 24 }}>読み込み中...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700 }}>PR広告に表示するイベント（最大10件）</h2>

      {carouselEventIds.length > 0 && (
        <div style={s.card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#5A7370" }}>
            選択中（表示順）<span style={{ fontSize: 11, fontWeight: "normal", color: "#9AADA8", marginLeft: 4 }}>※ドラッグで並び替えできます</span>
          </h3>
          {carouselEventIds.map((id, i) => {
            const event = events.find(e => e.id === id);
            if (!event) return null;
            return (
              <div key={id} draggable
                onDragStart={() => setDraggedIndex(i)}
                onDragOver={(e) => { e.preventDefault(); if (dragOverIndex !== i) setDragOverIndex(i); }}
                onDragEnd={() => {
                  if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
                    setCarouselEventIds(prev => {
                      const next = [...prev];
                      const [removed] = next.splice(draggedIndex, 1);
                      next.splice(dragOverIndex, 0, removed);
                      localStorage.setItem("carouselEventIds", JSON.stringify(next));
                      return next;
                    });
                  }
                  setDraggedIndex(null); setDragOverIndex(null);
                }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", borderBottom: "1px solid #F0F0F0", cursor: "grab", backgroundColor: draggedIndex === i ? "#F4F6F5" : dragOverIndex === i ? "#F9EAED" : "transparent", opacity: draggedIndex === i ? 0.5 : 1, transition: "background-color 0.2s ease, opacity 0.2s ease", borderRadius: 6 }}
              >
                <div style={{ color: "#B0BEC5", fontSize: 16, cursor: "grab", userSelect: "none", paddingRight: 4 }}>☰</div>
                <div style={{ fontSize: 13, fontWeight: 700, minWidth: 20 }}>{i + 1}.</div>
                {event.imageUrl ? <img src={event.imageUrl} alt="" style={{ width: 50, height: 28, objectFit: "cover", borderRadius: 4, flexShrink: 0, pointerEvents: "none" }} /> : <div style={{ width: 50, height: 28, background: "#F4F6F5", borderRadius: 4, flexShrink: 0, pointerEvents: "none" }} />}
                <div style={{ fontSize: 13, fontWeight: 700, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", pointerEvents: "none" }}>{event.title}</div>
                <button type="button" style={s.smallBtn} onClick={(e) => { e.stopPropagation(); moveCarousel(id, -1); }} disabled={i === 0}>↑</button>
                <button type="button" style={s.smallBtn} onClick={(e) => { e.stopPropagation(); moveCarousel(id, 1); }} disabled={i === carouselEventIds.length - 1}>↓</button>
                <button type="button" style={{ ...s.smallBtn, color: "#E53935" }} onClick={(e) => { e.stopPropagation(); toggleCarousel(id); }}>✕</button>
              </div>
            );
          })}
        </div>
      )}

      <button className="submit-btn" style={{ width: "100%", padding: 14, border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 12 }} onClick={handleSave} disabled={saving}>
        {saving ? "保存中..." : "PR広告の設定を保存する"}
      </button>

      <div style={{ height: 1, background: "#E0E8E7", margin: "12px 0" }} />

      <input style={s.input} placeholder="イベント名・主催者名で検索..." value={carouselSearch} onChange={e => setCarouselSearch(e.target.value)} />
      {events.filter(e => !carouselSearch || e.title?.includes(carouselSearch) || e.organizerName?.includes(carouselSearch)).map(event => (
        <div key={event.id} className="event-hover-card" style={s.listItem}>
          {event.imageUrl ? <img src={event.imageUrl} alt="" style={{ width: 60, height: 34, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} /> : <div style={{ width: 60, height: 34, background: "#F4F6F5", borderRadius: 6, flexShrink: 0 }} />}
          <div style={{ flex: 1, cursor: "pointer" }} onClick={() => navigate(`/events/${event.id}`)}>
            <div className="hover-title-underline" style={{ fontSize: 14, fontWeight: 700 }}>{event.title}</div>
            <div style={{ fontSize: 11, color: "#5A7370" }}>{event.organizerName}</div>
          </div>
          <button
            className={`tag-tab-btn ${carouselEventIds.includes(event.id) ? "tag-active-tab" : ""}`}
            style={{ padding: "6px 16px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            onClick={() => toggleCarousel(event.id)}
            disabled={!carouselEventIds.includes(event.id) && carouselEventIds.length >= 10}
          >
            {carouselEventIds.includes(event.id) ? "選択中" : "選択"}
          </button>
        </div>
      ))}
    </div>
  );
}

const s = {
  card: { background: "white", borderRadius: 12, padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: 10 },
  listItem: { background: "white", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  input: { padding: "10px 14px", border: "1.5px solid #D0DDD9", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" },
  smallBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 16, fontWeight: 700, padding: "2px 6px", color: "#5A7370" },
};
