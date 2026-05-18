import { useState } from "react";
import { auth, db } from "./firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

const THEME = "#88203a";

export default function GroupAuth({ currentUser, onComplete, onSkip }) {
  const [mode, setMode] = useState("select"); // select | join | create | verify
  const [groupType, setGroupType] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSearch = async () => {
    if (!email) return;
    setSearching(true);
    const q = query(collection(db, "groups"), where("email", "==", email));
    const snap = await getDocs(q);
    setSearchResults(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setSearching(false);
  };

  const handleJoin = async (group) => {
    setLoading(true);
    setError("");
    try {
      const credential = await signInWithEmailAndPassword(auth, group.email, password);
      // 個人アカウントにグループを追加
      await updateDoc(doc(db, "users", currentUser.uid), {
        groups: arrayUnion(group.id)
      });
      onComplete(group);
    } catch (err) {
      setError("パスワードが間違っています");
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    try {
      // グループアカウント作成
      const { user: groupUser } = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(groupUser);

      let avatarUrl = "";
      if (avatarFile) {
        const storageRef = ref(storage, `groups/${groupUser.uid}/avatar`);
        await uploadBytes(storageRef, avatarFile);
        avatarUrl = await getDownloadURL(storageRef);
      }

      // Firestoreにグループ情報保存
      await setDoc(doc(db, "groups", groupUser.uid), {
        uid: groupUser.uid,
        email,
        displayName,
        avatarUrl,
        groupType,
        members: [currentUser.uid],
        createdAt: new Date(),
      });

      // 個人アカウントにグループを追加
      await updateDoc(doc(db, "users", currentUser.uid), {
        groups: arrayUnion(groupUser.uid)
      });

      setMode("verify");
      onComplete({ id: groupUser.uid, displayName, avatarUrl, groupType });
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("このメールアドレスはすでに使用されています");
      } else {
        setError("エラーが発生しました: " + err.message);
      }
    }
    setLoading(false);
  };

  if (mode === "verify") return (
    <div style={s.container}>
      <div style={s.card}>
        <h2 style={s.title}>メール認証を確認してください</h2>
        <p style={s.sub}>登録したメールアドレスに認証メールを送信しました。メール内のリンクをクリックして認証を完了してください。</p>
        <button style={s.btn} onClick={onSkip}>後で設定する</button>
      </div>
    </div>
  );

  if (mode === "select") return (
    <div style={s.container}>
      <div style={s.card}>
        <h2 style={s.title}>グループとして募集しますか？</h2>
        <p style={s.sub}>サークル・団体・企業の公式アカウントとしてイベントを募集できます</p>
        <p style={{ fontSize:11, color:"#5A7370", marginBottom:16 }}>※後からマイページでも追加できます</p>
        <div style={{ display:"flex", flexDirection:"column", gap:8, width:"100%" }}>
          <button style={s.btn} onClick={() => setMode("join")}>既存のグループに参加する</button>
          <button style={s.btn} onClick={() => setMode("create")}>新しくグループを作成する</button>
          <button style={{ ...s.btn, background:"white", color:THEME, border:`1.5px solid ${THEME}` }} onClick={onSkip}>個人アカウントとして使用する</button>
        </div>
      </div>
    </div>
  );

  if (mode === "join") return (
    <div style={s.container}>
      <div style={s.card}>
        <button style={s.backBtn} onClick={() => setMode("select")}>← 戻る</button>
        <h2 style={s.title}>グループに参加する</h2>
        <div style={{ display:"flex", gap:8, width:"100%" }}>
          <input
            style={{ ...s.input, flex:1 }}
            placeholder="グループのメールアドレス"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <button style={{ ...s.btn, width:"auto", padding:"0 16px" }} onClick={handleSearch} disabled={searching}>
            検索
          </button>
        </div>
        {searchResults.map(group => (
          <div key={group.id} style={{ background:"#F4F6F5", borderRadius:12, padding:"12px 16px", width:"100%", display:"flex", alignItems:"center", gap:12 }}>
            {group.avatarUrl ? (
              <img src={group.avatarUrl} style={{ width:44, height:44, borderRadius:"50%", objectFit:"cover" }} />
            ) : (
              <div style={{ width:44, height:44, borderRadius:"50%", background:"#F9EAED", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>👥</div>
            )}
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>{group.displayName}</div>
              <div style={{ fontSize:11, color:"#5A7370" }}>{group.groupType}</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, width:"100%" }}>
              <input
                style={s.input}
                type="password"
                placeholder="パスワード"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button style={s.btn} onClick={() => handleJoin(group)} disabled={loading}>
                {loading ? "参加中..." : "参加する"}
              </button>
            </div>
          </div>
        ))}
        {error && <p style={s.error}>{error}</p>}
      </div>
    </div>
  );

  if (mode === "create") return (
    <div style={s.container}>
      <div style={s.card}>
        <button style={s.backBtn} onClick={() => setMode("select")}>← 戻る</button>
        <h2 style={s.title}>グループを作成する</h2>

        {/* グループ種別 */}
        <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:8 }}>
          <label style={s.label}>グループ種別</label>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {["サークル", "団体", "企業"].map(t => (
              <button
                key={t}
                style={{ padding:"8px 16px", borderRadius:999, border:`1.5px solid ${groupType === t ? THEME : "#D0DDD9"}`, background: groupType === t ? THEME : "white", color: groupType === t ? "white" : "#5A7370", fontSize:13, fontWeight:600, cursor:"pointer" }}
                onClick={() => setGroupType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* アイコン */}
        <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:8 }}>
          <label style={s.label}>アイコン</label>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {avatarPreview ? (
              <img src={avatarPreview} style={{ width:64, height:64, borderRadius:"50%", objectFit:"cover" }} />
            ) : (
              <div style={{ width:64, height:64, borderRadius:"50%", background:"#F9EAED", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>👥</div>
            )}
            <button style={{ ...s.btn, width:"auto", padding:"8px 16px" }} onClick={() => document.getElementById("groupAvatarInput").click()}>
              画像を選択
            </button>
            <input id="groupAvatarInput" type="file" accept="image/*" style={{ display:"none" }} onChange={handleAvatarChange} />
          </div>
        </div>

        <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:8 }}>
          <label style={s.label}>表示名</label>
          <input style={s.input} placeholder="例：東科大バスケ部" value={displayName} onChange={e => setDisplayName(e.target.value)} />
        </div>
        <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:8 }}>
          <label style={s.label}>メールアドレス</label>
          <input style={s.input} type="email" placeholder="グループ用メールアドレス" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:8 }}>
          <label style={s.label}>パスワード</label>
          <input style={s.input} type="password" placeholder="6文字以上" value={password} onChange={e => setPassword(e.target.value)} />
        </div>

        {error && <p style={s.error}>{error}</p>}
        <button style={s.btn} onClick={handleCreate} disabled={loading || !groupType || !displayName || !email || !password}>
          {loading ? "作成中..." : "グループを作成する"}
        </button>
      </div>
    </div>
  );
}

const s = {
  container: { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#F4F6F5", padding:"32px 16px" },
  card: { background:"white", borderRadius:16, padding:"32px 24px", width:"100%", maxWidth:480, display:"flex", flexDirection:"column", alignItems:"center", gap:16, boxShadow:"0 4px 24px rgba(0,0,0,0.08)" },
  title: { fontSize:20, fontWeight:900, color:"#111", textAlign:"center" },
  sub: { fontSize:13, color:"#5A7370", textAlign:"center", lineHeight:1.7 },
  backBtn: { background:"none", border:"none", color:"#5A7370", fontSize:14, fontWeight:700, cursor:"pointer", alignSelf:"flex-start" },
  label: { fontSize:12, fontWeight:700, color:"#5A7370" },
  input: { width:"100%", padding:"11px 13px", border:"1.5px solid #D0DDD9", borderRadius:8, fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box" },
  btn: { width:"100%", padding:14, background:THEME, color:"white", border:"none", borderRadius:8, fontSize:15, fontWeight:700, cursor:"pointer" },
  error: { color:"#E53935", fontSize:12 },
};