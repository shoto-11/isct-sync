import { useState } from "react";
import { db, auth } from "./firebase";
import { doc, setDoc } from "firebase/firestore";
import { GAKUIN, GAKUNEN, GENDER } from "./constants";
import { BG_COLOR } from "./constants";

export default function ProfileSetup({ onComplete }) {
  const [gakuin, setGakuin] = useState("");
  const [gakukei, setGakukei] = useState("");
  const [gakunen, setGakunen] = useState("");
  const [gender, setGender] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGakuinChange = (val) => {
    setGakuin(val);
    setGakukei(""); // 学系リセット
  };

  const handleSubmit = async () => {
    setError("");
    if (!gakuin || !gakukei || !gakunen || !gender || !displayName.trim()) {
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
      onComplete();
    } catch (err) {
      setError("保存に失敗しました: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.badge}>SYNC</div>
        <h1 style={s.title}>プロフィール設定</h1>
        <p style={s.sub}>初回ログイン時に一度だけ設定してください</p>

        {/* 表示名 */}
        <div style={s.section}>
          <label style={s.label}>表示名 <span style={s.required}>必須</span></label>
          <input
            style={s.input}
            placeholder="例：東科太郎"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
          />
        </div>

        {/* 学院 */}
        <div style={s.section}>
          <label style={s.label}>学院 <span style={s.required}>必須</span></label>
          <div style={s.optionGrid}>
            {Object.keys(GAKUIN).map(g => (
              <button
                key={g}
                style={{ ...s.optionBtn, ...(gakuin === g ? s.optionBtnActive : {}) }}
                onClick={() => handleGakuinChange(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* 学系（学院選択後に表示） */}
        {gakuin && (
          <div style={s.section}>
            <label style={s.label}>学系 <span style={s.required}>必須</span></label>
            <div style={s.optionGrid}>
              {GAKUIN[gakuin].map(k => (
                <button
                  key={k}
                  style={{ ...s.optionBtn, ...(gakukei === k ? s.optionBtnActive : {}) }}
                  onClick={() => setGakukei(k)}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 学年・教職員 */}
        <div style={s.section}>
          <label style={s.label}>学年・教職員 <span style={s.required}>必須</span></label>
          <div style={s.optionGrid}>
            {GAKUNEN.map(g => (
              <button
                key={g}
                style={{ ...s.optionBtn, ...(gakunen === g ? s.optionBtnActive : {}) }}
                onClick={() => setGakunen(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* 性別 */}
        <div style={s.section}>
          <label style={s.label}>性別 <span style={s.required}>必須</span></label>
          <div style={s.optionRow}>
            {GENDER.map(g => (
              <button
                key={g}
                style={{ ...s.optionBtn, ...(gender === g ? s.optionBtnActive : {}) }}
                onClick={() => setGender(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {error && <p style={s.error}>{error}</p>}

        <button style={s.btn} onClick={handleSubmit} disabled={loading}>
          {loading ? "保存中..." : "設定を完了する"}
        </button>
      </div>
    </div>
  );
}

const THEME = "#88203a";

const s = {
  container: { minHeight:"100vh", background:BG_COLOR, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"32px 16px" },
  card: { background:"white", borderRadius:16, padding:"32px 24px", width:"100%", maxWidth:480, display:"flex", flexDirection:"column", gap:0, boxShadow:"0 4px 24px rgba(0,0,0,0.08)" },
  badge: { background:THEME, color:"white", fontWeight:700, fontSize:16, padding:"4px 14px", borderRadius:6, width:"fit-content", marginBottom:12 },
  title: { fontSize:22, fontWeight:900, color:"#111", marginBottom:6 },
  sub: { fontSize:13, color:"#5A7370", marginBottom:24 },
  section: { marginBottom:20 },
  label: { display:"block", fontSize:12, fontWeight:700, color:"#5A7370", letterSpacing:"0.05em", marginBottom:8 },
  required: { background:"#E53935", color:"white", fontSize:10, fontWeight:700, padding:"1px 5px", borderRadius:3, marginLeft:4 },
  input: { width:"100%", padding:"11px 13px", border:"1.5px solid #D0DDD9", borderRadius:8, fontSize:14, outline:"none", fontFamily:"inherit" },
  optionGrid: { display:"flex", flexWrap:"wrap", gap:8 },
  optionRow: { display:"flex", gap:8 },
  optionBtn: { padding:"7px 14px", borderRadius:999, border:"1.5px solid #D0DDD9", background:"white", fontSize:13, fontWeight:600, color:"#5A7370", cursor:"pointer" },
  optionBtnActive: { background:THEME, color:"white", border:`1.5px solid ${THEME}` },
  btn: { marginTop:8, padding:14, background:THEME, color:"white", border:"none", borderRadius:8, fontSize:15, fontWeight:700, cursor:"pointer", width:"100%" },
  error: { color:"#E53935", fontSize:12, marginBottom:8 },
};