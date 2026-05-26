import { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { User, Users, ImageIcon,Paperclip, X } from "lucide-react";
import { THEME, GENRE_TAGS, TARGET_TAGS, CAMPUS_TAGS, STYLE_TAGS, ORGANIZER_TAGS, RECRUIT_TAGS, GAKUIN } from "../constants";
import "../animations.css";
import heic2any from "heic2any";

export default function AdminProxyPost({ user }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [proxyOrganizerId, setProxyOrganizerId] = useState("");
  const [proxyIsGroup, setProxyIsGroup] = useState(false);
  const [proxyOrgSearch, setProxyOrgSearch] = useState("");
  const [proxyTitle, setProxyTitle] = useState("");
  const [proxyDetail, setProxyDetail] = useState("");
  const [proxyDate, setProxyDate] = useState("");
  const [proxyStartTime, setProxyStartTime] = useState("");
  const [proxyEndTime, setProxyEndTime] = useState("");
  const [proxyLocation, setProxyLocation] = useState("");
  const [proxyDeadline, setProxyDeadline] = useState("");
  const [proxyDeadlineTime, setProxyDeadlineTime] = useState("");
  const [proxyGenre, setProxyGenre] = useState("");
  const [proxyTargets, setProxyTargets] = useState([]);
  const [proxyTargetGakuin, setProxyTargetGakuin] = useState([]);
  const [proxyTargetGakukei, setProxyTargetGakukei] = useState([]);
  const [proxyCampus, setProxyCampus] = useState("");
  const [proxyStyle, setProxyStyle] = useState("");
  const [proxyOrganizerTag, setProxyOrganizerTag] = useState("");
  const [proxyRecruitTag, setProxyRecruitTag] = useState("");
  const [proxyApplyLabel, setProxyApplyLabel] = useState("");
  const [proxyApplyLink, setProxyApplyLink] = useState("");
  const [proxyContact, setProxyContact] = useState("");
  const [proxyPreview, setProxyPreview] = useState(null);
  const [proxyImageFile, setProxyImageFile] = useState(null);
  const [proxyAttachments, setProxyAttachments] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const [usersSnap, groupsSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "groups")),
      ]);
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setGroups(groupsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSubmit = async () => {
    if (!proxyOrganizerId) { alert("主催者を先に選択してください。"); return; }
    if (!proxyTitle.trim() || !proxyDetail.trim() || !proxyDate || !proxyLocation.trim() || !proxyDeadline || !proxyGenre || !proxyTargets.length || !proxyCampus) {
      alert("必須項目を全て入力・選択してください。"); return;
    }
    setSaving(true);
    try {
      const targetGroup = proxyIsGroup ? groups.find(g => g.id === proxyOrganizerId) : null;
      const targetUser = !proxyIsGroup ? users.find(u => u.id === proxyOrganizerId) : null;
      const finalOrganizerName = proxyIsGroup ? (targetGroup?.displayName || "グループ") : (targetUser?.displayName || "個人ユーザー");
      const finalOrganizerAvatar = proxyIsGroup ? (targetGroup?.avatarUrl || "") : (targetUser?.avatarUrl || "");

      let imageUrl = null;
      if (proxyImageFile) {
        const storageRef = ref(storage, `events/${Date.now()}_proxy_${proxyImageFile.name}`);
        await uploadBytes(storageRef, proxyImageFile);
        imageUrl = await getDownloadURL(storageRef);
      }
      const attachmentUrls = [];
      for (const file of proxyAttachments) {
        const storageRef = ref(storage, `attachments/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        attachmentUrls.push({ name: file.name, url });
      }

      await addDoc(collection(db, "events"), {
        title: proxyTitle.trim(), detail: proxyDetail.trim(),
        date: proxyDate, startTime: proxyStartTime, endTime: proxyEndTime,
        location: proxyLocation.trim(), deadline: proxyDeadline, deadlineTime: proxyDeadlineTime,
        tags: { genre: proxyGenre, targets: proxyTargets, campus: proxyCampus, style: proxyStyle, organizer: proxyOrganizerTag, recruit: proxyRecruitTag },
        imageUrl, 
        applyLabel: proxyApplyLabel || "参加を申し込む", applyLink: proxyApplyLink,
        participants: [],
        organizerType: proxyIsGroup ? "group" : "user",
        organizerId: proxyOrganizerId, createdBy: proxyOrganizerId,
        createdByPersonal: user?.uid,
        createdAt: serverTimestamp(),
        organizerName: finalOrganizerName, organizerAvatar: finalOrganizerAvatar,
        isGroup: proxyIsGroup, contact: proxyContact,
        targetGakuin: proxyTargetGakuin, targetGakukei: proxyTargetGakukei,
        attachments: attachmentUrls,
      });

      // リセット
      setProxyOrganizerId(""); setProxyIsGroup(false); setProxyOrgSearch("");
      setProxyTitle(""); setProxyDetail(""); setProxyDate("");
      setProxyStartTime(""); setProxyEndTime(""); setProxyLocation("");
      setProxyDeadline(""); setProxyDeadlineTime(""); setProxyGenre("");
      setProxyTargets([]); setProxyTargetGakuin([]); setProxyTargetGakukei([]);
      setProxyCampus(""); setProxyStyle(""); setProxyOrganizerTag(""); setProxyRecruitTag("");
      setProxyApplyLabel(""); setProxyApplyLink(""); setProxyContact("");
      setProxyPreview(null); setProxyImageFile(null);
      setProxyAttachments([]); 

      alert(`「${finalOrganizerName}」名義での代打投稿が完了しました！`);
      navigate("/admin/events");
    } catch (err) {
      alert("代打投稿に失敗しました: " + err.message);
    } finally { setSaving(false); }
  };

  if (loading) return <p style={{ padding: 24 }}>読み込み中...</p>;

  const filteredUsers = users.filter(u => { const q = proxyOrgSearch.toLowerCase(); return !q || u.displayName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q); });
  const filteredGroups = groups.filter(g => { const q = proxyOrgSearch.toLowerCase(); return !q || g.displayName?.toLowerCase().includes(q) || g.email?.toLowerCase().includes(q); });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, background: "white", padding: 20, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>イベント代打投稿 (管理者専用)</h2>
      <p style={{ fontSize: 12, color: "#5A7370", margin: 0 }}>特定のユーザーやサークルに代わってイベントを代理公開します。</p>

      {/* 主催者選択 */}
      <div style={s.fieldRow}>
        <label style={s.formLabel}>主催者を選択 <span style={s.required}>必須</span></label>
        <input style={{ ...s.input, marginBottom: 8 }} placeholder="個人名・サークル名・メールで検索..." value={proxyOrgSearch} onChange={e => setProxyOrgSearch(e.target.value)} />
        <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid #D0DDD9", borderRadius: 8, padding: 8, background: "#FAFDFC" }}>
          <div style={s.cardGrid}>
            {filteredUsers.map(u => (
              <div key={u.id} className={`organizer-card ${!proxyIsGroup && proxyOrganizerId === u.id ? "organizer-selected" : ""}`} style={s.organizerCard} onClick={() => { setProxyOrganizerId(u.id); setProxyIsGroup(false); }}>
                <div style={s.cardAvatarWrap}>{u.avatarUrl ? <img src={u.avatarUrl} style={s.cardAvatar} alt="" /> : <User size={14} color="#9AADA8" />}</div>
                <div style={s.cardInfo}><div style={s.cardName}>{u.displayName || "名前なし"}</div><div style={{ fontSize: 9, color: "#8A9F9B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div></div>
              </div>
            ))}
            {filteredGroups.map(g => (
              <div key={g.id} className={`organizer-card ${proxyIsGroup && proxyOrganizerId === g.id ? "organizer-selected" : ""}`} style={s.organizerCard} onClick={() => { setProxyOrganizerId(g.id); setProxyIsGroup(true); }}>
                <div style={s.cardAvatarWrap}>{g.avatarUrl ? <img src={g.avatarUrl} style={s.cardAvatar} alt="" /> : <Users size={14} color="#9AADA8" />}</div>
                <div style={s.cardInfo}><div style={s.cardName}>{g.displayName || "名前なし"}</div><div style={{ fontSize: 9, color: "#8A9F9B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.email}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 画像 */}
      <div style={s.fieldRow}>
        <label style={s.formLabel}>イベント画像（任意）</label>
        <div style={{ ...s.imageArea, height: 160 }} onClick={() => document.getElementById("proxyEventFile").click()}>
          {proxyPreview ? <img src={proxyPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ textAlign: "center", color: "#BACFCB" }}><ImageIcon size={32} /><div style={{ fontSize: 12, marginTop: 4, fontWeight: 600 }}>タップして画像を追加</div></div>}
        </div>
        <input id="proxyEventFile" type="file" accept="image/*,image/heic,image/heif" style={{ display: "none" }} onChange={async e => {
            let f = e.target.files[0];
            if (!f) return;
            if (f.type === "image/heic" || f.type === "image/heif" || f.name.toLowerCase().endsWith(".heic") || f.name.toLowerCase().endsWith(".heif")) {
              try {
                const converted = await heic2any({ blob: f, toType: "image/jpeg", quality: 0.85 });
                f = new File([converted], f.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg"), { type: "image/jpeg" });
              } catch (err) {
                alert("画像の変換に失敗しました。別の形式でお試しください。");
                return;
              }
            }
            setProxyImageFile(f);
            setProxyPreview(URL.createObjectURL(f));
          }} />
      </div>

      <div style={s.fieldRow}><label style={s.formLabel}>イベント名 <span style={s.required}>必須</span></label><input style={s.input} value={proxyTitle} onChange={e => setProxyTitle(e.target.value)} /></div>
      <div style={s.fieldRow}><label style={s.formLabel}>イベント詳細 <span style={s.required}>必須</span></label><textarea style={{ ...s.input, minHeight: 100, resize: "vertical", lineHeight: 1.6 }} value={proxyDetail} onChange={e => setProxyDetail(e.target.value)} rows={4} /></div>

      <div style={s.fieldRow}>
        <label style={s.formLabel}>イベント日時 <span style={s.required}>必須</span></label>
        <input style={s.input} type="date" value={proxyDate} onChange={e => setProxyDate(e.target.value)} onFocus={e => e.target.showPicker()} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: "#5A7370", fontWeight: 700 }}>開始時刻（任意）</label><input style={s.input} type="time" value={proxyStartTime} onChange={e => setProxyStartTime(e.target.value)} onFocus={e => e.target.showPicker()} /></div>
          <div style={{ paddingTop: 20, color: "#5A7370" }}>〜</div>
          <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: "#5A7370", fontWeight: 700 }}>終了時刻（任意）</label><input style={s.input} type="time" value={proxyEndTime} onChange={e => setProxyEndTime(e.target.value)} onFocus={e => e.target.showPicker()} /></div>
        </div>
      </div>

      <div style={s.fieldRow}><label style={s.formLabel}>場所 <span style={s.required}>必須</span></label><input style={s.input} value={proxyLocation} onChange={e => setProxyLocation(e.target.value)} /></div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={s.fieldRow}><label style={s.formLabel}>申し込み締切日 <span style={s.required}>必須</span></label><input style={s.input} type="date" value={proxyDeadline} onChange={e => setProxyDeadline(e.target.value)} onFocus={e => e.target.showPicker()} /></div>
        <div style={s.fieldRow}><label style={s.formLabel}>締め切り時間（任意）</label><input style={s.input} type="time" value={proxyDeadlineTime} onChange={e => setProxyDeadlineTime(e.target.value)} onFocus={e => e.target.showPicker()} /></div>
      </div>
{[
        { label: "① ジャンル", tags: GENRE_TAGS, value: proxyGenre, setValue: setProxyGenre, multi: false, required: true },
        { label: "② 募集種別", tags: RECRUIT_TAGS, value: proxyRecruitTag, setValue: setProxyRecruitTag, multi: false },
        { label: "③ 対象学年", tags: TARGET_TAGS, value: proxyTargets, setValue: setProxyTargets, multi: true, required: true },
      ].map(({ label, tags, value, setValue, multi, required }) => (
        <div key={label} style={s.fieldRow}>
          <label style={s.formLabel}>{label} {required && <span style={s.required}>必須</span>}</label>
          <div style={s.optionGrid}>
            {tags.map(t => (
              <button key={t} type="button"
                className={`tag-tab-btn ${multi ? (value.includes(t) ? "tag-active-tab" : "") : (value === t ? "tag-active-tab" : "")}`}
                style={s.tagBtn}
                onClick={() => multi ? setValue(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]) : setValue(prev => prev === t ? "" : t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* ④ 対象学院（任意・複数選択可） */}
      <div style={s.fieldRow}>
        <label style={s.formLabel}>④ 対象学院（任意・複数選択可）</label>
        <div style={s.optionGrid}>
          {Object.keys(GAKUIN).map(g => (
            <button key={g} type="button" className={`tag-tab-btn ${proxyTargetGakuin.includes(g) ? "tag-active-tab" : ""}`} style={s.tagBtn}
              onClick={() => setProxyTargetGakuin(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}>{g}</button>
          ))}
        </div>
      </div>

      {/* ⑤ 対象学系（任意）※ ④が選択された時だけ連動してここに差し込まれます */}
      {proxyTargetGakuin.length > 0 && (
        <div style={s.fieldRow}>
          <label style={s.formLabel}>⑤ 対象学系（任意・複数選択可）</label>
          <div style={s.optionGrid}>
            {proxyTargetGakuin.flatMap(g => GAKUIN[g]).map(k => (
              <button key={k} type="button" className={`tag-tab-btn ${proxyTargetGakukei.includes(k) ? "tag-active-tab" : ""}`} style={s.tagBtn}
                onClick={() => setProxyTargetGakukei(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])}>{k}</button>
            ))}
          </div>
        </div>
      )}

      {/* ⑥ キャンパス、⑦ 参加スタイル、⑧ 主催者種別 の並び替え */}
      {[
        { label: "⑥ キャンパス", tags: CAMPUS_TAGS, value: proxyCampus, setValue: setProxyCampus, multi: false, required: true },
        { label: "⑦ 参加スタイル", tags: STYLE_TAGS, value: proxyStyle, setValue: setProxyStyle, multi: false },
        { label: "⑧ 主催者種別", tags: ORGANIZER_TAGS, value: proxyOrganizerTag, setValue: setProxyOrganizerTag, multi: false },
      ].map(({ label, tags, value, setValue, multi, required }) => (
        <div key={label} style={s.fieldRow}>
          <label style={s.formLabel}>{label} {required && <span style={s.required}>必須</span>}</label>
          <div style={s.optionGrid}>
            {tags.map(t => (
              <button key={t} type="button"
                className={`tag-tab-btn ${multi ? (value.includes(t) ? "tag-active-tab" : "") : (value === t ? "tag-active-tab" : "")}`}
                style={s.tagBtn}
                onClick={() => multi ? setValue(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]) : setValue(prev => prev === t ? "" : t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div style={s.fieldRow}>
  <label style={s.formLabel}>添付画像・資料（任意）</label>
  <div style={{ padding: "12px", borderRadius: 8, border: "2px dashed #D0DDD9", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#FAFDFC" }}
    onClick={() => document.getElementById("proxyAttachInput").click()}>
    <Paperclip size={16} color="#5A7370" />
    <span style={{ fontSize: 12, color: "#5A7370", fontWeight: 600 }}>
      {proxyAttachments.length > 0 ? `${proxyAttachments.length}件追加済み` : "ファイルを追加"}
    </span>
    <input id="proxyAttachInput" type="file" multiple style={{ display: "none" }}
      onChange={e => setProxyAttachments(prev => [...prev, ...Array.from(e.target.files)])} />
  </div>
  {proxyAttachments.length > 0 && (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
      {proxyAttachments.map((f, i) => (
        <div key={i} style={{ fontSize: 12, color: "#5A7370", padding: "6px 10px", background: "#F4F6F5", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Paperclip size={12} />{f.name}</span>
          <button style={{ background: "none", border: "none", color: "#BACFCB", cursor: "pointer", display: "flex", alignItems: "center" }}
            onClick={() => setProxyAttachments(prev => prev.filter((_, j) => j !== i))}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )}
</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={s.fieldRow}><label style={s.formLabel}>申し込みボタン名</label><input style={s.input} placeholder="参加を申し込む" value={proxyApplyLabel} onChange={e => setProxyApplyLabel(e.target.value)} /></div>
        <div style={s.fieldRow}><label style={s.formLabel}>申し込みリンクURL</label><input style={s.input} type="url" placeholder="https://forms.gle/..." value={proxyApplyLink} onChange={e => setProxyApplyLink(e.target.value)} /></div>
      </div>
      <div style={s.fieldRow}><label style={s.formLabel}>お問い合わせ連絡先</label><input style={s.input} placeholder="例：example@m.isct.ac.jp" value={proxyContact} onChange={e => setProxyContact(e.target.value)} /></div>

      <button className="submit-btn" style={{ padding: 14, border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 12 }} onClick={handleSubmit} disabled={saving}>
        {saving ? "代打投稿中..." : "この内容で代打投稿を完了する"}
      </button>
    </div>
  );
}

const s = {
  input: { padding: "10px 14px", border: "1.5px solid #D0DDD9", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" },
  formLabel: { fontSize: 12, fontWeight: 700, color: "#5A7370", marginTop: 2 },
  fieldRow: { display: "flex", flexDirection: "column", gap: 4 },
  required: { background: "#E53935", color: "white", fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 3, marginLeft: 4 },
  imageArea: { width: "100%", height: 130, borderRadius: 10, border: "2px dashed #D0DDD9", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFDFC", overflow: "hidden" },
  optionGrid: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 },
  tagBtn: { padding: "5px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: "pointer" },
  cardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 6 },
  organizerCard: { display: "flex", alignItems: "center", gap: 6, padding: "6px", borderRadius: 6, cursor: "pointer" },
  cardAvatarWrap: { width: 24, height: 24, borderRadius: "50%", background: "#E0E8E7", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 },
  cardAvatar: { width: "100%", height: "100%", objectFit: "cover" },
  cardInfo: { minWidth: 0, flex: 1 },
  cardName: { fontSize: 11, fontWeight: 700, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" },
};
