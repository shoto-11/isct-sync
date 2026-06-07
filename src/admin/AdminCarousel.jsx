import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { THEME } from "../constants";
import "../animations.css";
function SortableCarouselItem({ id, i, event, total, onMove, onRemove, onDragStart, onDragOver, onDragEnd, draggedIndex, dragOverIndex, setCarouselEventIds, events }) {
  const [touching, setTouching] = useState(false);
  const [touchPos, setTouchPos] = useState({ x: 0, y: 0 });
  const touchStartY = useRef(null);
  const itemRef = useRef(null);
  const [itemRect, setItemRect] = useState(null);

  const handleTouchStart = (e) => {
    const rect = itemRef.current?.getBoundingClientRect();
    setItemRect(rect);
    touchStartY.current = e.touches[0].clientY;
    setTouchPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setTouching(true);
    onDragStart(i);
  };

  const handleTouchEnd = () => {
    setTouching(false);
    onDragEnd();
  };

  // passive: false で touchmove を登録
  useEffect(() => {
    const el = itemRef.current;
    if (!el) return;
    const handleTouchMove = (e) => {
      e.preventDefault();
      const currentY = e.touches[0].clientY;
      setTouchPos({ x: e.touches[0].clientX, y: currentY });
      const els = document.querySelectorAll(".carousel-sort-item");
      els.forEach((el, idx) => {
        const rect = el.getBoundingClientRect();
        if (currentY >= rect.top && currentY <= rect.bottom) {
          onDragOver(idx);
        }
      });
    };
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", handleTouchMove);
  }, [i, onDragOver]);

  if (!event) return null;

  const isDragging = draggedIndex === i;

  return (
    <>
      {/* 浮いたゴースト */}
      {touching && isDragging && itemRect && (
        <div style={{
          position: "fixed",
          left: itemRect.left,
          top: touchPos.y - itemRect.height / 2,
          width: itemRect.width,
          height: itemRect.height,
          background: "white",
          borderRadius: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
          zIndex: 9999,
          display: "flex", alignItems: "center", gap: 12, padding: "10px 8px",
          opacity: 0.95,
          pointerEvents: "none",
          transform: "scale(1.03)",
          transition: "box-shadow 0.15s",
        }}>
          <div style={{ color: "#B0BEC5", fontSize: 16 }}>☰</div>
          <div style={{ fontSize: 13, fontWeight: 700, minWidth: 20 }}>{i + 1}.</div>
          {event.imageUrl
            ? <img src={event.imageUrl} alt="" style={{ width: 50, height: 28, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
            : <div style={{ width: 50, height: 28, background: "#F4F6F5", borderRadius: 4, flexShrink: 0 }} />
          }
          <div style={{ fontSize: 13, fontWeight: 700, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.title}</div>
        </div>
      )}

      {/* 実際のアイテム */}
      <div
        ref={itemRef}
        className="carousel-sort-item"
        draggable
        onDragStart={() => onDragStart(i)}
        onDragOver={(e) => { e.preventDefault(); onDragOver(i); }}
        onDragEnd={onDragEnd}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          display: "flex", alignItems: "center", gap: 12, padding: "10px 8px",
          borderBottom: "1px solid #F0F0F0",
          cursor: "grab",
          backgroundColor: dragOverIndex === i && !isDragging ? "#F9EAED" : "transparent",
          opacity: isDragging && touching ? 0.3 : 1,
          transition: "background-color 0.2s, opacity 0.2s",
          borderRadius: 6,
          touchAction: "none",
        }}
      >
        <div style={{ color: "#B0BEC5", fontSize: 16, userSelect: "none" }}>☰</div>
        <div style={{ fontSize: 13, fontWeight: 700, minWidth: 20 }}>{i + 1}.</div>
        {event.imageUrl
          ? <img src={event.imageUrl} alt="" style={{ width: 50, height: 28, objectFit: "cover", borderRadius: 4, flexShrink: 0, pointerEvents: "none" }} />
          : <div style={{ width: 50, height: 28, background: "#F4F6F5", borderRadius: 4, flexShrink: 0, pointerEvents: "none" }} />
        }
        <div style={{ fontSize: 13, fontWeight: 700, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", pointerEvents: "none" }}>{event.title}</div>
        <button type="button" style={s.smallBtn} onClick={(e) => { e.stopPropagation(); onMove(id, -1); }} disabled={i === 0}>↑</button>
        <button type="button" style={s.smallBtn} onClick={(e) => { e.stopPropagation(); onMove(id, 1); }} disabled={i === total - 1}>↓</button>
        <button type="button" style={{ ...s.smallBtn, color: "#E53935" }} onClick={(e) => { e.stopPropagation(); onRemove(id); }}>✕</button>
      </div>
    </>
  );
}

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
      const firestoreIds = snap.data().carouselEventIds || [];
      setCarouselEventIds(firestoreIds);
      localStorage.setItem("carouselEventIds", JSON.stringify(firestoreIds));
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
    // 存在するイベントのIDだけに絞り込んで保存
    const validIds = carouselEventIds.filter(id => events.some(e => e.id === id));
    setCarouselEventIds(validIds);
    localStorage.setItem("carouselEventIds", JSON.stringify(validIds));
    await updateDoc(doc(db, "adminSettings", "display"), { carouselEventIds: validIds });
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
            return (
              <SortableCarouselItem
                key={id}
                id={id}
                i={i}
                event={event}
                total={carouselEventIds.length}
                onMove={moveCarousel}
                onRemove={toggleCarousel}
                onDragStart={setDraggedIndex}
                onDragOver={(idx) => { if (dragOverIndex !== idx) setDragOverIndex(idx); }}
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
                draggedIndex={draggedIndex}
                dragOverIndex={dragOverIndex}
                setCarouselEventIds={setCarouselEventIds}
              />
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
            disabled={!carouselEventIds.includes(event.id) && carouselEventIds.filter(id => events.some(e => e.id === id)).length >= 10}
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
