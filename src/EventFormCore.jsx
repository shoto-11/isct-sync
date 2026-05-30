import {
  THEME, GENRE_TAGS, TARGET_TAGS, CAMPUS_TAGS, STYLE_TAGS,
  ORGANIZER_TAGS, BG_COLOR, GAKUIN, RECRUIT_TAGS
} from "./constants";
import { useState } from "react";
import { Calendar, Clock, ImageIcon, Paperclip, Plus, X } from "lucide-react";

const s = {
  section: { marginBottom: 18 },
  label: { display: "block", fontSize: 12, fontWeight: 700, color: "#5A7370", letterSpacing: "0.05em", marginBottom: 6 },
  required: { background: "#E53935", color: "white", fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 3, marginLeft: 4 },
  input: {
    width: "100%", maxWidth: "100%", minWidth: "0px", boxSizing: "border-box",
    padding: "11px 13px", border: "1.5px solid #D0DDD9", borderRadius: 8,
    fontSize: 14, outline: "none", fontFamily: "inherit",
    WebkitAppearance: "none", appearance: "none"
  },
  textarea: { width: "100%", padding: "11px 13px", border: "1.5px solid #D0DDD9", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" },
  imageArea: { width: "100%", aspectRatio: "16/9", height: "auto", borderRadius: 12, overflow: "hidden", border: "2px dashed #D0DDD9", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: BG_COLOR, boxSizing: "border-box" },
  previewImg: { width: "100%", height: "100%", objectFit: "cover" },
  imagePlaceholder: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  imagePlaceholderText: { fontSize: 13, color: "#5A7370", fontWeight: 600 },
  optionGrid: { display: "flex", flexWrap: "wrap", gap: 8 },
  tagBtn: { padding: "6px 12px", borderRadius: 999, border: `1.5px solid #D0DDD9`, background: "white", fontSize: 12, fontWeight: 600, color: "#5A7370", cursor: "pointer" },
  attachArea: { width: "100%", padding: "14px", borderRadius: 8, border: "2px dashed #D0DDD9", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: BG_COLOR },
  attachList: { marginTop: 8, display: "flex", flexDirection: "column", gap: 4 },
  attachItem: { fontSize: 12, color: "#5A7370", padding: "6px 10px", background: BG_COLOR, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "space-between" },
  removeBtn: { background: "none", border: "none", color: "#BACFCB", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center" },
};

const inputSm = {
  ...s.input,
  padding: "10px 8px", fontSize: 13, height: "40px", textAlign: "center"
};

const resolveYear = (mmdd) => {
  const [m, d] = mmdd.split("-").map(Number);
  const now = new Date();
  const thisYear = now.getFullYear();
  const candidate = new Date(thisYear, m - 1, d);
  return candidate < now ? thisYear + 1 : thisYear;
};

export { resolveYear };

export default function EventFormCore({
  // 画像
  preview, onImageChange, imageInputId = "imgInput",
  isEditMode = false,

  // 基本情報
  title, setTitle,
  detail, setDetail,
  location, setLocation,
  contact, setContact,
  applyLabel, setApplyLabel,
  applyLink, setApplyLink,

  // 日時
  hasDate, setHasDate,
  dates, setDates,

  // 締切
  hasDeadline, setHasDeadline,
  deadline, setDeadline,
  deadlineTime, setDeadlineTime,

  // タグ
  genreTag, setGenreTag,
  recruitTags, setRecruitTags,
  targetTags, setTargetTags,
  targetGakuin, setTargetGakuin,
  targetGakukei, setTargetGakukei,
  campusTags, setCampusTags,
  styleTags, setStyleTags,
  organizerTags, setOrganizerTags,

  // 添付
  existingAttachments, setExistingAttachments,
  attachments, setAttachments,
  attachInputId = "attachInput",
}) {
  const [showAdvancedTags, setShowAdvancedTags] = useState(false);

  const addDate = () => setDates(prev => [...prev, { date: "", startTime: "", endTime: "" }]);
  const removeDate = (i) => setDates(prev => prev.filter((_, j) => j !== i));
  const updateDate = (i, field, value) =>
    setDates(prev => prev.map((d, j) => j === i ? { ...d, [field]: value } : d));

  return (
    <>
      {/* イベント画像 */}
      <div style={s.section}>
        <label style={s.label}>
          イベント画像
          <span style={{ fontSize: 11, color: "#9AADA8", fontWeight: 500, marginLeft: 6 }}>
            ※推奨サイズ：横16：縦9の比率（例：1920×1080px）
          </span>
        </label>
        <div style={s.imageArea} onClick={() => document.getElementById(imageInputId).click()}>
          {preview
            ? <img src={preview} alt="preview" style={s.previewImg} />
            : <div style={s.imagePlaceholder}>
                <ImageIcon size={32} color="#BACFCB" />
                <span style={s.imagePlaceholderText}>
                  {isEditMode ? "タップして画像を変更" : "タップして画像を追加"}
                </span>
              </div>
          }
          <input id={imageInputId} type="file" accept="image/*" style={{ display: "none" }} onChange={onImageChange} />
        </div>
      </div>

      {/* イベント名 */}
      <div style={s.section}>
        <label style={s.label}>イベント名 <span style={s.required}>必須</span></label>
        <input style={s.input} placeholder="例：春フットサル大会" value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      {/* イベント詳細 */}
      <div style={s.section}>
        <label style={s.label}>イベント詳細 <span style={s.required}>必須</span></label>
        <textarea style={s.textarea} placeholder="イベントの内容、持ち物、注意事項などを記入してください" value={detail} onChange={e => setDetail(e.target.value)} rows={4} />
      </div>

      {/* 開催日時 */}
      <div style={s.section}>
        <label style={s.label}>開催日時</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", boxSizing: "border-box" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className={`tag-tab-btn ${hasDate ? "tag-active-tab" : ""}`}
              style={{ ...s.tagBtn, padding: "10px 16px", borderRadius: 8, flex: 1 }}
              onClick={() => setHasDate(true)}>日時指定</button>
            <button type="button" className={`tag-tab-btn ${!hasDate ? "tag-active-tab" : ""}`}
              style={{ ...s.tagBtn, padding: "10px 16px", borderRadius: 8, flex: 1 }}
              onClick={() => { setHasDate(false); setDates([{ date: "", startTime: "", endTime: "" }]); }}>通年募集</button>
          </div>

          {hasDate && (
            <div style={{
              background: "#FAFDFC", border: `2px solid ${THEME}`, borderRadius: 12,
              padding: "16px", display: "flex", flexDirection: "column", gap: 12,
              width: "100%", boxSizing: "border-box", boxShadow: "0 4px 12px rgba(136,32,58,0.04)"
            }}>
              {dates.map((d, i) => (
                <div key={i} style={{
                  paddingBottom: i < dates.length - 1 ? 12 : 0,
                  borderBottom: i < dates.length - 1 ? "1px solid #E0E8E7" : "none",
                  display: "flex", flexDirection: "column", gap: 6
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: THEME }}>
                      <Calendar size={14} strokeWidth={2.5} />
                      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.03em" }}>
                        {dates.length > 1 ? `日程 #${i + 1}` : "開催日"}
                      </span>
                    </div>
                    {dates.length > 1 && (
                      <button type="button" onClick={() => removeDate(i)}
                        style={{ background: "none", border: "none", color: "#BACFCB", cursor: "pointer", padding: "4px" }}>
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", width: "100%" }}>
                    <div style={{ flex: "1.2", minWidth: 0 }}>
                      <select style={inputSm}
                        value={d.date ? parseInt(d.date.split("-")[1]) : ""}
                        onChange={e => {
                          const m = String(e.target.value).padStart(2, "0");
                          const day = d.date ? d.date.split("-")[2] : "01";
                          const mmdd = `${m}-${day}`;
                          updateDate(i, "date", `${resolveYear(mmdd)}-${mmdd}`);
                        }}
                      >
                        <option value="">月</option>
                        {Array.from({ length: 12 }, (_, j) => j + 1).map(m => (
                          <option key={m} value={m}>{m}月</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: "1.2", minWidth: 0 }}>
                      <select style={inputSm}
                        value={d.date ? parseInt(d.date.split("-")[2]) : ""}
                        onChange={e => {
                          const day = String(e.target.value).padStart(2, "0");
                          const m = d.date ? d.date.split("-")[1] : "01";
                          const mmdd = `${m}-${day}`;
                          updateDate(i, "date", `${resolveYear(mmdd)}-${mmdd}`);
                        }}
                      >
                        <option value="">日</option>
                        {Array.from({ length: 31 }, (_, j) => j + 1).map(day => (
                          <option key={day} value={day}>{day}日</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ width: 1, height: 24, background: "#E0E8E7", margin: "0 2px", flexShrink: 0 }} />
                    <div style={{ flex: "2", minWidth: 0 }}>
                      <input style={inputSm} type="time" value={d.startTime}
                        onChange={e => updateDate(i, "startTime", e.target.value)}
                        onFocus={e => e.target.showPicker()} />
                    </div>
                    <span style={{ color: "#5A7370", fontWeight: 700, fontSize: 13, flexShrink: 0, padding: "0 2px" }}>〜</span>
                    <div style={{ flex: "2", minWidth: 0 }}>
                      <input style={inputSm} type="time" value={d.endTime}
                        onChange={e => updateDate(i, "endTime", e.target.value)}
                        onFocus={e => e.target.showPicker()} />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addDate} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "10px", background: "white", border: `1.5px dashed ${THEME}`,
                borderRadius: 8, color: THEME, fontSize: 13, fontWeight: 700, cursor: "pointer",
                width: "100%", marginTop: 4
              }}>
                <Plus size={15} /> 日程を追加する
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 実施場所 */}
      <div style={s.section}>
        <label style={s.label}>実施場所・集合場所</label>
        <input style={s.input} placeholder="例：大岡山グラウンド" value={location} onChange={e => setLocation(e.target.value)} />
      </div>

      {/* 申し込み締切 */}
      <div style={s.section}>
        <label style={s.label}>申し込み締切</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", boxSizing: "border-box" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className={`tag-tab-btn ${hasDeadline ? "tag-active-tab" : ""}`}
              style={{ ...s.tagBtn, padding: "10px 16px", borderRadius: 8, flex: 1 }}
              onClick={() => setHasDeadline(true)}>期限あり</button>
            <button type="button" className={`tag-tab-btn ${!hasDeadline ? "tag-active-tab" : ""}`}
              style={{ ...s.tagBtn, padding: "10px 14px", borderRadius: 8, flex: 1 }}
              onClick={() => { setHasDeadline(false); setDeadline(""); setDeadlineTime(""); }}>無期限</button>
          </div>

          {hasDeadline && (
            <div style={{
              background: "#FAFDFC", border: `2px solid ${THEME}`, borderRadius: 12,
              padding: "16px", display: "flex", flexDirection: "column", gap: 6,
              width: "100%", boxSizing: "border-box", boxShadow: "0 4px 12px rgba(136,32,58,0.04)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: THEME }}>
                <Calendar size={14} strokeWidth={2.5} />
                <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.03em" }}>締切日時</span>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", width: "100%" }}>
                <div style={{ flex: "1.2", minWidth: 0 }}>
                  <select style={inputSm}
                    value={deadline ? parseInt(deadline.split("-")[1]) : ""}
                    onChange={e => {
                      const m = String(e.target.value).padStart(2, "0");
                      const day = deadline ? deadline.split("-")[2] : "01";
                      const mmdd = `${m}-${day}`;
                      setDeadline(`${resolveYear(mmdd)}-${mmdd}`);
                    }}
                  >
                    <option value="">月</option>
                    {Array.from({ length: 12 }, (_, j) => j + 1).map(m => (
                      <option key={m} value={m}>{m}月</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: "1.2", minWidth: 0 }}>
                  <select style={inputSm}
                    value={deadline ? parseInt(deadline.split("-")[2]) : ""}
                    onChange={e => {
                      const day = String(e.target.value).padStart(2, "0");
                      const m = deadline ? deadline.split("-")[1] : "01";
                      const mmdd = `${m}-${day}`;
                      setDeadline(`${resolveYear(mmdd)}-${mmdd}`);
                    }}
                  >
                    <option value="">日</option>
                    {Array.from({ length: 31 }, (_, j) => j + 1).map(day => (
                      <option key={day} value={day}>{day}日</option>
                    ))}
                  </select>
                </div>
                <div style={{ width: 1, height: 24, background: "#E0E8E7", margin: "0 2px", flexShrink: 0 }} />
                <div style={{ flex: "4", minWidth: 0 }}>
                  <input style={inputSm} type="time" value={deadlineTime}
                    onChange={e => setDeadlineTime(e.target.value)}
                    onFocus={e => e.target.showPicker()} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ① ジャンル */}
      <div style={s.section}>
        <label style={s.label}>① ジャンル <span style={s.required}>必須</span></label>
        <div style={s.optionGrid}>
          {GENRE_TAGS.map(t => (
            <button key={t}
              className={`tag-tab-btn ${genreTag === t ? "tag-active-tab" : ""}`}
              style={s.tagBtn}
              onClick={() => setGenreTag(t)}>{t}</button>
          ))}
        </div>
      </div>

      {/* ② 〜 ⑧ 詳細タグ（折りたたみ） */}
      <div style={s.section}>
        <button type="button" onClick={() => setShowAdvancedTags(prev => !prev)}
          style={{
            width: "100%", padding: "12px 16px", background: "#F4F6F5",
            border: "1.5px solid #D0DDD9",
            borderRadius: showAdvancedTags ? "10px 10px 0 0" : 10,
            fontSize: 13, fontWeight: 700, color: "#5A7370", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <span>② 詳細タグを設定する（募集種別・対象・キャンパスなど）</span>
          <span style={{ fontSize: 18, transition: "transform 0.3s", transform: showAdvancedTags ? "rotate(180deg)" : "rotate(0deg)" }}>›</span>
        </button>

        {showAdvancedTags && (
          <div style={{
            border: "1.5px solid #D0DDD9", borderTop: "none",
            borderRadius: "0 0 10px 10px", padding: "16px",
            display: "flex", flexDirection: "column", gap: 16, background: "white",
          }}>
            {[
              { label: "② 募集種別", tags: RECRUIT_TAGS, value: recruitTags, setter: setRecruitTags },
              { label: "③ 対象学年", tags: TARGET_TAGS, value: targetTags, setter: setTargetTags },
            ].map(({ label, tags, value, setter }) => (
              <div key={label}>
                <label style={s.label}>{label}</label>
                <div style={s.optionGrid}>
                  {tags.map(t => (
                    <button key={t}
                      className={`tag-tab-btn ${value.includes(t) ? "tag-active-tab" : ""}`}
                      style={s.tagBtn}
                      onClick={() => setter(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}>{t}</button>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <label style={s.label}>④ 対象学院</label>
              <div style={s.optionGrid}>
                {Object.keys(GAKUIN).map(g => (
                  <button key={g}
                    className={`tag-tab-btn ${targetGakuin.includes(g) ? "tag-active-tab" : ""}`}
                    style={s.tagBtn}
                    onClick={() => setTargetGakuin(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}>{g}</button>
                ))}
              </div>
            </div>

            {targetGakuin.length > 0 && (
              <div>
                <label style={s.label}>⑤ 対象学系</label>
                <div style={s.optionGrid}>
                  {targetGakuin.flatMap(g => GAKUIN[g]).map(k => (
                    <button key={k}
                      className={`tag-tab-btn ${targetGakukei.includes(k) ? "tag-active-tab" : ""}`}
                      style={s.tagBtn}
                      onClick={() => setTargetGakukei(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])}>{k}</button>
                  ))}
                </div>
              </div>
            )}

            {[
              { label: "⑥ キャンパス", tags: CAMPUS_TAGS, value: campusTags, setter: setCampusTags },
              { label: "⑦ 参加スタイル", tags: STYLE_TAGS, value: styleTags, setter: setStyleTags },
              { label: "⑧ 主催者種別", tags: ORGANIZER_TAGS, value: organizerTags, setter: setOrganizerTags },
            ].map(({ label, tags, value, setter }) => (
              <div key={label}>
                <label style={s.label}>{label}</label>
                <div style={s.optionGrid}>
                  {tags.map(t => (
                    <button key={t}
                      className={`tag-tab-btn ${value.includes(t) ? "tag-active-tab" : ""}`}
                      style={s.tagBtn}
                      onClick={() => setter(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}>{t}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 添付画像・資料 */}
      <div style={s.section}>
        <label style={s.label}>添付画像・資料</label>
        <div style={s.attachArea} onClick={() => document.getElementById(attachInputId).click()}>
          <Paperclip size={18} color="#5A7370" />
          <span style={s.imagePlaceholderText}>
            {attachments.length > 0 ? `${attachments.length}件選択済み` : "ファイルを追加"}
          </span>
          <input id={attachInputId} type="file" multiple style={{ display: "none" }}
            onChange={e => setAttachments(prev => [...prev, ...Array.from(e.target.files)])} />
        </div>

        {existingAttachments.length > 0 && (
          <div style={s.attachList}>
            {existingAttachments.map((a, i) => (
              <div key={i} style={s.attachItem}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Paperclip size={12} />{a.name}</span>
                <button style={s.removeBtn}
                  onClick={() => setExistingAttachments(prev => prev.filter((_, j) => j !== i))}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {attachments.length > 0 && (
          <div style={s.attachList}>
            {attachments.map((f, i) => (
              <div key={i} style={s.attachItem}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Paperclip size={12} />{f.name}</span>
                <button style={s.removeBtn}
                  onClick={e => { e.stopPropagation(); setAttachments(prev => prev.filter((_, j) => j !== i)); }}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 募集ボタン名・リンク */}
      <div style={s.section}>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={s.label}>募集ボタン名</label>
            <input style={s.input} placeholder="参加はこちら" value={applyLabel} onChange={e => setApplyLabel(e.target.value)} />
          </div>
          <div style={{ flex: 2 }}>
            <label style={s.label}>募集リンク</label>
            <input style={s.input} type="url" placeholder="https://forms.gle/..." value={applyLink} onChange={e => setApplyLink(e.target.value)} />
          </div>
        </div>
      </div>

      {/* お問い合わせ先 */}
      <div style={s.section}>
        <label style={s.label}>お問い合わせ先</label>
        <input style={s.input} placeholder="例：example@m.isct.ac.jp / @Twitter" value={contact} onChange={e => setContact(e.target.value)} />
      </div>
    </>
  );
}