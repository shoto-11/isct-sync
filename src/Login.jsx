import { useState } from "react";
import { auth } from "./firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const ALLOWED_DOMAINS = ["m.isct.ac.jp"];

export default function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      // 毎回アカウント選択画面を表示
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;
      const domain = email.split("@")[1];

      if (!ALLOWED_DOMAINS.includes(domain)) {
        await auth.signOut();
        setError(`@m.isct.ac.jp または @m.titech.ac.jp のアカウントでログインしてください（${email} は使用できません）`);
      }
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError("ログインに失敗しました: " + err.message);
      }
    }
    setLoading(false);
  };

  return (
    <div style={s.container}>
      <div style={s.card}>

        <div style={s.badge}>ISCT</div>
        <h1 style={s.title}>ISCT Sync</h1>
        <p style={s.sub}>東京科学大学 イベントプラットフォーム</p>

        <div style={s.divider} />

        <p style={s.instruction}>学籍Googleアカウントでログイン</p>

        <button style={s.googleBtn} onClick={handleGoogleLogin} disabled={loading}>
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          {loading ? "ログイン中..." : "Googleでログイン"}
        </button>

        {error && <p style={s.error}>{error}</p>}

        <div style={s.note}>
          🔒 @m.isct.ac.jp または @m.titech.ac.jp の<br />学籍アカウントのみ利用できます
        </div>

      </div>
    </div>
  );
}

const s = {
  container: { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#F4F6F5", padding:"32px 24px" },
  card: { background:"white", borderRadius:16, padding:"40px 32px", width:"100%", maxWidth:380, display:"flex", flexDirection:"column", alignItems:"center", gap:16, boxShadow:"0 4px 24px rgba(0,0,0,0.08)" },
  badge: { background:"#C8A84B", color:"#0D1B2A", fontWeight:700, fontSize:18, padding:"6px 16px", borderRadius:8 },
  title: { fontSize:26, fontWeight:900, color:"#007A6E" },
  sub: { fontSize:13, color:"#5A7370" },
  divider: { width:"100%", height:1, background:"#E0E8E7" },
  instruction: { fontSize:14, color:"#1A2E2B", fontWeight:600 },
  googleBtn: {
    width:"100%", padding:"13px 16px",
    background:"white", border:"1.5px solid #D0DDD9",
    borderRadius:8, fontSize:15, fontWeight:700,
    cursor:"pointer", display:"flex", alignItems:"center",
    justifyContent:"center", gap:10, color:"#1A2E2B",
    boxShadow:"0 1px 4px rgba(0,0,0,0.08)",
  },
  error: { color:"#C62828", fontSize:12, textAlign:"center", lineHeight:1.6 },
  note: { background:"#E6F5F4", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#007A6E", lineHeight:1.8, textAlign:"center", width:"100%" },
};