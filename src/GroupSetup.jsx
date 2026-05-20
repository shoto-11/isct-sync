/**
 * GroupSetup.jsx
 *
 * フロー（新規グループ作成）:
 *   select → verify_new
 *     ├─ メール認証: → verify_sent（ポーリング待機）→ new_register → done
 *     └─ Google認証: → [Googleポップアップ] → new_register → done
 *
 * フロー（既存参加）:
 *   select → existing → done
 *
 * 別端末対応:
 *   メールリンクを別端末で開いた場合も Firestore の一時トークン
 *   (groupVerifyTokens/{tokenId}) でポーリングして検知する。
 *   BroadcastChannel は同一ブラウザへのフォールバックとして残す。
 */

import { useState, useEffect, useRef } from "react";
import { db, storage, firebaseConfig } from "./firebase";
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";
import {
  doc, setDoc, updateDoc, arrayUnion,
  collection, query, where, getDocs,
  getDoc, deleteDoc, serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import logoRed from "./assets/logo-red.png";
import { Mail, Users, UserCheck } from "lucide-react";

const THEME = "#88203a";
const BG = "#F4F6F5";
const BROADCAST_CHANNEL = "isct_sync_group_verify";
const POLL_INTERVAL_MS = 2500;

// グループ操作専用 secondary Firebase Auth
const groupApp =
  getApps().find((a) => a.name === "group") || initializeApp(firebaseConfig, "group");
const groupAuth = getAuth(groupApp);

const APP_ORIGIN =
  window.location.hostname === "localhost"
    ? "https://isct-sync.vercel.app/"  // 開発中でも本番URLを使う（別端末でリンクを開けるように）
    : window.location.origin;

const makeGroupEmailAction = (email, tokenId) => ({
  url: `${APP_ORIGIN}/group-setup?groupEmail=${encodeURIComponent(email)}&tokenId=${encodeURIComponent(tokenId)}`,
  handleCodeInApp: true,
});

// ─── ユーティリティ ────────────────────────────────────────────────────────────

/** Firestore に検証トークンを書き込む */
async function writeVerifyToken(tokenId, email) {
  await setDoc(doc(db, "groupVerifyTokens", tokenId), {
    email,
    verified: false,
    createdAt: serverTimestamp(),
  });
}

/** トークンを検証済みにマーク（メールリンクを開いたタブから呼ぶ） */
async function markTokenVerified(tokenId, email) {
  await updateDoc(doc(db, "groupVerifyTokens", tokenId), {
    verified: true,
    verifiedAt: serverTimestamp(),
  });
}

/** トークン削除 */
async function deleteVerifyToken(tokenId) {
  try { await deleteDoc(doc(db, "groupVerifyTokens", tokenId)); } catch (_) {}
}

// ─── コンポーネント ────────────────────────────────────────────────────────────

export default function GroupSetup({ user, onComplete, onSkip }) {
  const [mode, setMode] = useState("select");
  // select | verify_new | verify_sent | processing | verified_close_tab
  // | new_register | existing | done

  // 新規グループ用
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
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

  // ポーリング用 tokenId（verify_sent 中に使う）
  const tokenIdRef = useRef(null);
  const pollTimerRef = useRef(null);

  // ─── メールリンク受信処理（このタブ or 別タブがリンクを開いた場合） ──────────
  useEffect(() => {
    if (!isSignInWithEmailLink(groupAuth, window.location.href)) return;

    // 同一端末: localStorage、別端末: URLパラメータから取得
    const params = new URLSearchParams(window.location.search);
    const email =
      window.localStorage.getItem("groupEmailForVerify") ||
      params.get("groupEmail");
    const tokenId =
      window.localStorage.getItem("groupVerifyTokenId") ||
      params.get("tokenId");

    if (!email) return;

    setMode("processing");
    const href = window.location.href;
    window.history.replaceState({}, "", "/group-setup");

    signInWithEmailLink(groupAuth, email, href)
      .then(async () => {
        window.localStorage.removeItem("groupEmailForVerify");

        // Firestore トークンを検証済みに（別端末対応）
        if (tokenId) {
          await markTokenVerified(tokenId, email).catch(() => {});
          window.localStorage.removeItem("groupVerifyTokenId");
        }

        // 同一ブラウザ向け BroadcastChannel も送信
        try {
          const ch = new BroadcastChannel(BROADCAST_CHANNEL);
          ch.postMessage({ type: "VERIFIED", email });
          setTimeout(() => ch.close(), 1000);
        } catch (_) {}

        setVerifiedEmail(email);
        setMode("verified_close_tab");
      })
      .catch((err) => {
        setError("認証に失敗しました: " + err.message);
        setMode("verify_new");
      });
  }, []);

  // ─── verify_sent 中: BroadcastChannel + Firestore ポーリング ────────────────
  useEffect(() => {
    if (mode !== "verify_sent") {
      clearInterval(pollTimerRef.current);
      return;
    }

    // BroadcastChannel（同一ブラウザ）
    let ch;
    try {
      ch = new BroadcastChannel(BROADCAST_CHANNEL);
      ch.onmessage = (e) => {
        if (e.data?.type === "VERIFIED" && e.data?.email === verifyEmail) {
          setVerifiedEmail(e.data.email);
          ch.close();
          clearInterval(pollTimerRef.current);
          deleteVerifyToken(tokenIdRef.current);
          setMode("new_register");
        }
      };
    } catch (_) {}

    // Firestore ポーリング（別端末対応）
    const poll = async () => {
      if (!tokenIdRef.current) return;
      try {
        const snap = await getDoc(doc(db, "groupVerifyTokens", tokenIdRef.current));
        if (snap.exists() && snap.data().verified === true) {
          clearInterval(pollTimerRef.current);
          deleteVerifyToken(tokenIdRef.current);
          const email = snap.data().email;
          setVerifiedEmail(email);
          try { ch?.close(); } catch (_) {}
          setMode("new_register");
        }
      } catch (_) {}
    };
    pollTimerRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      try { ch?.close(); } catch (_) {}
      clearInterval(pollTimerRef.current);
    };
  }, [mode, verifyEmail]);

  // ─── 新規: メールリンク送信 ──────────────────────────────────────────────────
  const handleSendVerifyEmail = async () => {
    setError("");
    if (!verifyEmail.includes("@")) { setError("メールアドレスを入力してください"); return; }
    setLoading(true);
    try {
      // Firestore にトークンを作成
      const tokenId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      tokenIdRef.current = tokenId;
      await writeVerifyToken(tokenId, verifyEmail);

      // tokenId を localStorage に保存（同一端末でリンクを開いた場合に使う）
      window.localStorage.setItem("groupEmailForVerify", verifyEmail);
      window.localStorage.setItem("groupVerifyTokenId", tokenId);

      await sendSignInLinkToEmail(groupAuth, verifyEmail, makeGroupEmailAction(verifyEmail, tokenId));
      setMode("verify_sent");
    } catch (err) {
      setError("送信に失敗しました: " + err.message);
    }
    setLoading(false);
  };

  // ─── 新規: Google 認証 ───────────────────────────────────────────────────────
  const handleGoogleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(groupAuth, provider);
      const email = result.user.email;
      setVerifiedEmail(email);
      setVerifyEmail(email);
      setMode("new_register");
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Googleログインに失敗しました: " + err.message);
      }
    }
    setLoading(false);
  };

  // ─── 新規: グループ登録実行 ──────────────────────────────────────────────────
  const handleCreateGroup = async () => {
    setError("");
    if (!groupDisplayName.trim()) { setError("表示名を入力してください"); return; }
    if (!groupType) { setError("グループ種別を選択してください"); return; }
    if (!groupPassword || groupPassword.length < 6) { setError("パスワードは6文字以上で入力してください"); return; }
    if (groupPassword !== groupPasswordConfirm) { setError("パスワードが一致しません"); return; }

    const email = verifiedEmail || verifyEmail;
    if (!email) { setError("メールアドレスが確認できません"); return; }

    setLoading(true);
    const personalUid = user.uid;
    try {
      const { user: groupUser } = await createUserWithEmailAndPassword(groupAuth, email, groupPassword);

      let avatarUrl = "";
      if (avatarFile) {
        const storageRef = ref(storage, `groups/${groupUser.uid}/avatar`);
        await uploadBytes(storageRef, avatarFile);
        avatarUrl = await getDownloadURL(storageRef);
      }

      await setDoc(doc(db, "groups", groupUser.uid), {
        uid: groupUser.uid,
        email,
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

  // ─── 既存: グループ検索 ──────────────────────────────────────────────────────
  const handleSearchGroup = async () => {
    if (!existingEmail) return;
    setSearching(true);
    setFoundGroup(null);
    const q = query(collection(db, "groups"), where("email", "==", existingEmail));
    const snap = await getDocs(q);
    if (snap.empty) {
      setError("このメールアドレスのグループが見つかりませんでした");
    } else {
      setFoundGroup({ id: snap.docs[0].id, ...snap.docs[0].data() });
      setError("");
    }
    setSearching(false);
  };

  // ─── 既存: グループ参加 ──────────────────────────────────────────────────────
  const handleJoinGroup = async () => {
    setError("");
    if (!foundGroup) return;
    if (!existingPassword) { setError("パスワードを入力してください"); return; }
    setLoading(true);
    const personalUid = user.uid;
    try {
      await signInWithEmailAndPassword(groupAuth, foundGroup.email, existingPassword);

      await updateDoc(doc(db, "groups", foundGroup.id), {
        members: arrayUnion(personalUid),
      });

      await updateDoc(doc(db, "users", personalUid), {
        groups: arrayUnion(foundGroup.id),
        groupAuthDone: true,
      });

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

  // ─── スキップ ────────────────────────────────────────────────────────────────
  const handleSkip = async () => {
    try {
      await updateDoc(doc(db, "users", user.uid), { groupAuthDone: true });
    } catch (_) {}
    onSkip();
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // ─── render ─────────────────────────────────────────────────────────────────

  // 処理中
  if (mode === "processing") return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={{ fontSize: 48, textAlign: "center" }}>⏳</div>
        <p style={{ textAlign: "center", color: "#5A7370", fontWeight: 600 }}>メールアドレスを確認中...</p>
      </div>
    </div>
  );

  // メールリンク認証完了（このタブを閉じてもらう）
  if (mode === "verified_close_tab") return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.successIcon}>✅</div>
        <h2 style={s.title}>メールアドレスを確認しました</h2>
        <p style={s.sub}>このタブ（またはウィンドウ）を閉じて、元のページでグループ情報の入力に進んでください。</p>
      </div>
    </div>
  );

  // 完了
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

  // 選択画面
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

  // 新規グループ: メール入力 + Google認証
  if (mode === "verify_new") return (
    <div style={s.container}>
      <div style={s.card}>
        <button style={s.backBtn} onClick={() => { setMode("select"); setError(""); }}>← 戻る</button>
        <div style={s.stepBadge}>グループ作成 — 本人確認</div>
        <h2 style={s.title}>グループ用メールアドレスを確認します</h2>
        <p style={s.sub}>グループの管理者であることを確認するため、グループ用のメールアドレスを認証します。</p>

        {/* メール認証 */}
        <div style={s.inputGroup}>
          <label style={s.label}>グループ用メールアドレス</label>
          <input
            style={s.input}
            type="email"
            placeholder="circle@example.com"
            value={verifyEmail}
            onChange={(e) => setVerifyEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendVerifyEmail()}
          />
        </div>

        {error && <p style={s.error}>{error}</p>}

        <button style={s.btn} onClick={handleSendVerifyEmail} disabled={loading}>
          {loading ? "送信中..." : "認証メールを送る"}
        </button>

        {/* 区切り線 */}
        <div style={s.divider}>
          <div style={s.dividerLine} />
          <span style={s.dividerText}>または</span>
          <div style={s.dividerLine} />
        </div>

        {/* Google認証 */}
        <button style={s.googleBtn} onClick={handleGoogleVerify} disabled={loading}>
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {loading ? "認証中..." : "Googleアカウントで認証する"}
        </button>
      </div>
    </div>
  );

  // 認証メール送信済み（別タブ or 別端末でリンクを開くのを待つ）
  if (mode === "verify_sent") return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#F9EAED", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Mail size={36} color={THEME} />
        </div>
        <h2 style={s.title}>メールを確認してください</h2>
        <p style={s.sentText}>
          <strong>{verifyEmail}</strong> に認証リンクを送信しました。
        </p>
        <div style={s.note}>
          メール内のリンクを開いてください。<br />
          <strong>別の端末や別のブラウザ</strong>で開いても大丈夫です。<br />
          リンクを開いたら、そのページは閉じていただいて構いません。<br />
          このページが自動的に次のステップに進みます。
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#5A7370", fontSize: 13 }}>
          <div style={{ width: 16, height: 16, border: `2px solid ${THEME}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          確認中...
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
        <button style={s.outlineBtn} onClick={() => {
          clearInterval(pollTimerRef.current);
          deleteVerifyToken(tokenIdRef.current);
          tokenIdRef.current = null;
          setMode("verify_new");
          setError("");
        }}>
          別のメールアドレスで試す
        </button>
      </div>
    </div>
  );

  // 新規グループ情報入力
  if (mode === "new_register") return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.stepBadge}>グループ作成 — 情報入力</div>
        <h2 style={s.title}>グループ情報を入力してください</h2>

        {/* アイコン */}
        <div style={s.section}>
          <label style={s.label}>グループアイコン（任意）</label>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#F9EAED", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, flexShrink: 0 }}>
              {avatarPreview ? <img src={avatarPreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : "👥"}
            </div>
            <button style={s.outlineBtn} onClick={() => document.getElementById("groupAvatar").click()}>
              画像を選択
            </button>
            <input id="groupAvatar" type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
          </div>
        </div>

        {/* 表示名 */}
        <div style={s.section}>
          <label style={s.label}>グループ表示名 <span style={s.req}>必須</span></label>
          <input style={s.input} placeholder="例：東科大バスケ部" value={groupDisplayName} onChange={(e) => setGroupDisplayName(e.target.value)} />
        </div>

        {/* グループ種別 */}
        <div style={s.section}>
          <label style={s.label}>グループ種別 <span style={s.req}>必須</span></label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["サークル", "団体", "企業", "その他"].map((t) => (
              <button key={t} style={{ ...s.chip, ...(groupType === t ? s.chipActive : {}) }} onClick={() => setGroupType(t)}>{t}</button>
            ))}
          </div>
        </div>

        {/* メールアドレス（確認済み） */}
        <div style={s.section}>
          <label style={s.label}>グループ用メールアドレス（確認済み）</label>
          <div style={{ ...s.input, background: "#F5F5F5", color: "#5A7370" }}>
            {verifiedEmail || verifyEmail}
          </div>
        </div>

        {/* パスワード */}
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

  // 既存グループ参加
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
            <button
              style={{ ...s.btn, width: "auto", padding: "0 16px", flexShrink: 0 }}
              onClick={handleSearchGroup}
              disabled={searching}
            >
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
            <input
              style={s.input}
              type="password"
              placeholder="グループのパスワード"
              value={existingPassword}
              onChange={(e) => setExistingPassword(e.target.value)}
            />
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
  inputGroup: { width: "100%", display: "flex", flexDirection: "column", gap: 6 },
  btn: { width: "100%", padding: 14, background: THEME, color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer" },
  outlineBtn: { padding: "10px 20px", background: "white", border: `1.5px solid ${THEME}`, color: THEME, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  error: { color: "#E53935", fontSize: 12 },
  note: { background: "#F9EAED", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: THEME, lineHeight: 2, width: "100%" },
  chip: { padding: "7px 14px", borderRadius: 999, border: "1.5px solid #D0DDD9", background: "white", fontSize: 13, fontWeight: 600, color: "#5A7370", cursor: "pointer" },
  chipActive: { background: THEME, color: "white", border: `1.5px solid ${THEME}` },
  groupCard: { display: "flex", alignItems: "center", gap: 12, background: "#F5F5F5", borderRadius: 12, padding: "12px 16px", width: "100%" },
  sentText: { fontSize: 14, color: "#5A7370", lineHeight: 1.7, textAlign: "center" },
  successIcon: { fontSize: 56, textAlign: "center" },
  divider: { display: "flex", alignItems: "center", gap: 8, width: "100%" },
  dividerLine: { flex: 1, height: 1, background: "#E0E8E7" },
  dividerText: { fontSize: 12, color: "#5A7370", flexShrink: 0 },
  googleBtn: { width: "100%", padding: "13px 16px", background: "white", border: "1.5px solid #D0DDD9", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "#1A2E2B", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
};