import { useState, useRef } from "react";
import { db, functions, auth, storage } from "./firebase"; 
import { httpsCallable } from "firebase/functions";
import { GoogleAuthProvider, signInWithPopup, linkWithCredential, reauthenticateWithPopup } from "firebase/auth"; // 💡 認証汚染を防ぐためのインポート
import { 
  doc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  serverTimestamp, 
  arrayUnion,
  setDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; 
import logoRed from "./assets/logo-red.png";
import { Users, UserCheck, Mail, KeyRound, CheckCircle, ArrowRight, Camera } from "lucide-react"; 

const THEME = "#88203a";
const BG = "#F4F6F5";

export default function GroupSetup({ user, onComplete, onSkip }) {
  // 画面遷移管理: 'select' | 'email' | 'code' | 'info' | 'success'
  const [step, setStep] = useState("select");
  const [mode, setMode] = useState("create"); // 'create' (新規) または 'join' (参加)
  
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupType, setGroupType] = useState("サークル");

  // アイコン画像用ステート
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [targetGroupId, setTargetGroupId] = useState(null); 

  const fileInputRef = useRef(null); 

  // 画像選択時の処理
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  // セットアップ完了時の共通処理
  const finalizeSetup = async () => {
    try {
      await updateDoc(doc(db, "users", user.uid), { groupAuthDone: true });
    } catch (e) {
      console.error("Failed to update user profile:", e);
    }
    onComplete();
  };

  const handleSkip = async () => {
    setLoading(true);
    await finalizeSetup();
    setLoading(false);
  };

  // 💡 共通ロジック：メールアドレス確定後の処理（重複チェック ＆ 参加 or 作成への進路振り分け）
  const processGroupEmail = async (targetEmail) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    setEmail(cleanEmail);

    // 【既存参加モード】グループが存在するかチェック
    if (mode === "join") {
      const gQuery = query(collection(db, "groups"), where("groupEmail", "==", cleanEmail));
      const gSnap = await getDocs(gQuery);
      if (gSnap.empty) {
        throw new Error("指定されたメールアドレスで登録されているグループが見つかりません。");
      }
      const groupId = gSnap.docs[0].id;
      
      // 既存のサークルグループへ即座に合流
      const groupRef = doc(db, "groups", groupId);
      await updateDoc(groupRef, { members: arrayUnion(user.uid) });
      await updateDoc(doc(db, "users", user.uid), { groups: arrayUnion(groupId) });
      setStep("success");
    } else {
      // 【新規作成モード】重複チェック
      const gQuery = query(collection(db, "groups"), where("groupEmail", "==", cleanEmail));
      const gSnap = await getDocs(gQuery);
      if (!gSnap.empty) {
        throw new Error("このメールアドレスは既に別のグループで登録されています。");
      }
      setStep("info");
    }
  };

  // 💡 【超重要修正】Googleアカウントによるサークル認証処理（個人のセッションを壊さない防衛実装）
  // 💡 【完全決着版】個人のセッションを1ミリも刺激せずに、別アカウントのGoogleメールだけを安全に引っこ抜く
  const handleGoogleGroupAuth = async () => {
    setError("");
    setLoading(true);

    try {
      // 1. 既存のインポートから Firebase の初期化関数を動的に取得
      const { initializeApp, getApps } = await import("firebase/app");
      const { getAuth, signInWithPopup: isolatedSignIn, GoogleAuthProvider: IsolatedProvider } = await import("firebase/auth");
      
      // 2. メインのアカウント環境を絶対に汚さないよう、「使い捨ての隔離アプリ環境」をその場で作る
      // 💡 すでにデプロイ等で使用している既存の Firebase 設定をメモリ上から拝借します
      const mainConfig = auth.app.options; 
      
      // "isolatedGroupAuthApp" という名前で、メインとは完全に分離された隔離空間を確立
      const isolatedApp = getApps().find(app => app.name === "isolatedGroupAuthApp") 
        || initializeApp(mainConfig, "isolatedGroupAuthApp");
      
      const isolatedAuth = getAuth(isolatedApp);

      // 3. 隔離された環境で Google ポップアップを起動（これで App.jsx の監視は1ミリも反応しません）
      const provider = new IsolatedProvider();
      provider.setCustomParameters({ prompt: 'select_account' }); // 必ずアカウント選択を強制

      const res = await isolatedSignIn(isolatedAuth, provider);
      const googleEmail = res.user.email;

      if (!googleEmail) {
        throw new Error("Googleアカウントからメールアドレスを取得できませんでした。");
      }

      const cleanGoogleEmail = googleEmail.toLowerCase();

      // 4. 重複・存在チェックを実行（すでにあるグループならここでエラーが飛んで catch に行きます）
      await processGroupEmail(cleanGoogleEmail);

      // 5. チェックを無事通過した場合のみ、ホワイトリストに先回り追加
      await setDoc(doc(db, "allowedEmails", cleanGoogleEmail), {
        isGroupEmail: true,
        registeredBy: user.uid,
        createdAt: serverTimestamp()
      });

      // 💡 使い終わった隔離セッションを安全に消去
      await isolatedAuth.signOut();

    } catch (err) {
      console.error("Isolated Google Auth Error:", err);
      // 💡 画面は Login に戻らず、個人セッションも 100% 維持したまま、その場のアラートにエラーを留まらせます！
      setError(err.message || "Google認証に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  // 1. Cloud Functions を使ってメール（6桁コード）を送信
  const handleSendCode = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim()) { setError("メールアドレスを入力してください"); return; }

    setLoading(true);
    setError("");

    try {
      const cleanEmail = email.trim().toLowerCase();

      // 事前の存在・重複チェックをかける
      if (mode === "join") {
        const gQuery = query(collection(db, "groups"), where("groupEmail", "==", cleanEmail));
        const gSnap = await getDocs(gQuery);
        if (gSnap.empty) {
          setError("指定されたメールアドレスで登録されているグループが見つかりません。");
          setLoading(false);
          return;
        }
        setTargetGroupId(gSnap.docs[0].id);
      } else {
        const gQuery = query(collection(db, "groups"), where("groupEmail", "==", cleanEmail));
        const gSnap = await getDocs(gQuery);
        if (!gSnap.empty) {
          setError("このメールアドレスは既に別のグループで登録されています。");
          setLoading(false);
          return;
        }
      }

      // ホワイトリストへの先回り登録
      await setDoc(doc(db, "allowedEmails", cleanEmail), {
        isGroupEmail: true,
        registeredBy: user.uid,
        createdAt: serverTimestamp()
      });

      const sendOtpCodeFn = httpsCallable(functions, "sendotpcode");
      const result = await sendOtpCodeFn({ email: cleanEmail }); 

      if (result.data.success) {
        setStep("code");
      } else {
        setError("コードの送信に失敗しました。");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "確認コードの送信に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  // 2. 6桁のコードを検証
  const handleVerifyCode = async (e) => {
    if (e) e.preventDefault();
    if (code.length !== 6) { setError("6桁の確認コードを入力してください"); return; }

    setLoading(true);
    setError("");

    try {
      const cleanEmail = email.trim().toLowerCase();
      
      const verifyOtpCodeFn = httpsCallable(functions, "verifyotpcode");
      const result = await verifyOtpCodeFn({ email: cleanEmail, code: code.trim() });

      if (result.data.success) {
        await processGroupEmail(cleanEmail);
      } else {
        setError("認証に失敗しました。");
      }
    } catch (err) {
      console.error(err);
      setError("確認コードが正しくないか、有効期限が切れています。");
    } finally {
      setLoading(false);
    }
  };

  // 3. グループの新規作成・Firestoreへの登録
  const handleCreateGroup = async (e) => {
    if (e) e.preventDefault();
    if (!groupName.trim()) { setError("グループ名を入力してください"); return; }

    setLoading(true);
    setError("");

    try {
      const cleanEmail = email.trim().toLowerCase();
      const newGroupRef = doc(collection(db, "groups"));
      const groupId = newGroupRef.id;

      let uploadedAvatarUrl = null;

      if (avatarFile) {
        const storageRef = ref(storage, `groups/${groupId}/avatar.png`);
        const snapshot = await uploadBytes(storageRef, avatarFile);
        uploadedAvatarUrl = await getDownloadURL(snapshot.ref);
      }

      const newGroupData = {
        displayName: groupName.trim(),
        groupEmail: cleanEmail,
        groupType: groupType,
        avatarUrl: uploadedAvatarUrl, 
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        members: [user.uid]
      };

      await setDoc(newGroupRef, newGroupData);

      await updateDoc(doc(db, "users", user.uid), {
        groups: arrayUnion(groupId)
      });

      setStep("success");
    } catch (err) {
      console.error(err);
      setError("グループの作成に失敗しました。詳細: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        <img src={logoRed} alt="SYNC" style={s.logo} />
        <div style={s.stepBadge}>STEP 2 / 2 &nbsp;グループ設定</div>

        {error && <div style={s.errorBox}>{error}</div>}

        {/* ─── STEP A: モード選択画面 ─── */}
        {step === "select" && (
          <>
            <h2 style={s.title}>グループとして登録しますか？</h2>
            <p style={s.sub}>サークル・団体・企業の公式アカウントとしてイベントを募集できます。後からマイページでも追加できます。</p>

            <div style={s.optionList}>
              <button style={s.optionCard} onClick={() => { setMode("create"); setStep("email"); setError(""); }} disabled={loading}>
                <div style={{ ...s.optionIcon, background: "#F9EAED" }}>
                  <Users size={24} color={THEME} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={s.optionTitle}>新しいグループを新規作成</div>
                  <div style={s.optionDesc}>新しくサークルや団体の管理権限を作ります。</div>
                </div>
                <ArrowRight size={18} color="#B0BEC5" />
              </button>

              <button style={s.optionCard} onClick={() => { setMode("join"); setStep("email"); setError(""); }} disabled={loading}>
                <div style={{ ...s.optionIcon, background: "#E0F2F1" }}>
                  <UserCheck size={24} color="#007A6E" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={s.optionTitle}>既存のグループに参加する</div>
                  <div style={s.optionDesc}>既に誰かが作成したサークルにメンバーとして合流します。</div>
                </div>
                <ArrowRight size={18} color="#B0BEC5" />
              </button>
            </div>

            <button style={s.skipBtn} onClick={handleSkip} disabled={loading}>
              グループ設定をスキップして個人で使用する
            </button>
          </>
        )}

        {/* ─── STEP B: メールアドレス入力 または Googleログイン ─── */}
        {step === "email" && (
          <>
            <h2 style={s.title}>{mode === "create" ? "グループ用アカウントの認証" : "所属グループアカウントの認証"}</h2>
            <p style={s.sub}>
              {mode === "create" 
                ? "サークル用の共有メールアドレス、またはGoogleアカウントで認証してください。" 
                : "合流したいグループの登録済みメールアドレス、またはGoogleアカウントで認証してください。"}
            </p>
            
            <form style={s.form} onSubmit={handleSendCode}>
              <div style={s.formGroup}>
                <label style={s.label}>メールアドレス</label>
                <input 
                  type="email" 
                  placeholder="example@gmail.com" 
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

            <div style={s.divider}>
              <div style={s.dividerLine}></div>
              <span style={s.dividerText}>または</span>
              <div style={s.dividerLine}></div>
            </div>

            <button 
              type="button"
              style={s.googleBtn} 
              onClick={handleGoogleGroupAuth} 
              disabled={loading}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f8f9fa";
                e.currentTarget.style.boxShadow = "0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#ffffff";
                e.currentTarget.style.boxShadow = "0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)";
              }}
              onMouseDown={(e) => e.currentTarget.style.backgroundColor = "#eeeeee"}
              onMouseUp={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
            >
              <div style={s.googleIconWrapper}>
                <svg style={s.googleIcon} viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.53-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-8.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.11 0-5.74-2.11-6.68-4.96H1.21v3.15C3.18 21.88 7.31 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.32 14.24A7.16 7.16 0 0 1 5 12c0-.79.13-1.57.32-2.34V6.51H1.21A11.94 11.94 0 0 0 0 12c0 1.92.45 3.74 1.21 5.39l4.11-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.18 2.12 1.21 6.51l4.11 3.15c.94-2.85 3.57-4.96 6.68-4.96z"/>
                </svg>
              </div>
              <span style={s.googleBtnText}>Google アカウントでログイン</span>
            </button>

            <div style={s.note}>
              ※確認コードの有効期限は5分間です。<br />
              メールが届かない場合は、迷惑メールフォルダをご確認ください。
            </div>
            <button type="button" style={{ ...s.textBtn, marginTop: 4 }} onClick={() => setStep("select")} disabled={loading}>
              ← 選択画面に戻る
            </button>
          </>
        )}

        {/* ─── STEP C: 6桁確認コード入力画面 ─── */}
        {step === "code" && (
          <>
            <h2 style={s.title}>確認コードの入力</h2>
            <p style={s.sub}><strong style={{ color: "#111" }}>{email}</strong> 宛に送信された6桁の確認コードを入力してください。</p>

            <form style={s.form} onSubmit={handleVerifyCode}>
              <div style={s.formGroup}>
                <label style={s.label}>6桁の確認コード</label>
                <input 
                  type="text" 
                  placeholder="123456" 
                  maxLength={6}
                  style={{ ...s.input, letterSpacing: "0.3em", textAlign: "center", fontSize: "18px", fontWeight: "bold" }}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  disabled={loading}
                  required
                />
              </div>

              <button type="submit" style={s.btn} disabled={loading || code.length !== 6}>
                {loading ? "認証中..." : "認証して進む"}
              </button>
              <button 
                type="button" 
                style={{ ...s.textBtn, marginTop: 8, width: "100%" }} 
                onClick={() => { setStep("email"); setCode(""); }}
                disabled={loading}
              >
                ← メールアドレスを入力し直す
              </button>
            </form>

            <div style={s.note}>
              ※確認コードの有効期限は5分間です。<br />
              メールが届かない場合は、迷惑メールフォルダをご確認ください。
            </div>
          </>
        )}

        {/* ─── STEP D: グループ詳細情報入力（新規作成のみ） ─── */}
        {step === "info" && (
          <form onSubmit={handleCreateGroup} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
            <h2 style={s.title}>グループプロフィールの設定</h2>
            <p style={s.sub}>メールアドレス: <strong>{email}</strong><br />イベントの主催者情報として表示されるサークル名などを設定します。</p>

            {/* アイコン画像設定セクション */}
            <div style={s.avatarContainer}>
              <div style={s.avatarWrapper} onClick={() => !loading && fileInputRef.current.click()}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" style={s.avatarImg} />
                ) : (
                  <div style={s.avatarPlaceholder}>
                    <Users size={32} color="#9AADA8" />
                  </div>
                )}
                <div style={s.cameraBadge}>
                  <Camera size={14} color="white" />
                </div>
              </div>
              <label style={s.avatarLabel}>グループのアイコン画像</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: "none" }}
                disabled={loading}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>グループ名 / サークル名</label>
              <input 
                type="text" 
                placeholder="例: テニスサークルSYNC" 
                style={s.input}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>グループ区分</label>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {["サークル", "団体", "企業", "その他"].map((t) => (
                  <button 
                    type="button"
                    key={t}
                    style={{ 
                      flex: 1, padding: "10px", borderRadius: 8, 
                      border: `1.5px solid ${groupType === t ? THEME : "#D0DDD9"}`, 
                      background: groupType === t ? THEME : "white", 
                      color: groupType === t ? "white" : "#5A7370", 
                      fontSize: 12, fontWeight: 600, cursor: "pointer" 
                    }}
                    onClick={() => setGroupType(t)}
                    disabled={loading}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" style={{ ...s.btn, marginTop: 8 }} disabled={loading || !groupName.trim()}>
              {loading ? "グループを開設中..." : "グループを新規開設する"}
            </button>
          </form>
        )}

        {/* ─── STEP E: 完了画面 ─── */}
        {step === "success" && (
          <div style={{ textAlign: "center", width: "100%", display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
            <CheckCircle size={56} color="#007A6E" />
            <h2 style={s.title}>{mode === "create" ? "グループ作成完了！" : "グループ合流完了！"}</h2>
            <p style={s.sub}>
              {mode === "create"
                ? `「${groupName}」の作成が完了しました！これよりこのグループ名義で公式イベントを投稿・管理できます。`
                : `既存グループへの合流が完了しました！イベント管理権限があなた（個人）のアカウントへ共有されます。`}
            </p>

            <button style={{ ...s.btn, marginTop: 8 }} onClick={finalizeSetup} disabled={loading}>
              SYNCをはじめる
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

const s = {
  container: { background: "#F4F6F5", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
  card: { background: "white", borderRadius: 16, padding: "32px 24px", width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" },
  logo: { width: 140, objectFit: "contain", alignSelf: "center" },
  stepBadge: { background: "#F9EAED", color: THEME, fontWeight: 700, fontSize: 11, padding: "4px 12px", borderRadius: 999, width: "fit-content", letterSpacing: "0.05em", margin: "0 auto" },
  title: { fontSize: 18, fontWeight: 800, color: "#111", textAlign: "center" },
  sub: { fontSize: 13, color: "#5A7370", lineHeight: 1.6, textAlign: "center" },
  optionList: { display: "flex", flexDirection: "column", gap: 12, width: "100%" },
  optionCard: { display: "flex", alignItems: "center", gap: 16, padding: "16px", borderRadius: 12, border: "2px solid #E0DDD9", background: "white", cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.2s" },
  optionIcon: { width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  optionTitle: { fontSize: 14, fontWeight: 700, color: "#111" },
  optionDesc: { fontSize: 11, color: "#5A7370", marginTop: 2 },
  skipBtn: { width: "100%", padding: "12px", background: "none", border: "1.5px solid #D0DDD9", borderRadius: 8, color: "#5A7370", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  
  form: { display: "flex", flexDirection: "column", gap: 16, width: "100%" },
  formGroup: { display: "flex", flexDirection: "column", gap: 5, width: "100%" },
  label: { fontSize: 12, fontWeight: 700, color: "#5A7370", letterSpacing: "0.05em" },
  input: { width: "100%", padding: "12px 14px", border: "1.5px solid #D0DDD9", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" },
  btn: { width: "100%", padding: 14, background: THEME, color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer" },
  textBtn: { background: "none", border: "none", color: "#5A7370", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "4px", margin: "0 auto", textAlign: "center" },
  
  note: { background: "#F9EAED", borderRadius: 8, padding: "10px 14px", fontSize: 11, color: THEME, lineHeight: 1.6, textAlign: "center", width: "100%", boxSizing: "border-box" },
  errorBox: { color: "#C62828", fontSize: 12, textAlign: "center", background: "#FFEBEE", padding: "10px", borderRadius: 8, fontWeight: 500, width: "100%", boxSizing: "border-box" },
  
  divider: { display: "flex", alignItems: "center", gap: 8, width: "100%" },
  dividerLine: { flex: 1, height: 1, background: "#E0E8E7" },
  dividerText: { fontSize: 12, color: "#9AADA8" },
  
  googleBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: 44,
    backgroundColor: "#ffffff", border: "1px solid #dadce0", borderRadius: 8, cursor: "pointer",
    padding: "0 12px", boxSizing: "border-box", transition: "background-color 0.2s, box-shadow 0.2s",
    boxShadow: "0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)",
  },
  googleIconWrapper: { display: "flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, marginRight: 12 },
  googleIcon: { width: "100%", height: "100%" },
  googleBtnText: { color: "#3c4043", fontFamily: '"Roboto", "Helvetica Neue", Arial, sans-serif', fontSize: 14, fontWeight: 700, letterSpacing: "0.25px" },

  avatarContainer: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 4, width: "100%" },
  avatarWrapper: { position: "relative", width: 80, height: 80, cursor: "pointer" },
  avatarImg: { width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", border: "2.5px solid #D0DDD9" },
  avatarPlaceholder: { width: "100%", height: "100%", borderRadius: "50%", background: "#F4F6F5", display: "flex", alignItems: "center", justifyContent: "center", border: "2.5px dashed #D0DDD9" },
  cameraBadge: { position: "absolute", bottom: 0, right: 0, background: THEME, borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" },
  avatarLabel: { fontSize: 11, fontWeight: 600, color: "#7A9591" }
};