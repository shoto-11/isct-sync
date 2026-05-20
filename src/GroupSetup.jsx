import { useState } from "react";
import { db } from "./firebase";
import { doc, updateDoc } from "firebase/firestore";
import logoRed from "./assets/logo-red.png";
import { Users, UserCheck } from "lucide-react";

const THEME = "#88203a";
const BG = "#F4F6F5";

export default function GroupSetup({ user, onComplete, onSkip }) {
  const [loading, setLoading] = useState(false);

  const handleSkip = async () => {
    setLoading(true);
    try { await updateDoc(doc(db, "users", user.uid), { groupAuthDone: true }); } catch (_) {}
    onSkip();
    setLoading(false);
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        <img src={logoRed} alt="SYNC" style={s.logo} />
        <div style={s.stepBadge}>STEP 2 / 2 &nbsp;グループ設定</div>
        <h2 style={s.title}>グループとして登録しますか？</h2>
        <p style={s.sub}>サークル・団体・企業の公式アカウントとしてイベントを募集できます。後からマイページでも追加できます。</p>

        <div style={s.optionList}>
          {/* 新規作成：準備中 */}
          <div style={s.optionCardDisabled}>
            <div style={{ ...s.optionIcon, background: "#F0F0F0" }}>
              <Users size={28} color="#B0B0B0" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={s.optionTitleDisabled}>新しくグループを作成する</div>
              <div style={s.optionDesc}>サークル・団体・企業の新規アカウント</div>
            </div>
            <span style={s.comingSoon}>準備中</span>
          </div>

          {/* 既存参加：準備中 */}
          <div style={s.optionCardDisabled}>
            <div style={{ ...s.optionIcon, background: "#F0F0F0" }}>
              <UserCheck size={28} color="#B0B0B0" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={s.optionTitleDisabled}>既存のグループに参加する</div>
              <div style={s.optionDesc}>すでに作成済みのグループアカウントに追加</div>
            </div>
            <span style={s.comingSoon}>準備中</span>
          </div>

          {/* 個人アカウント：有効 */}
          <button style={s.optionCard} onClick={handleSkip} disabled={loading}>
            <div style={{ ...s.optionIcon, background: "#F5F5F5" }}>
              <span style={{ fontSize: 24 }}>👤</span>
            </div>
            <div>
              <div style={s.optionTitle}>個人アカウントとして使用する</div>
              <div style={s.optionDesc}>グループには後から参加できます</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  container: { minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", background: BG, padding: "32px 16px" },
  card: { background: "white", borderRadius: 16, padding: "32px 24px", width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" },
  logo: { width: 160, objectFit: "contain" },
  stepBadge: { background: "#F9EAED", color: THEME, fontWeight: 700, fontSize: 11, padding: "4px 12px", borderRadius: 999, width: "fit-content", letterSpacing: "0.05em" },
  title: { fontSize: 20, fontWeight: 900, color: "#111" },
  sub: { fontSize: 13, color: "#5A7370", lineHeight: 1.7 },
  optionList: { display: "flex", flexDirection: "column", gap: 12, width: "100%" },
  optionCard: { display: "flex", alignItems: "center", gap: 16, padding: "16px", borderRadius: 12, border: `2px solid ${THEME}`, background: "white", cursor: "pointer", textAlign: "left", width: "100%" },
  optionCardDisabled: { display: "flex", alignItems: "center", gap: 16, padding: "16px", borderRadius: 12, border: "2px solid #E0E0E0", background: "#FAFAFA", textAlign: "left", width: "100%", opacity: 0.7 },
  optionIcon: { width: 52, height: 52, borderRadius: "50%", background: "#F9EAED", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  optionTitle: { fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 2 },
  optionTitleDisabled: { fontSize: 14, fontWeight: 700, color: "#999", marginBottom: 2 },
  optionDesc: { fontSize: 12, color: "#5A7370" },
  comingSoon: { background: "#F0F0F0", color: "#999", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, flexShrink: 0 },
};