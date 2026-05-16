import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

export default function EventList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(list);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <p style={{ padding: 24 }}>読み込み中...</p>;

  if (events.length === 0) return (
    <p style={{ padding: 24, color: "#5A7370" }}>まだイベントがありません</p>
  );

  return (
    <div style={styles.list}>
      {events.map(event => (
        <div key={event.id} style={styles.card}>
          <div style={styles.tag}>{event.category}</div>
          <div style={styles.title}>{event.title}</div>
          <div style={styles.meta}>
            <span>📅 {event.date}</span>
            <span>📍 {event.location}</span>
          </div>
          <div style={styles.capacity}>
            残り {event.capacity - (event.participants?.length ?? 0)} 枠
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: "0 16px 16px",
  },
  card: {
    background: "white",
    borderRadius: 12,
    padding: "14px 16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  tag: {
    display: "inline-block",
    background: "#E6F5F4",
    color: "#007A6E",
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 999,
    width: "fit-content",
  },
  title: {
    fontSize: 15,
    fontWeight: 700,
    color: "#1A2E2B",
  },
  meta: {
    fontSize: 12,
    color: "#5A7370",
    display: "flex",
    gap: 12,
  },
  capacity: {
    fontSize: 12,
    fontWeight: 700,
    color: "#007A6E",
  },
};