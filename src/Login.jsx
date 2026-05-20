import { useState } from "react";
import { auth, db, functions } from "./firebase"; // firebase.jsからfunctionsをインポート
import { httpsCallable } from "firebase/functions";
import { signInWithCustomToken, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import logoRed from "./assets/logo-red.png";
import { Mail, ShieldCheck } from "lucide-react"; // アイコン追加

const THEME = "#88203a";
const ALLOWED_DOMAINS = ["m.isct.ac.jp"];

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState("email"); // "email" | "code" に変更
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState(""); // 6桁コード用
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ログイン成功後の遷移 (変更なし)
  const handleLoginSuccess = async (uid) => {
    const snap = await getDoc(doc(db, "users", uid));
    const done = snap.exists() && !!snap.data().displayName;
    if (!done) {
      navigate("/setup");
    } else {
      navigate("/");
    }
  };

  const checkAllowed = async (targetEmail) => {
    const domain = targetEmail.split("@")[1];
    if (ALLOWED_DOMAINS.includes(domain)) return true;
    const snap = await getDoc(doc(db, "allowedEmails", targetEmail));
    return snap.exists();
  };

  // 1. 確認コードをメールへ送信請求する// Login.jsx の handleRequestCode を以下のように微調整
const handleRequestCode = async (e) => {
  e.preventDefault();
  setError("");
  if (!email.trim()) return;

  setLoading(true);
  try {
    const allowed = await checkAllowed(email.trim());
    if (!allowed) {
      setError("本学の学籍メールアドレス、または事前登録されたアドレスのみログイン可能です。");
      setLoading(false);
      return;
    }

    const sendOtpCodeFn = httpsCallable(functions, "sendotpcode");
    
    // 💡 確実に { email: "..." } というオブジェクトで渡す
    const result = await sendOtpCodeFn({ email: email.trim() }); 

    if (result.data.success) {
      setStep("code");
    }
  } catch (err) {
    setError(err.message || "コードの送信に失敗しました。");
  }
  setLoading(false);
};

  // 2. 入力された6桁コードを検証してログインする
  const handleVerifyAndLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (verificationCode.length !== 6) {
      setError("6桁の確認コードを入力してください。");
      return;
    }

    setLoading(true);
    try {
      // Cloud Functionsの 'verifyOtpCode' を呼び出し
      const verifyOtpCodeFn = httpsCallable(functions, "verifyotpcode");
      const result = await verifyOtpCodeFn({ email: email.trim(), code: verificationCode });

      const { customToken } = result.data;
      if (customToken) {
        // 発行されたカスタムトークンでFirebase Authにサインイン
        const userCredential = await signInWithCustomToken(auth, customToken);
        await handleLoginSuccess(userCredential.user.uid);
      } else {
        setError("認証に失敗しました。");
      }
    } catch (err) {
      // Functionsが投げたエラーメッセージを表示
      setError(err.message || "確認コードが正しくないか、有効期限が切れています。");
    }
    setLoading(false);
  };

  // Googleログイン (変更なし)
  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const allowed = await checkAllowed(res.user.email);
      if (!allowed) {
        setError("本学の学籍メールアドレス、または事前登録されたアドレスのみログイン可能です。");
        await auth.signOut();
        setLoading(false);
        return;
      }
      await handleLoginSuccess(res.user.uid);
    } catch (err) {
      setError("Googleログインに失敗しました。");
      setLoading(false);
    }
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        <img src={logoRed} alt="SYNC" style={s.logo} />
        <h2 style={s.title}>東京科学大生専用イベントサイト</h2>
        <p style={s.sub}>
          {step === "email" 
            ? "学籍ドメイン（@m.isct.ac.jp）のメールアドレスを入力してログインしてください。"
            : `${email} 宛に送信された6桁の確認コードを入力してください。`}
        </p>

        {error && <div style={s.error}>{error}</div>}

        {step === "email" ? (
          /* ステップ1: メールアドレス入力 */
          <form style={s.form} onSubmit={handleRequestCode}>
            <div style={s.formGroup}>
              <label style={s.label}>メールアドレス</label>
              <input
                type="email"
                placeholder="example@m.isct.ac.jp"
                style={s.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <button type="submit" style={s.btn} disabled={loading || !email}>
              {loading ? "送信中..." : "確認コードを送信"}
            </button>
          </form>
        ) : (
          /* ステップ2: 6桁コード入力 */
          <form style={s.form} onSubmit={handleVerifyAndLogin}>
            <div style={s.formGroup}>
              <label style={s.label}>6桁の確認コード</label>
              <input
                type="text"
                maxLength={6}
                placeholder="123456"
                style={{ ...s.input, letterSpacing: "0.3em", textAlign: "center", fontSize: "18px", fontWeight: "bold" }}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))} // 数字のみ
                disabled={loading}
                required
              />
            </div>
            <button type="submit" style={s.btn} disabled={loading || verificationCode.length !== 6}>
              {loading ? "認証中..." : "認証してログイン"}
            </button>
            <button 
              type="button" 
              style={{ ...s.outlineBtn, marginTop: 8, width: "100%", border: "none", color: "#5A7370" }} 
              onClick={() => { setStep("email"); setVerificationCode(""); }}
              disabled={loading}
            >
              ← メールアドレスを入力し直す
            </button>
          </form>
        )}

        {step === "email" && (
          <>
            <div style={s.divider}>
              <div style={s.dividerLine}></div>
              <span style={s.dividerText}>または</span>
              <div style={s.dividerLine}></div>
            </div>

            <button style={s.outlineBtn} onClick={handleGoogleLogin} disabled={loading}>
              Googleアカウントでログイン
            </button>
          </>
        )}

        <div style={s.note}>
          ※確認コードの有効期限は5分間です。<br />
          メールが届かない場合は、迷惑メールフォルダをご確認ください。
        </div>
      </div>
    </div>
  );
}

// 既存のスタイルオブジェクト (変更部分のみ適宜調整)
const s = {
  container: { background: "#F4F6F5", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
  card: { background: "white", borderRadius: 16, padding: "32px 24px", width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" },
  logo: { width: 140, objectFit: "contain", alignSelf: "center" },
  title: { fontSize: 18, fontWeight: 800, color: "#111", textAlign: "center" },
  sub: { fontSize: 13, color: "#5A7370", lineHeight: 1.6, textAlign: "center" },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  formGroup: { display: "flex", flexDirection: "column", gap: 5 },
  label: { fontSize: 12, fontWeight: 700, color: "#5A7370", letterSpacing: "0.05em" },
  input: { width: "100%", padding: "12px 14px", border: "1.5px solid #D0DDD9", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" },
  note: { background: "#F9EAED", borderRadius: 8, padding: "10px 14px", fontSize: 11, color: THEME, lineHeight: 1.6, textAlign: "center", width: "100%", boxSizing: "border-box" },
  btn: { width: "100%", padding: 14, background: THEME, color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer" },
  outlineBtn: { background: "none", border: `1.5px solid ${THEME}`, color: THEME, borderRadius: 8, padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  error: { color: "#C62828", fontSize: 12, textAlign: "center", background: "#FFEBEE", padding: "10px", borderRadius: 8, fontWeight: 500 },
  divider: { display: "flex", alignItems: "center", gap: 8, width: "100%" },
  dividerLine: { flex: 1, height: 1, background: "#E0E8E7" },
  dividerText: { fontSize: 12, color: "#9AADA8" },
};