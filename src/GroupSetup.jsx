/**
 * GroupSetup.jsx
 *
 * フロー（新規グループ作成）:
 *   select → verify_new（メール入力）→ verify_code（6桁入力）→ new_register → done
 *
 * フロー（既存参加）:
 *   select → existing → done
 */

import { useState } from "react";
import { db, storage, firebaseConfig } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  getAuth,
} from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";
import {
  doc, setDoc, updateDoc, arrayUnion,
  collection, query, where, getDocs,
  getDoc, deleteDoc, serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import logoRed from "./assets/logo-red.png";
import { Users, UserCheck } from "lucide-react";

const THEME = "#88203a";
const BG = "#F4F6F5";

// グループ操作専用 secondary Firebase Auth
const groupApp =
  getApps().find((a) => a.name === "group") || initializeApp(firebaseConfig, "group");
const groupAuth = getAuth(groupApp);

// Firebase Functions（ローカル開発時はエミュレーターに接続）
const CODE_EXPIRE_MS = 10 * 60 * 1000; // 10分

const FUNCTIONS_BASE = location.hostname === "localhost"
  ? "http://127.0.0.1:5001/isct-sync/asia-northeast1"
  : "https://asia-northeast1-isct-sync.cloudfunctions.net";

export default function GroupSetup({ user, onComplete, onSkip }) {
  const [mode, setMode] = useState("select");
  // select | verify_new | verify_code | new_register | existing | done

  // 新規グループ用
  const [verifyEmail, setVerifyEmail] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [sentCode, setSentCode] = useState("");       // フロントで保持（照合用）
  const [codeExpireAt, setCodeExpireAt] = useState(null);
  const [groupDisplayName, setGroupDisplayName] = useState("");
  const [groupType, setGroupType] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [groupPassword, setGroupPassword] = useState("");
  const [groupPasswordConfirm, setGroupPasswordConfirm] = useState("");

  // 既存グループ参加用
  const [existingEmail, setExistingEmail] = useState("");
  const [existingPassword, setExistingPassword] = useState("");
  const [foundGroup, setFoundGroup] = useState(null);
  const [searching, setSearching] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── 新規: 6桁コード送信 ───────────────────────────────────────────
  const handleSendCode = async () => {
    setError("");
    if (!verifyEmail.includes("@")) { setError("メールアドレスを入力してください"); return; }
    setLoading(true);
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const res = await fetch(`${FUNCTIONS_BASE}/sendGroupVerifyCode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmail, code }),
      });
      if (!res.ok) throw new Error(await res.text());

      setSentCode(code);
      setCodeExpireAt(Date.now() + CODE_EXPIRE_MS);
      setInputCode("");
      setMode("verify_code");
    } catch (err) {
      setError("送信に失敗しました: " + err.message);
    }
    setLoading(false);
  };

  // ── 新規: コード照合 ──────────────────────────────────────────────
  const handleVerifyCode = () => {
    setError("");
    if (!inputCode || inputCode.length !== 6) { setError("6桁のコードを入力してください"); return; }
    if (Date.now() > codeExpireAt) { setError("コードの有効期限が切れました。再送してください"); return; }
    if (inputCode !== sentCode) { setError("コードが正しくありません"); return; }
    setMode("new_register");
  };

  // ── 新規: グループ登録 ────────────────────────────────────────────
  const handleCreateGroup = async () => {
    setError("");
    if (!groupDisplayName.trim()) { setError("表示名を入力してください"); return; }
    if (!groupType) { setError("グループ種別を選択してください"); return; }
    if (!groupPassword || groupPassword.length < 6) { setError("パスワードは6文字以上で入力してください"); return; }
    if (groupPassword !== groupPasswordConfirm) { setError("パスワードが一致しません"); return; }

    setLoading(true);
    const personalUid = user.uid;
    try {
      const { user: groupUser } = await createUserWithEmailAndPassword(groupAuth, verifyEmail, groupPassword);

      let avatarUrl = "";
      if (avatarFile) {
        const storageRef = ref(storage, `groups/${groupUser.uid}/avatar`);
        await uploadBytes(storageRef, avatarFile);
        avatarUrl = await getDownloadURL(storageRef);
      }

      await setDoc(doc(db, "groups", groupUser.uid), {
        uid: groupUser.uid,
        email: verifyEmail,
        displayName: groupDisplayName.trim(),
        avatarUrl,
        groupType,
        members: [personalUid],
        createdAt: new Date(),
      });

      await updateDoc(doc(db, "users", personalUid), {
        groups: arrayUnion(groupUser.uid),
        groupAuthDone: true,
      });

      setMode("done");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("このメールアドレスはすでに使用されています。「既存グループに参加する」をお使いください。");
      } else {
        setError("エラーが発生しました: " + err.message);
      }
    }
    setLoading(false);
  };

  // ── 既存: グループ検索 ────────────────────────────────────────────
  const handleSearchGroup = async () => {
    if (!existingEmail) return;
    setSearching(true);
    setFoundGroup(null);
    setError("");
    const q = query(collection(db, "groups"), where("email", "==", existingEmail));
    const snap = await getDocs(q);
    if (snap.empty) {
      setError("このメールアドレスのグループが見つかりませんでした");
    } else {
      setFoundGroup({ id: snap.docs[0].id, ...snap.docs[0].data() });
    }
    setSearching(false);
  };

  // ── 既存: グループ参加 ────────────────────────────────────────────
  const handleJoinGroup = async () => {
    setError("");
    if (!foundGroup) return;
    if (!existingPassword) { setError("パスワードを入力してください"); return; }
    setLoading(true);
    const personalUid = user.uid;
    try {
      await signInWithEmailAndPassword(groupAuth, foundGroup.email, existingPassword);
      await updateDoc(doc(db, "groups", foundGroup.id), { members: arrayUnion(personalUid) });
      await updateDoc(doc(db, "users", personalUid), { groups: arrayUnion(foundGroup.id), groupAuthDone: true });
      setMode("done");
    } catch (err) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("パスワードが間違っています");
      } else {
        setError("エラーが発生しました: " + err.message);
      }
    }
    setLoading(false);
  };

  // ── スキップ ──────────────────────────────────────────────────────
  const handleSkip = async () => {
    try { await updateDoc(doc(db, "users", user.uid), { groupAuthDone: true }); } catch (_) {}
    onSkip();
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // ── 完了 ──────────────────────────────────────────────────────────
  if (mode === "done") return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.successIcon}>✅</div>
        <h2 style={s.title}>グループ設定が完了しました</h2>
        <p style={s.sub}>マイページからグループ情報を確認・変更できます</p>
        <button style={s.btn} onClick={onComplete}>イベント一覧へ</button>
      </div>
    </div>
  );

  // ── 選択画面 ──────────────────────────────────────────────────────
  if (mode === "select") return (
    <div style={s.container}>
      <div style={s.card}>
        <img src={logoRed} alt="SYNC" style={s.logo} />
        <div style={s.stepBadge}>STEP 2 / 2 &nbsp;グループ設定</div>
        <h2 style={s.title}>グループとして登録しますか？</h2>
        <p style={s.sub}>サークル・団体・企業の公式アカウントとしてイベントを募集できます。後からマイページでも追加できます。</p>
        <div style={s.optionList}>
          <button style={s.optionCard} onClick={() => setMode("verify_new")}>
            <div style={s.optionIcon}><Users size={28} color={THEME} /></div>
            <div>
              <div style={s.optionTitle}>新しくグループを作成する</div>
              <div style={s.optionDesc}>サークル・団体・企業の新規アカウント</div>
            </div>
          </button>
          <button style={s.optionCard} onClick={() => setMode("existing")}>
            <div style={s.optionIcon}><UserCheck size={28} color={THEME} /></div>
            <div>
              <div style={s.optionTitle}>既存のグループに参加する</div>
              <div style={s.optionDesc}>すでに作成済みのグループアカウントに追加</div>
            </div>
          </button>
          <button style={{ ...s.optionCard, borderColor: "#E0E8E7" }} onClick={handleSkip}>
            <div style={{ ...s.optionIcon, background: "#F5F5F5" }}>
              <span style={{ fontSize: 24 }}>👤</span>
            </div>
            <div>
              <div style={{ ...s.optionTitle, color: "#5A7370" }}>個人アカウントとして使用する</div>
              <div style={s.optionDesc}>グループには後から参加できます</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  // ── メールアドレス入力 ────────────────────────────────────────────
  if (mode === "verify_new") return (
    <div style={s.container}>
      <div style={s.card}>
        <button style={s.backBtn} onClick={() => { setMode("select"); setError(""); }}>← 戻る</button>
        <div style={s.stepBadge}>グループ作成 — 本人確認</div>
        <h2 style={s.title}>グループ用メールアドレスを確認します</h2>
        <p style={s.sub}>グループ用のメールアドレスに6桁の確認コードを送ります。</p>
        <div style={s.section}>
          <label style={s.label}>グループ用メールアドレス</label>
          <input
            style={s.input}
            type="email"
            placeholder="circle@example.com"
            value={verifyEmail}
            onChange={(e) => setVerifyEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
          />
        </div>
        {error && <p style={s.error}>{error}</p>}
        <button style={s.btn} onClick={handleSendCode} disabled={loading}>
          {loading ? "送信中..." : "確認コードを送る"}
        </button>
      </div>
    </div>
  );

  // ── 6桁コード入力 ─────────────────────────────────────────────────
  if (mode === "verify_code") return (
    <div style={s.container}>
      <div style={s.card}>
        <button style={s.backBtn} onClick={() => { setMode("verify_new"); setError(""); }}>← 戻る</button>
        <div style={s.stepBadge}>グループ作成 — コード入力</div>
        <h2 style={s.title}>確認コードを入力してください</h2>
        <p style={s.sub}><strong>{verifyEmail}</strong> に6桁のコードを送信しました。</p>
        <div style={s.note}>メールが届かない場合は迷惑メールフォルダをご確認ください</div>

        {/* 6桁入力ボックス */}
        <div style={s.codeInputWrap}>
          <input
            style={s.codeInput}
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && handleVerifyCode()}
            autoFocus
          />
        </div>

        {error && <p style={s.error}>{error}</p>}

        <button style={s.btn} onClick={handleVerifyCode} disabled={inputCode.length !== 6}>
          確認する
        </button>

        <button style={s.textBtn} onClick={handleSendCode} disabled={loading}>
          {loading ? "再送中..." : "コードを再送する"}
        </button>
      </div>
    </div>
  );

  // ── グループ情報入力 ──────────────────────────────────────────────
  if (mode === "new_register") return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.stepBadge}>グループ作成 — 情報入力</div>
        <h2 style={s.title}>グループ情報を入力してください</h2>

        <div style={s.section}>
          <label style={s.label}>グループアイコン（任意）</label>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#F9EAED", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, flexShrink: 0 }}>
              {avatarPreview ? <img src={avatarPreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : "👥"}
            </div>
            <button style={s.outlineBtn} onClick={() => document.getElementById("groupAvatar").click()}>画像を選択</button>
            <input id="groupAvatar" type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
          </div>
        </div>

        <div style={s.section}>
          <label style={s.label}>グループ表示名 <span style={s.req}>必須</span></label>
          <input style={s.input} placeholder="例：東科大バスケ部" value={groupDisplayName} onChange={(e) => setGroupDisplayName(e.target.value)} />
        </div>

        <div style={s.section}>
          <label style={s.label}>グループ種別 <span style={s.req}>必須</span></label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["サークル", "団体", "企業", "その他"].map((t) => (
              <button key={t} style={{ ...s.chip, ...(groupType === t ? s.chipActive : {}) }} onClick={() => setGroupType(t)}>{t}</button>
            ))}
          </div>
        </div>

        <div style={s.section}>
          <label style={s.label}>グループ用メールアドレス（確認済み）</label>
          <div style={{ ...s.input, background: "#F5F5F5", color: "#5A7370" }}>{verifyEmail}</div>
        </div>

        <div style={s.section}>
          <label style={s.label}>パスワード（6文字以上） <span style={s.req}>必須</span></label>
          <input style={s.input} type="password" placeholder="グループ共有パスワード" value={groupPassword} onChange={(e) => setGroupPassword(e.target.value)} />
        </div>
        <div style={s.section}>
          <label style={s.label}>パスワード（確認） <span style={s.req}>必須</span></label>
          <input style={s.input} type="password" placeholder="もう一度入力" value={groupPasswordConfirm} onChange={(e) => setGroupPasswordConfirm(e.target.value)} />
        </div>

        {error && <p style={s.error}>{error}</p>}
        <button style={s.btn} onClick={handleCreateGroup} disabled={loading}>
          {loading ? "作成中..." : "グループを作成する"}
        </button>
      </div>
    </div>
  );

  // ── 既存グループ参加 ──────────────────────────────────────────────
  if (mode === "existing") return (
    <div style={s.container}>
      <div style={s.card}>
        <button style={s.backBtn} onClick={() => { setMode("select"); setError(""); setFoundGroup(null); }}>← 戻る</button>
        <div style={s.stepBadge}>既存グループに参加</div>
        <h2 style={s.title}>グループのメールアドレスとパスワードを入力してください</h2>

        <div style={s.section}>
          <label style={s.label}>グループのメールアドレス</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ ...s.input, flex: 1 }}
              type="email"
              placeholder="circle@example.com"
              value={existingEmail}
              onChange={(e) => { setExistingEmail(e.target.value); setFoundGroup(null); setError(""); }}
            />
            <button style={{ ...s.btn, width: "auto", padding: "0 16px", flexShrink: 0 }} onClick={handleSearchGroup} disabled={searching}>
              {searching ? "..." : "検索"}
            </button>
          </div>
        </div>

        {error && <p style={s.error}>{error}</p>}

        {foundGroup && (
          <div style={s.groupCard}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#F9EAED", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
              {foundGroup.avatarUrl ? <img src={foundGroup.avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : "👥"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{foundGroup.displayName}</div>
              <div style={{ fontSize: 12, color: "#5A7370" }}>{foundGroup.groupType} · {foundGroup.members?.length || 0}人のメンバー</div>
            </div>
          </div>
        )}

        {foundGroup && (
          <div style={s.section}>
            <label style={s.label}>パスワード <span style={s.req}>必須</span></label>
            <input style={s.input} type="password" placeholder="グループのパスワード" value={existingPassword} onChange={(e) => setExistingPassword(e.target.value)} />
            <button style={{ ...s.btn, marginTop: 12 }} onClick={handleJoinGroup} disabled={loading}>
              {loading ? "参加中..." : "グループに参加する"}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return null;
}

const s = {
  container: { minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", background: BG, padding: "32px 16px" },
  card: { background: "white", borderRadius: 16, padding: "32px 24px", width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" },
  logo: { width: 160, objectFit: "contain" },
  stepBadge: { background: "#F9EAED", color: THEME, fontWeight: 700, fontSize: 11, padding: "4px 12px", borderRadius: 999, width: "fit-content", letterSpacing: "0.05em" },
  title: { fontSize: 20, fontWeight: 900, color: "#111" },
  sub: { fontSize: 13, color: "#5A7370", lineHeight: 1.7 },
  backBtn: { background: "none", border: "none", color: "#5A7370", fontSize: 13, fontWeight: 700, cursor: "pointer", alignSelf: "flex-start", padding: 0 },
  optionList: { display: "flex", flexDirection: "column", gap: 12, width: "100%" },
  optionCard: { display: "flex", alignItems: "center", gap: 16, padding: "16px", borderRadius: 12, border: `2px solid ${THEME}`, background: "white", cursor: "pointer", textAlign: "left", width: "100%" },
  optionIcon: { width: 52, height: 52, borderRadius: "50%", background: "#F9EAED", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  optionTitle: { fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 2 },
  optionDesc: { fontSize: 12, color: "#5A7370" },
  section: { width: "100%", display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, fontWeight: 700, color: "#5A7370", letterSpacing: "0.05em" },
  req: { background: "#E53935", color: "white", fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 3, marginLeft: 4 },
  input: { width: "100%", padding: "11px 13px", border: "1.5px solid #D0DDD9", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" },
  btn: { width: "100%", padding: 14, background: THEME, color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer" },
  outlineBtn: { padding: "10px 20px", background: "white", border: `1.5px solid ${THEME}`, color: THEME, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  textBtn: { background: "none", border: "none", color: THEME, fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "underline" },
  error: { color: "#E53935", fontSize: 12 },
  note: { background: "#F9EAED", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: THEME, lineHeight: 1.8, width: "100%" },
  chip: { padding: "7px 14px", borderRadius: 999, border: "1.5px solid #D0DDD9", background: "white", fontSize: 13, fontWeight: 600, color: "#5A7370", cursor: "pointer" },
  chipActive: { background: THEME, color: "white", border: `1.5px solid ${THEME}` },
  groupCard: { display: "flex", alignItems: "center", gap: 12, background: "#F5F5F5", borderRadius: 12, padding: "12px 16px", width: "100%" },
  successIcon: { fontSize: 56, textAlign: "center" },
  codeInputWrap: { display: "flex", justifyContent: "center", width: "100%" },
  codeInput: { fontSize: 36, fontWeight: 900, letterSpacing: 12, textAlign: "center", width: "100%", padding: "16px", border: `2px solid ${THEME}`, borderRadius: 12, outline: "none", fontFamily: "monospace" },
};