import { useState } from "react";
import { db, auth } from "./firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { GAKUIN, GAKUNEN, GENDER, BG_COLOR } from "./constants";
import logoRed from "./assets/logo-red.png";

const THEME = "#88203a";

export default function ProfileSetup({ onComplete }) {
  const navigate = useNavigate();
  const [gakuin, setGakuin] = useState("");
  const [gakukei, setGakukei] = useState("");
  const [gakunen, setGakunen] = useState("");
  const [gender, setGender] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGakuinChange = (val) => { setGakuin(val); setGakukei(""); };

  const handleSubmit = async () => {
    setError("");
    if (!gakuin || !gakunen || !gender || !displayName.trim()) {
      setError("全ての項目を入力してください");
      return;
    }
    setLoading(true);
    try {
      await setDoc(doc(db, "users", auth.currentUser.uid), {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: displayName.trim(),
        gakuin,
        gakukei,
        gakunen,
        gender,
        createdAt: new Date(),
      });
      onComplete?.();
      navigate("/group-setup");
    } catch (err) {
      setError("保存に失敗しました: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        <img src={logoRed} alt="SYNC" style={s.logo} />
        <div style={s.stepBadge}>STEP 1 / 2 &nbsp;基本情報</div>
        <h1 style={s.title}>プロフィールを設定してください</h1>
        <p style={s.sub}>初回ログイン時に一度だけ設定します</p>

        {/* 表示名 */}
        <div style={s.section}>
          <label style={s.label}>表示名 <span style={s.req}>必須</span></label>
          <input style={s.input} placeholder="例：東科太郎" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>

        {/* 学院 */}
        <div style={s.section}>
          <label style={s.label}>学院 <span style={s.req}>必須</span></label>
          <div style={s.grid}>
            {Object.keys(GAKUIN).map((g) => (
              <button key={g} style={{ ...s.chip, ...(gakuin === g ? s.chipActive : {}) }} onClick={() => handleGakuinChange(g)}>{g}</button>
            ))}
          </div>
        </div>

        {/* 学系 */}
        {gakuin && (
          <div style={s.section}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={s.label}>学系 <span style={{ fontSize: 10, color: "#9AADA8", fontWeight: "normal", marginLeft: 4 }}>(任意)</span></label>
              {gakukei && (
                <button 
                  type="button"
                  style={{ background: "none", border: "none", color: "#C62828", fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0 }}
                  onClick={() => setGakukei("")}
                >
                  選択をクリア
                </button>
              )}
            </div>
            <div style={s.grid}>
              {/* 未所属用の明示的なボタン枠 */}
              <button 
                type="button" 
                style={{ ...s.chip, ...(gakukei === "" ? s.chipActive : {}) }}
                onClick={() => setGakukei("")}
              >
                未所属 / その他
              </button>

              {GAKUIN[gakuin].map((k) => {
                const isSelected = gakukei === k;
                return (
                  <button
                    type="button"
                    key={k}
                    style={{ ...s.chip, ...(isSelected ? s.chipActive : {}) }}
                    onClick={() => setGakukei(isSelected ? "" : k)}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 学年 */}
        <div style={s.section}>
          <label style={s.label}>学年・教職員 <span style={s.req}>必須</span></label>
          <div style={s.grid}>
            {GAKUNEN.map((g) => (
              <button key={g} style={{ ...s.chip, ...(gakunen === g ? s.chipActive : {}) }} onClick={() => setGakunen(g)}>{g}</button>
            ))}
          </div>
        </div>

        {/* 性別 */}
        <div style={s.section}>
          <label style={s.label}>性別 <span style={s.req}>必須</span></label>
          <div style={s.grid}>
            {GENDER.map((g) => (
              <button key={g} style={{ ...s.chip, ...(gender === g ? s.chipActive : {}) }} onClick={() => setGender(g)}>{g}</button>
            ))}
          </div>
        </div>

        {error && <p style={s.error}>{error}</p>}

        <button style={s.btn} onClick={handleSubmit} disabled={loading}>
          {loading ? "保存中..." : "次へ →"}
        </button>
      </div>
    </div>
  );
}

const s = {
  container: { minHeight: "100vh", background: BG_COLOR, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 16px" },
  card: { background: "white", borderRadius: 16, padding: "32px 24px", width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 0, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" },
  logo: { width: 160, objectFit: "contain", marginBottom: 16 },
  stepBadge: { background: "#F9EAED", color: THEME, fontWeight: 700, fontSize: 11, padding: "4px 12px", borderRadius: 999, width: "fit-content", marginBottom: 8, letterSpacing: "0.05em" },
  title: { fontSize: 20, fontWeight: 700, color: "#111", marginBottom: 4 },
  sub: { fontSize: 13, color: "#5A7370", marginBottom: 20 },
  section: { marginBottom: 20 },
  label: { display: "block", fontSize: 12, fontWeight: 700, color: "#5A7370", letterSpacing: "0.05em", marginBottom: 8 },
  req: { background: "#E53935", color: "white", fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 3, marginLeft: 4 },
  input: { width: "100%", padding: "11px 13px", border: "1.5px solid #D0DDD9", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "inherit" },
  grid: { display: "flex", flexWrap: "wrap", gap: 8 },
  chip: { padding: "7px 14px", borderRadius: 999, border: "1.5px solid #D0DDD9", background: "white", fontSize: 13, fontWeight: 600, color: "#5A7370", cursor: "pointer" },
  chipActive: { background: THEME, color: "white", border: `1.5px solid ${THEME}` },
  btn: { marginTop: 8, padding: 14, background: THEME, color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%" },
  error: { color: "#E53935", fontSize: 12, marginBottom: 8 },
};
