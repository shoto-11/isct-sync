import { useState, useEffect } from "react";

const CATEGORY_STYLES = {
  スポーツ: { bg:"#E8F5E9", color:"#2E7D32" },
  勉強会:   { bg:"#E3F2FD", color:"#1565C0" },
  文化:     { bg:"#FFF3E0", color:"#E65100" },
  テック:   { bg:"#E0F2F1", color:"#00695C" },
  交流:     { bg:"#F3E5F5", color:"#6A1B9A" },
  その他:   { bg:"#F5F5F5", color:"#616161" },
};

export default function EventDetail({ event, onBack }) {
    useEffect(() => {
        // ページトップにスクロール
        window.scrollTo(0, 0);

        const fab = document.querySelector('[data-fab]');
        if (fab) fab.style.display = 'none';
        return () => {
            if (fab) fab.style.display = 'flex';
        };
        }, []);
  const cs = CATEGORY_STYLES[event.category] || CATEGORY_STYLES["その他"];
  const remaining = event.capacity - (event.participants?.length ?? 0);

  return (
    <div style={s.container}>

      {/* 戻るボタン */}
      <button style={s.backBtn} onClick={onBack}>
        ← 戻る
      </button>

      {/* メイン画像 */}
      {event.imageUrl ? (
        <img src={event.imageUrl} alt={event.title} style={s.heroImg} />
      ) : (
        <div style={{ ...s.heroPlaceholder, background: cs.bg }}>
          <span style={{ fontSize:64 }}>
            {{"スポーツ":"⚽","勉強会":"📚","文化":"🎨","テック":"💻","交流":"🎉"}[event.category] || "📌"}
          </span>
        </div>
      )}

      <div style={s.body}>

        {/* カテゴリ＋タイトル */}
        <span style={{ ...s.tag, background:cs.bg, color:cs.color }}>{event.category}</span>
        <h1 style={s.title}>{event.title}</h1>

        {/* 日時・場所 */}
        <div style={s.infoBox}>
          <div style={s.infoRow}>
            <span style={s.infoIcon}>📅</span>
            <div>
              <div style={s.infoLabel}>イベント日時</div>
              <div style={s.infoValue}>
                {event.date}
                {event.startTime && ` ${event.startTime}`}
                {event.endTime && ` 〜 ${event.endTime}`}
              </div>
            </div>
          </div>
          <div style={s.infoDivider} />
          <div style={s.infoRow}>
            <span style={s.infoIcon}>📍</span>
            <div>
              <div style={s.infoLabel}>場所</div>
              <div style={s.infoValue}>{event.location}</div>
            </div>
          </div>
            {event.deadline && (
                <>
                    <div style={s.infoDivider} />
                    <div style={s.infoRow}>
                    <span style={s.infoIcon}>⏰</span>
                    <div>
                        <div style={s.infoLabel}>申し込み締切</div>
                        <div style={s.infoValue}>
                        {event.deadline}
                        {event.deadlineTime && ` ${event.deadlineTime}`}
                        </div>
                    </div>
                    </div>
                </>
                )}
          {event.capacity && (
            <>
              <div style={s.infoDivider} />
              <div style={s.infoRow}>
                <span style={s.infoIcon}>👥</span>
                <div>
                  <div style={s.infoLabel}>残り枠</div>
                  <div style={s.infoValue}>{remaining} / {event.capacity} 人</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 詳細 */}
        {event.detail && (
          <div style={s.section}>
            <h2 style={s.sectionTitle}>イベント詳細</h2>
            <p style={s.detailText}>{event.detail}</p>
          </div>
        )}

        {/* 添付資料 */}
        {event.attachments?.length > 0 && (
          <div style={s.section}>
            <h2 style={s.sectionTitle}>添付資料</h2>
            <div style={s.attachList}>
              {event.attachments.map((a, i) => (
                <a key={i} href={a.url} target="_blank" rel="noreferrer" style={s.attachItem}>
                  📄 {a.name}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 申し込みボタン */}
        {event.applyLink && (
          <a href={event.applyLink} target="_blank" rel="noreferrer" style={s.applyBtn}>
            {event.applyLabel || "参加を申し込む"} →
          </a>
        )}

      </div>
    </div>
  );
}

const s = {
  container: { background:"#F4F6F5", minHeight:"100vh" },
  backBtn: { display:"flex", alignItems:"center", gap:6, background:"none", border:"none", color:"#5A7370", fontSize:14, fontWeight:700, cursor:"pointer", padding:"16px", },
  heroImg: { width:"100%", height:"auto", display:"block", maxWidth:720, margin:"0 auto" },
  heroPlaceholder: { width:"100%", maxWidth:720, margin:"0 auto", aspectRatio:"16/9", display:"flex", alignItems:"center", justifyContent:"center" },
  body: { padding:"20px 16px", maxWidth:720, margin:"0 auto", display:"flex", flexDirection:"column", gap:16 },
  tag: { display:"inline-block", fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:999, width:"fit-content" },
  title: { fontSize:24, fontWeight:900, color:"#111", lineHeight:1.3, margin:0 },
  infoBox: { background:"white", borderRadius:12, padding:"16px", boxShadow:"0 2px 8px rgba(0,0,0,0.07)", display:"flex", flexDirection:"column", gap:12 },
  infoRow: { display:"flex", alignItems:"flex-start", gap:12 },
  infoIcon: { fontSize:20, flexShrink:0 },
  infoLabel: { fontSize:11, color:"#5A7370", fontWeight:700, marginBottom:2 },
  infoValue: { fontSize:15, fontWeight:700, color:"#111" },
  infoDivider: { height:1, background:"#F0F0F0" },
  section: { background:"white", borderRadius:12, padding:"16px", boxShadow:"0 2px 8px rgba(0,0,0,0.07)" },
  sectionTitle: { fontSize:14, fontWeight:700, color:"#5A7370", marginBottom:10, margin:"0 0 10px" },
  detailText: { fontSize:14, color:"#1A2E2B", lineHeight:1.8, whiteSpace:"pre-wrap", margin:0 },
  attachList: { display:"flex", flexDirection:"column", gap:8 },
  attachItem: { fontSize:13, color:"#007A6E", padding:"8px 12px", background:"#E6F5F4", borderRadius:8, textDecoration:"none", fontWeight:600 },
  applyBtn: { display:"block", textAlign:"center", padding:"16px", background:"#F5A623", color:"#111", borderRadius:12, fontSize:16, fontWeight:900, textDecoration:"none", boxShadow:"0 4px 16px rgba(245,166,35,0.4)" },
};