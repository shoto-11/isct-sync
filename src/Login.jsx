import { useState } from "react";
import { auth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";

const ALLOWED_DOMAINS = ["isct.ac.jp", "m.isct.ac.jp", "titech.ac.jp"];

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const checkDomain = (email) => {
    const domain = email.split("@")[1];
    return ALLOWED_DOMAINS.includes(domain);
  };

  const handleLogin = async () => {
    setError("");
    if (!checkDomain(email)) {
      setError("東京科学大学のメールアドレスのみ使用できます");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        onLogin();
      } catch (err) {
        setError("ログインに失敗しました: " + err.message);
      }
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.badge}>ISCT</div>
        <h1 style={styles.title}>東京科学大学<br />イベントサイト</h1>
        <p style={styles.sub}>学籍メールでログイン / 新規登録</p>

        <input
          style={styles.input}
          type="email"
          placeholder="s12345@m.isct.ac.jp"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          style={styles.input}
          type="password"
          placeholder="パスワード（6文字以上）"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        {error && <p style={styles.error}>{error}</p>}

        <button style={styles.btn} onClick={handleLogin}>
          ログイン / 新規登録
        </button>

        <p style={styles.note}>
          🔒 @isct.ac.jp / @m.isct.ac.jp / @titech.ac.jp のみ登録可能
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#F4F6F5",
  },
  card: {
    background: "white",
    borderRadius: 16,
    padding: "40px 32px",
    width: "100%",
    maxWidth: 360,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
  },
  badge: {
    background: "#C8A84B",
    color: "#0D1B2A",
    fontWeight: 700,
    fontSize: 18,
    padding: "4px 16px",
    borderRadius: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: 900,
    color: "#007A6E",
    textAlign: "center",
    lineHeight: 1.4,
  },
  sub: { fontSize: 13, color: "#5A7370" },
  input: {
    width: "100%",
    padding: "12px 14px",
    border: "1.5px solid #D0DDD9",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
  },
  btn: {
    width: "100%",
    padding: 14,
    background: "#007A6E",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
  error: { color: "red", fontSize: 12 },
  note: {
    fontSize: 11,
    color: "#5A7370",
    textAlign: "center",
    lineHeight: 1.6,
  },
};