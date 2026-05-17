import { useState } from "react";
import { auth } from "./firebase";
import { sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import logoRed from "./assets/logo-red.png";

const ALLOWED_DOMAINS = ["m.isct.ac.jp"];

const actionCodeSettings = {
  url: window.location.origin,
  handleCodeInApp: true,
};

export default function Login({ onBack }) {
  const [step, setStep] = useState("email"); // "email" | "sent"
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const checkDomain = (email) => {
    const domain = email.split("@")[1];
    return ALLOWED_DOMAINS.includes(domain);
  };

  const handleSendLink = async () => {
    setError("");
    if (!email.includes("@")) {
      setError("メールアドレスを入力してください");
      return;
    }
    if (!checkDomain(email)) {
      setError("@m.isct.ac.jp のメールアドレスのみ使用できます");
      return;
    }
    setLoading(true);
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", email);
      setStep("sent");
    } catch (err) {
      setError("メールの送信に失敗しました: " + err.message);
    }
    setLoading(false);
  };
    const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
        const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        const result = await signInWithPopup(auth, provider);
        const email = result.user.email;
        const domain = email.split("@")[1];
        if (!ALLOWED_DOMAINS.includes(domain)) {
        await auth.signOut();
        setError(`@m.isct.ac.jp のアカウントでログインしてください（${email} は使用できません）`);
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
        {onBack && (
          <button style={s.backBtn} onClick={onBack}>← 戻る</button>
        )}

        <img src={logoRed} alt="SYNC" style={s.logo} />

        {step === "email" ? (
          <>
            <p style={s.instruction}>学籍メールアドレスを入力してください</p>

            <div style={s.inputGroup}>
              <label style={s.label}>メールアドレス</label>
              <input
                style={s.input}
                type="email"
                placeholder="s12345@m.isct.ac.jp"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSendLink()}
                autoFocus
              />
            </div>

            {error && <p style={s.error}>{error}</p>}

            <div style={s.note}>
              🔒 @m.isct.ac.jp の学籍アカウントのみ利用できます
            </div>

            <button style={s.btn} onClick={handleSendLink} disabled={loading}>
              {loading ? "送信中..." : "続行する"}
            </button>
            <div style={s.divider}>
            <div style={s.dividerLine} />
            <span style={s.dividerText}>または</span>
            <div style={s.dividerLine} />
            </div>

            <button style={s.googleBtn} onClick={handleGoogleLogin} disabled={loading}>
            <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {loading ? "ログイン中..." : "Googleでログイン"}
            </button>
          </>
        ) : (
          <>
            <div style={s.sentIcon}>📧</div>
            <h2 style={s.sentTitle}>メールを確認してください</h2>
            <p style={s.sentText}>
              <strong>{email}</strong> にログイン用リンクを送信しました。メール内のリンクをクリックしてログインしてください。
            </p>
            <div style={s.note}>
            メールが見つからない場合は、迷惑メールフォルダをご確認ください
            </div>
            <button style={s.backToEmailBtn} onClick={() => { setStep("email"); setError(""); }}>
              別のメールアドレスで試す
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const THEME = "#88203a";
const s = {
  container: { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#F4F6F5", padding:"32px 24px" },
  card: { background:"white", borderRadius:16, padding:"40px 32px", width:"100%", maxWidth:380, display:"flex", flexDirection:"column", alignItems:"center", gap:16, boxShadow:"0 4px 24px rgba(0,0,0,0.08)" },
  backBtn: { background:"none", border:"none", color:"#5A7370", fontSize:14, fontWeight:700, cursor:"pointer", alignSelf:"flex-start" },
  logo: { width:"100%", maxWidth:280, objectFit:"contain" },
  instruction: { fontSize:14, color:"#1A2E2B", fontWeight:600, alignSelf:"flex-start" },
  inputGroup: { width:"100%", display:"flex", flexDirection:"column", gap:5 },
  label: { fontSize:12, fontWeight:700, color:"#5A7370", letterSpacing:"0.05em" },
  input: { width:"100%", padding:"12px 14px", border:"1.5px solid #D0DDD9", borderRadius:8, fontSize:14, outline:"none" },
  note: { background:"#F9EAED", borderRadius:8, padding:"10px 14px", fontSize:12, color:THEME, lineHeight:1.8, textAlign:"center", width:"100%" },
  btn: { width:"100%", padding:14, background:THEME, color:"white", border:"none", borderRadius:8, fontSize:15, fontWeight:700, cursor:"pointer" },
  error: { color:"#C62828", fontSize:12, alignSelf:"flex-start" },
  sentIcon: { fontSize:48 },
  sentTitle: { fontSize:18, fontWeight:900, color:"#111", textAlign:"center" },
  sentText: { fontSize:14, color:"#5A7370", lineHeight:1.7, textAlign:"center" },
  backToEmailBtn: { background:"none", border:`1px solid ${THEME}`, color:THEME, borderRadius:8, padding:"10px 20px", fontSize:13, fontWeight:700, cursor:"pointer" },
    divider: { display:"flex", alignItems:"center", gap:8, width:"100%" },
    dividerLine: { flex:1, height:1, background:"#E0E8E7" },
    dividerText: { fontSize:12, color:"#5A7370", flexShrink:0 },
    googleBtn: { width:"100%", padding:"13px 16px", background:"white", border:"1.5px solid #D0DDD9", borderRadius:8, fontSize:15, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, color:"#1A2E2B", boxShadow:"0 1px 4px rgba(0,0,0,0.08)" },
    };