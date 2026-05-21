import { useState } from "react";
import { db, functions } from "./firebase";
import { httpsCallable } from "firebase/functions";
import { 
  doc, 
  updateDoc, 
  collection, 
  addDoc, 
  setDoc,
  getDocs, 
  query, 
  where, 
  serverTimestamp, 
  arrayUnion 
} from "firebase/firestore";
import logoRed from "./assets/logo-red.png";
import { Users, UserCheck, Mail, KeyRound, CheckCircle, ArrowRight } from "lucide-react";

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [targetGroupId, setTargetGroupId] = useState(null); // 参加対象グループID

  // セットアップ完了時の共通処理
  const finalizeSetup = async () => {
    try {
      await updateDoc(doc(db, "users", user.uid), { groupAuthDone: true });
    } catch (e) {
      console.error("Failed to update user profile:", e);
    }
    onComplete();
  };

  // スキップ処理
  const handleSkip = async () => {
    setLoading(true);
    await finalizeSetup();
    setLoading(false);
  };

  // 1. 【個人と同じ】Cloud Functions を使って本物のメール（6桁コード）を送信
  // 1. Cloud Functions を使って本物のメール（6桁コード）を送信
  const handleSendCode = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim()) { setError("メールアドレスを入力してください"); return; }

    setLoading(true);
    setError("");

    try {
      const cleanEmail = email.trim().toLowerCase();

      // 【既存参加モード】グループが存在するかチェック
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
        // 【新規作成モード】重複チェック
        const gQuery = query(collection(db, "groups"), where("groupEmail", "==", cleanEmail));
        const gSnap = await getDocs(gQuery);
        if (!gSnap.empty) {
          setError("このメールアドレスは既に別のグループで登録されています。");
          setLoading(false);
          return;
        }
      }

      // 💡 解決策：一般ドメイン（Gmailなど）でもエラーにならないよう、
      // 登録するアドレスを Firestore の `allowedEmails` コレクションに先回りして登録（ホワイトリスト化）する
      try {
        await setDoc(doc(db, "allowedEmails", cleanEmail), {
          isGroupEmail: true,
          registeredBy: user.uid,
          createdAt: serverTimestamp()
        });
      } catch (authErr) {
        console.warn("allowedEmailsへの事前登録に失敗しました（ルール制限の可能性があります）:", authErr);
        // ※ もしここでセキュリティルールにより弾かれる場合は、事前にFirebaseコンソールで
        // allowedEmails の allow write: if request.auth != null; になっているか確認してください
      }

      // 個人用ログインと100%同じ Cloud Functions 'sendotpcode' を実行！
      const sendOtpCodeFn = httpsCallable(functions, "sendotpcode");
      const result = await sendOtpCodeFn({ email: cleanEmail }); 

      if (result.data.success) {
        setStep("code");
      } else {
        setError("コードの送信に失敗しました。");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "確認コードの送信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  // 2. 【個人と同じ】6桁のコードを検証
  const handleVerifyCode = async (e) => {
    if (e) e.preventDefault();
    if (code.length !== 6) { setError("6桁の確認コードを入力してください"); return; }

    setLoading(true);
    setError("");

    try {
      const cleanEmail = email.trim().toLowerCase();
      
      // 💡 個人用ログインと100%同じ Cloud Functions 'verifyotpcode' を呼び出し！
      const verifyOtpCodeFn = httpsCallable(functions, "verifyotpcode");
      const result = await verifyOtpCodeFn({ email: cleanEmail, code: code.trim() });

      if (result.data.success) {
        if (mode === "join") {
          // 【既存参加】の場合は即座にメンバー配列に自分を合流させる
          if (targetGroupId) {
            const groupRef = doc(db, "groups", targetGroupId);
            await updateDoc(groupRef, {
              members: arrayUnion(user.uid)
            });
            // 自分のユーザー情報側の所属グループリスト（groups配列）にも追加
            await updateDoc(doc(db, "users", user.uid), {
              groups: arrayUnion(targetGroupId)
            });
            setStep("success");
          } else {
            setError("グループの紐付けに失敗しました。");
          }
        } else {
          // 【新規作成】の場合はグループのプロフィール入力へ進む
          setStep("info");
        }
      } else {
        setError("認証に失敗しました。");
      }
    } catch (err) {
      console.error(err);
      setError("確認コードが正しくないか、有効期限（5分）が切れています。");
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

      // 💡 Firestoreの `groups` コレクションへ新規保存（一覧でいつでも見れるようになります）
      const newGroupData = {
        displayName: groupName.trim(),
        groupEmail: cleanEmail,
        groupType: groupType,
        avatarUrl: null,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        members: [user.uid] // 作成者を最初のメンバーに設定
      };

      const groupDocRef = await addDoc(collection(db, "groups"), newGroupData);

      // 自分のユーザー情報側の所属グループリスト（groups配列）にもこのグループIDを記録
      await updateDoc(doc(db, "users", user.uid), {
        groups: arrayUnion(groupDocRef.id)
      });

      setStep("success");
    } catch (err) {
      console.error(err);
      setError("グループの作成に失敗しました。");
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
              <button style={s.optionCard} onClick={() => { setMode("create"); setStep("email"); setError(""); }}>
                <div style={{ ...s.optionIcon, background: "#F9EAED" }}>
                  <Users size={24} color={THEME} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={s.optionTitle}>新しいグループを新規作成</div>
                  <div style={s.optionDesc}>新しくサークルや団体の管理権限を作ります。</div>
                </div>
                <ArrowRight size={18} color="#B0BEC5" />
              </button>

              <button style={s.optionCard} onClick={() => { setMode("join"); setStep("email"); setError(""); }}>
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

        {/* ─── STEP B: メールアドレス入力画面 ─── */}
        {step === "email" && (
          <form onSubmit={handleSendCode} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
            <h2 style={s.title}>{mode === "create" ? "グループ用メールの認証" : "所属グループメールの認証"}</h2>
            <p style={s.sub}>
              {mode === "create" 
                ? "サークルの公式アドレス、または共有用Gmailアドレスを入力してください。" 
                : "合流したいグループの登録済みメールアドレスを入力してください。"}
            </p>
            
            <div style={s.inputWrapper}>
              <Mail size={18} color="#5A7370" style={s.inputIcon} />
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

            <button type="submit" style={s.primaryBtn} disabled={loading}>
              {loading ? "送信中..." : "確認コードを送信"}
            </button>
            <button type="button" style={s.textBtn} onClick={() => setStep("select")}>
              戻る
            </button>
          </form>
        )}

        {/* ─── STEP C: 6桁確認コード入力画面 ─── */}
        {step === "code" && (
          <form onSubmit={handleVerifyCode} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
            <h2 style={s.title}>確認コードの入力</h2>
            <p style={s.sub}><strong style={{ color: "#111" }}>{email}</strong> 宛に送信された<span style={{ color: THEME, fontWeight: "bold" }}>6桁の確認コード</span>を入力してください。</p>

            <div style={s.inputWrapper}>
              <KeyRound size={18} color="#5A7370" style={s.inputIcon} />
              <input 
                type="text" 
                placeholder="6桁の数字" 
                maxLength={6}
                style={{ ...s.input, letterSpacing: "0.2em", fontWeight: "bold", fontSize: "16px" }}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                disabled={loading}
                required
              />
            </div>

            <button type="submit" style={s.primaryBtn} disabled={loading || code.length !== 6}>
              {loading ? "照合中..." : "コードを確認して次へ"}
            </button>
            <button type="button" style={s.textBtn} onClick={() => { setStep("email"); setCode(""); }}>
              メールアドレスを入力し直す
            </button>
          </form>
        )}

        {/* ─── STEP D: グループ詳細情報入力（新規作成のみ） ─── */}
        {step === "info" && (
          <form onSubmit={handleCreateGroup} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
            <h2 style={s.title}>グループプロフィールの設定</h2>
            <p style={s.sub}>イベントの主催者情報として表示されるサークル名などを設定します。</p>

            <div style={s.field}>
              <label style={s.label}>グループ名 / サークル名</label>
              <input 
                type="text" 
                placeholder="例: テニスサークルSYNC" 
                style={s.inputPlain}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
              />
            </div>

            <div style={s.field}>
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
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" style={s.primaryBtn} disabled={loading}>
              {loading ? "作成中..." : "グループを新規開設する"}
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
                : "既存のサークルグループへの所属が認証されました。イベント管理権限が共有されます。"}
            </p>

            <button style={s.primaryBtn} onClick={finalizeSetup}>
              SYNCをはじめる
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

const s = {
  container: { background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
  card: { background: "white", borderRadius: 16, padding: "32px 24px", width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" },
  logo: { width: 160, objectFit: "contain", margin: "0 auto 8px" },
  stepBadge: { background: "#F9EAED", color: THEME, fontWeight: 700, fontSize: 11, padding: "4px 12px", borderRadius: 999, width: "fit-content", letterSpacing: "0.05em", margin: "0 auto" },
  title: { fontSize: 20, fontWeight: 900, color: "#111", textAlign: "center", marginTop: 4 },
  sub: { fontSize: 13, color: "#5A7370", lineHeight: 1.6, textAlign: "center" },
  optionList: { display: "flex", flexDirection: "column", gap: 12, width: "100%", marginTop: 8 },
  optionCard: { display: "flex", alignItems: "center", gap: 16, padding: "16px", borderRadius: 12, border: "2px solid #E0DDD9", background: "white", cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.2s" },
  optionIcon: { width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  optionTitle: { fontSize: 14, fontWeight: 700, color: "#111" },
  optionDesc: { fontSize: 11, color: "#5A7370", marginTop: 2 },
  skipBtn: { width: "100%", padding: "12px", background: "none", border: "1.5px solid #D0DDD9", borderRadius: 8, color: "#5A7370", fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 12 },
  primaryBtn: { width: "100%", padding: "14px", background: THEME, color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 6 },
  textBtn: { background: "none", border: "none", color: "#5A7370", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "4px", margin: "0 auto" },
  inputWrapper: { display: "flex", alignItems: "center", position: "relative", width: "100%" },
  inputIcon: { position: "absolute", left: 14 },
  input: { width: "100%", padding: "12px 12px 12px 42px", border: "1.5px solid #D0DDD9", borderRadius: 8, fontSize: 14, outline: "none" },
  field: { display: "flex", flexDirection: "column", gap: 6, width: "100%" },
  label: { fontSize: 12, fontWeight: 700, color: "#5A7370" },
  inputPlain: { width: "100%", padding: "12px", border: "1.5px solid #D0DDD9", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" },
  errorBox: { background: "#FFEBEE", borderLeft: "4px solid #D32F2F", color: "#C62828", padding: "10px 12px", borderRadius: 4, fontSize: 12, fontWeight: 600 }
};