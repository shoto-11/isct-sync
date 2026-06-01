import {
  THEME, GENRE_TAGS, TARGET_TAGS, CAMPUS_TAGS, STYLE_TAGS,
  ORGANIZER_TAGS, BG_COLOR, GAKUIN, RECRUIT_TAGS
} from "./constants";
import { Calendar, ImageIcon, Paperclip, Plus, X, Bold, Italic,Underline as UnderlineIcon, Strikethrough, Link, Eraser, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import TiptapLink from "@tiptap/extension-link";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { HardBreak } from "@tiptap/extension-hard-break";

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

const inputSm = { ...s.input, padding: "10px 8px", fontSize: 13, height: "40px", textAlign: "center" };

const resolveYear = (mmdd) => {
  const [m, d] = mmdd.split("-").map(Number);
  const now = new Date();
  const thisYear = now.getFullYear();
  const candidate = new Date(thisYear, m - 1, d);
  return candidate < now ? thisYear + 1 : thisYear;
};

export { resolveYear };

const TEXT_COLORS = [
  { label: "デフォルト", color: "#1A2E2B", display: "#374151" },
  { label: "グレー",     color: "#5F5E5A", display: "#5F5E5A" },
  { label: "茶",         color: "#A0674A", display: "#A0674A" },
  { label: "オレンジ",   color: "#D85A30", display: "#D85A30" },
  { label: "黄",         color: "#BA7517", display: "#BA7517" },
  { label: "緑",         color: "#1D9E75", display: "#1D9E75" },
  { label: "青",         color: "#185FA5", display: "#185FA5" },
  { label: "紫",         color: "#534AB7", display: "#534AB7" },
  { label: "ピンク",     color: "#D4537E", display: "#D4537E" },
  { label: "赤",         color: "#E24B4A", display: "#E24B4A" },
];

const BG_COLORS = [
  { label: "なし",     color: "",        bg: "white",   border: "#E5E7EB" },
  { label: "グレー",   color: "#F1EFE8", bg: "#F1EFE8", border: "#D3D1C7" },
  { label: "茶",       color: "#FAECE7", bg: "#FAECE7", border: "#F5C4B3" },
  { label: "オレンジ", color: "#FAEEDA", bg: "#FAEEDA", border: "#FAC775" },
  { label: "黄",       color: "#EAF3DE", bg: "#EAF3DE", border: "#C0DD97" },
  { label: "緑",       color: "#E1F5EE", bg: "#E1F5EE", border: "#9FE1CB" },
  { label: "青",       color: "#E6F1FB", bg: "#E6F1FB", border: "#B5D4F4" },
  { label: "紫",       color: "#EEEDFE", bg: "#EEEDFE", border: "#CECBF6" },
  { label: "ピンク",   color: "#FBEAF0", bg: "#FBEAF0", border: "#F4C0D1" },
  { label: "赤",       color: "#FCEBEB", bg: "#FCEBEB", border: "#F7C1C1" },
];

const BLOCK_TYPES = [
  { label: "テキスト", fn: (e) => e.chain().focus().setParagraph().run() },
  { label: "見出し1",  fn: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: "見出し2",  fn: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "見出し3",  fn: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: "箇条書き", fn: (e) => e.chain().focus().toggleBulletList().run() },
  { label: "番号付き", fn: (e) => e.chain().focus().toggleOrderedList().run() },
];
function FloatingToolbar({ editor }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!editor) return;
    const updatePos = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) { setPos(null); return; }
      const range = sel.getRangeAt(0);
      const editorEl = editor.view.dom;
      if (!editorEl.contains(range.commonAncestorContainer)) { setPos(null); return; }
      const rect = range.getBoundingClientRect();
      const edRect = editorEl.getBoundingClientRect();
      setPos({
        top: rect.top - edRect.top - 52,
        left: Math.max(0, Math.min(rect.left - edRect.left + rect.width / 2 - 160, edRect.width - 320)),
      });
    };
    document.addEventListener("selectionchange", updatePos);
    return () => document.removeEventListener("selectionchange", updatePos);
  }, [editor]);

  if (!pos || !editor) return null;

  return (
    <div style={{ position: "absolute", top: pos.top, left: pos.left, zIndex: 200 }}>
      <TiptapToolbar editor={editor} />
    </div>
  );
}

// Tiptap BubbleMenu ツールバー
function TiptapToolbar({ editor }) {
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showBlockMenu, setShowBlockMenu] = useState(false);

  if (!editor) return null;

  const iconColor = (active) => active ? THEME : "#374151";
  const sepStyle  = { width: 1, height: 18, background: "#E5E7EB", margin: "0 2px", flexShrink: 0 };
  const btnBase   = {
    background: "none", border: "none", cursor: "pointer",
    padding: "4px 6px", borderRadius: 5,
    display: "flex", alignItems: "center", justifyContent: "center",
    height: 30, transition: "background 0.15s",
  };
  const hoverOn  = (e) => { e.currentTarget.style.background = "#F3F4F6"; };
  const hoverOff = (e) => { e.currentTarget.style.background = "none"; };

  return (
    <div
      style={{
        background: "white", border: "1px solid #E5E7EB", borderRadius: 10,
        padding: "5px 6px", display: "flex", alignItems: "center", gap: 1,
        boxShadow: "0 2px 16px rgba(0,0,0,0.12)", userSelect: "none",
      }}
      onMouseDown={e => e.preventDefault()}
    >
      {/* ブロックタイプ */}
      <div style={{ position: "relative" }}>
        <button style={{ ...btnBase, gap: 2, paddingRight: 5, color: "#374151" }}
          onClick={() => { setShowBlockMenu(v => !v); setShowColorMenu(false); }}
          onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>T</span>
          <ChevronDown size={10} />
        </button>
        {showBlockMenu && (
          <div style={{ position: "absolute", top: 36, left: 0, background: "white", border: "1px solid #E5E7EB", borderRadius: 8, padding: 4, minWidth: 120, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 300 }}>
            {BLOCK_TYPES.map(b => (
              <button key={b.label}
                onClick={() => { b.fn(editor); setShowBlockMenu(false); }}
                onMouseEnter={e => { e.currentTarget.style.background = "#F3F4F6"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                style={{ display: "block", width: "100%", background: "none", border: "none", color: "#374151", textAlign: "left", padding: "6px 10px", borderRadius: 5, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                {b.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={sepStyle} />

      {/* A ボタン（文字色＋背景色） */}
      <div style={{ position: "relative" }}>
        <button style={{ ...btnBase, flexDirection: "column", gap: 1 }}
          onClick={() => { setShowColorMenu(v => !v); setShowBlockMenu(false); }}
          onMouseEnter={hoverOn} onMouseLeave={hoverOff} title="文字色・背景色">
          <span style={{ fontWeight: 800, fontSize: 14, color: "#374151" }}>A</span>
          <div style={{ display: "flex", gap: 2 }}>
            <span style={{ width: 9, height: 3, borderRadius: 2, background: "#374151" }} />
            <span style={{ width: 9, height: 3, borderRadius: 2, background: "#E5E7EB", border: "1px solid #D1D5DB" }} />
          </div>
        </button>
        {showColorMenu && (
          <div style={{ position: "absolute", top: 38, left: 0, background: "white", border: "1px solid #E5E7EB", borderRadius: 10, padding: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", zIndex: 300, minWidth: 168 }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, marginBottom: 6 }}>テキストの色</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 26px)", gap: 4, marginBottom: 10 }}>
              {TEXT_COLORS.map(c => (
                <button key={c.color} title={c.label}
                  onClick={() => { editor.chain().focus().setColor(c.color).run(); }}
                  style={{ width: 26, height: 26, borderRadius: 6, border: "1.5px solid #E5E7EB", cursor: "pointer", background: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: c.display, fontWeight: 800, fontSize: 13 }}>A</span>
                </button>
              ))}
            </div>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, marginBottom: 6 }}>背景色</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 26px)", gap: 4 }}>
              {BG_COLORS.map(c => (
                <button key={c.label} title={c.label}
                  onClick={() => {
                    if (!c.color) editor.chain().focus().unsetHighlight().run();
                    else editor.chain().focus().setHighlight({ color: c.color }).run();
                  }}
                  style={{ width: 26, height: 26, borderRadius: 6, border: `1.5px solid ${c.border}`, cursor: "pointer", background: c.bg }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={sepStyle} />

      {/* B I U S */}
      {[
        { label: "bold",   Icon: Bold,          active: editor.isActive("bold"),          fn: () => editor.chain().focus().toggleBold().run() },
        { label: "italic", Icon: Italic,        active: editor.isActive("italic"),        fn: () => editor.chain().focus().toggleItalic().run() },
        { label: "under",  Icon: UnderlineIcon,     active: editor.isActive("underline"),     fn: () => editor.chain().focus().toggleUnderline?.()?.run?.() },
        { label: "strike", Icon: Strikethrough, active: editor.isActive("strike"),        fn: () => editor.chain().focus().toggleStrike().run() },
      ].map(({ label, Icon, active, fn }) => (
        <button key={label} style={{ ...btnBase }}
          onMouseDown={e => { e.preventDefault(); fn(); e.currentTarget.style.background = "#E5E7EB"; }}
          onMouseUp={e => { e.currentTarget.style.background = "#F3F4F6"; }}
          onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
          <Icon size={15} color={iconColor(active)} strokeWidth={active ? 2.8 : 2} />
        </button>
      ))}

      <div style={sepStyle} />

      {/* リンク */}
      <button style={{ ...btnBase }}
        onMouseDown={e => {
          e.preventDefault();
          const url = prompt("URLを入力:", "https://");
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
        onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
        <Link size={15} color="#374151" />
      </button>

      {/* 書式クリア */}
      <button style={{ ...btnBase }}
        onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetAllMarks().clearNodes().run(); }}
        onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
        <Eraser size={15} color="#9CA3AF" />
      </button>
    </div>
  );
}

export default function EventFormCore({
  preview, onImageChange, imageInputId = "imgInput",
  isEditMode = false,
  title, setTitle,
  detail, setDetail,
  location, setLocation,
  contact, setContact,
  applyLabel, setApplyLabel,
  applyLink, setApplyLink,
  hasDate, setHasDate,
  dates, setDates,
  hasDeadline, setHasDeadline,
  deadline, setDeadline,
  deadlineTime, setDeadlineTime,
  genreTag, setGenreTag,
  recruitTags, setRecruitTags,
  targetTags, setTargetTags,
  targetGakuin, setTargetGakuin,
  targetGakukei, setTargetGakukei,
  campusTags, setCampusTags,
  styleTags, setStyleTags,
  organizerTags, setOrganizerTags,
  existingAttachments, setExistingAttachments,
  attachments, setAttachments,
  attachInputId = "attachInput",
}) {
  const [showAdvancedTags, setShowAdvancedTags] = useState(false);

  const editor = useEditor({
  extensions: [
    StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false,
        hardBreak: false,
        }),
    Underline,
    TiptapLink.configure({ openOnClick: false }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    Placeholder.configure({
      placeholder: "イベントの内容、持ち物、注意事項などを記入してください",
    }),
    HardBreak.extend({
  addKeyboardShortcuts() {
    return {
      "Shift-Enter": () => this.editor.commands.setHardBreak(),
    };
  },
}),
  ],
    content: detail || "",
    onUpdate: ({ editor }) => {
        //console.log(editor.getHTML());
      setDetail(editor.getHTML());
    },
    editorProps: {
      attributes: {
        style: [
          "min-height: 160px",
          "padding: 11px 13px",
          "border: 1.5px solid #D0DDD9",
          "border-radius: 8px",
          "font-size: 14px",
          "line-height: 1.3",
          "outline: none",
          "background: white",
          "color: #1A2E2B",
          "cursor: text",
        ].join(";"),
      },
    },
  });

  // Tiptap エディタのスタイル
  useEffect(() => {
    if (document.getElementById("tiptap-styles")) return;
    const style = document.createElement("style");
    style.id = "tiptap-styles";
    style.textContent = `
  .tiptap { line-height: 0; }
  .tiptap p { margin: 0 0 0.6em 0; line-height: 1.3;}
  .tiptap br { margin: 0; padding: 0; line-height: 0.5; }
  .tiptap p:last-child { margin-bottom: 0; }
  .tiptap h1 { font-size: 1.8em; font-weight: 700; margin: 0.8em 0 0.4em; line-height: 1.3; }
  .tiptap h2 { font-size: 1.4em; font-weight: 700; margin: 0.7em 0 0.3em; line-height: 1.3; }
  .tiptap h3 { font-size: 1.2em; font-weight: 700; margin: 0.6em 0 0.3em; line-height: 1.3; }
  .tiptap ul, .tiptap ol { padding-left: 1.5em; margin: 0 0 0.7em; }
  .tiptap li { margin: 0.2em 0; }
  .tiptap a { color: #185FA5; text-decoration: underline; }
  .tiptap p > br { display: block; margin: -0.8em 0; }
  .tiptap p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    color: #BACFCB;
    pointer-events: none;
    height: 0;
  }
`;
    document.head.appendChild(style);
  }, []);

  const addDate    = () => setDates(prev => [...prev, { date: "", startTime: "", endTime: "" }]);
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
        <div style={{ position: "relative" }}>
            <FloatingToolbar editor={editor} />
            <EditorContent editor={editor} />
        </div>
        <p style={{ fontSize: 11, color: "#9AADA8", margin: "4px 0 0" }}>
            テキストを選択するとツールバーが表示されます　# 見出し　**太字**　- 箇条書き
        </p>
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
            <div style={{ background: "#FAFDFC", border: `2px solid ${THEME}`, borderRadius: 12, padding: "16px", display: "flex", flexDirection: "column", gap: 12, width: "100%", boxSizing: "border-box", boxShadow: "0 4px 12px rgba(136,32,58,0.04)" }}>
              {dates.map((d, i) => (
                <div key={i} style={{ paddingBottom: i < dates.length - 1 ? 12 : 0, borderBottom: i < dates.length - 1 ? "1px solid #E0E8E7" : "none", display: "flex", flexDirection: "column", gap: 6 }}>
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
                      <select style={inputSm} value={d.date ? parseInt(d.date.split("-")[1]) : ""}
                        onChange={e => { const m = String(e.target.value).padStart(2, "0"); const day = d.date ? d.date.split("-")[2] : "01"; const mmdd = `${m}-${day}`; updateDate(i, "date", `${resolveYear(mmdd)}-${mmdd}`); }}>
                        <option value="">月</option>
                        {Array.from({ length: 12 }, (_, j) => j + 1).map(m => <option key={m} value={m}>{m}月</option>)}
                      </select>
                    </div>
                    <div style={{ flex: "1.2", minWidth: 0 }}>
                      <select style={inputSm} value={d.date ? parseInt(d.date.split("-")[2]) : ""}
                        onChange={e => { const day = String(e.target.value).padStart(2, "0"); const m = d.date ? d.date.split("-")[1] : "01"; const mmdd = `${m}-${day}`; updateDate(i, "date", `${resolveYear(mmdd)}-${mmdd}`); }}>
                        <option value="">日</option>
                        {Array.from({ length: 31 }, (_, j) => j + 1).map(day => <option key={day} value={day}>{day}日</option>)}
                      </select>
                    </div>
                    <div style={{ width: 1, height: 24, background: "#E0E8E7", margin: "0 2px", flexShrink: 0 }} />
                    <div style={{ flex: "2", minWidth: 0 }}>
                      <input style={inputSm} type="time" value={d.startTime} onChange={e => updateDate(i, "startTime", e.target.value)} onFocus={e => e.target.showPicker()} />
                    </div>
                    <span style={{ color: "#5A7370", fontWeight: 700, fontSize: 13, flexShrink: 0, padding: "0 2px" }}>〜</span>
                    <div style={{ flex: "2", minWidth: 0 }}>
                      <input style={inputSm} type="time" value={d.endTime} onChange={e => updateDate(i, "endTime", e.target.value)} onFocus={e => e.target.showPicker()} />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addDate} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", background: "white", border: `1.5px dashed ${THEME}`, borderRadius: 8, color: THEME, fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%", marginTop: 4 }}>
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
            <div style={{ background: "#FAFDFC", border: `2px solid ${THEME}`, borderRadius: 12, padding: "16px", display: "flex", flexDirection: "column", gap: 6, width: "100%", boxSizing: "border-box", boxShadow: "0 4px 12px rgba(136,32,58,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: THEME }}>
                <Calendar size={14} strokeWidth={2.5} />
                <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.03em" }}>締切日時</span>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", width: "100%" }}>
                <div style={{ flex: "1.2", minWidth: 0 }}>
                  <select style={inputSm} value={deadline ? parseInt(deadline.split("-")[1]) : ""}
                    onChange={e => { const m = String(e.target.value).padStart(2, "0"); const day = deadline ? deadline.split("-")[2] : "01"; const mmdd = `${m}-${day}`; setDeadline(`${resolveYear(mmdd)}-${mmdd}`); }}>
                    <option value="">月</option>
                    {Array.from({ length: 12 }, (_, j) => j + 1).map(m => <option key={m} value={m}>{m}月</option>)}
                  </select>
                </div>
                <div style={{ flex: "1.2", minWidth: 0 }}>
                  <select style={inputSm} value={deadline ? parseInt(deadline.split("-")[2]) : ""}
                    onChange={e => { const day = String(e.target.value).padStart(2, "0"); const m = deadline ? deadline.split("-")[1] : "01"; const mmdd = `${m}-${day}`; setDeadline(`${resolveYear(mmdd)}-${mmdd}`); }}>
                    <option value="">日</option>
                    {Array.from({ length: 31 }, (_, j) => j + 1).map(day => <option key={day} value={day}>{day}日</option>)}
                  </select>
                </div>
                <div style={{ width: 1, height: 24, background: "#E0E8E7", margin: "0 2px", flexShrink: 0 }} />
                <div style={{ flex: "4", minWidth: 0 }}>
                  <input style={inputSm} type="time" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)} onFocus={e => e.target.showPicker()} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ① ジャンル */}
      <div style={s.section}>
        <label style={s.label}>① ジャンル <span style={s.required}>必須・複数選択可</span></label>
        <div style={s.optionGrid}>
          {GENRE_TAGS.map(t => (
            <button key={t} className={`tag-tab-btn ${genreTag.includes(t) ? "tag-active-tab" : ""}`} style={s.tagBtn}
              onClick={() => setGenreTag(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}>{t}</button>
          ))}
        </div>
      </div>

      {/* ② 〜 ⑧ 詳細タグ */}
      <div style={s.section}>
        <button type="button" onClick={() => setShowAdvancedTags(prev => !prev)}
          style={{ width: "100%", padding: "12px 16px", background: "#F4F6F5", border: "1.5px solid #D0DDD9", borderRadius: showAdvancedTags ? "10px 10px 0 0" : 10, fontSize: 13, fontWeight: 700, color: "#5A7370", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>② 詳細タグを設定する（募集種別・対象・キャンパスなど）</span>
          <span style={{ fontSize: 18, transition: "transform 0.3s", transform: showAdvancedTags ? "rotate(180deg)" : "rotate(0deg)" }}>›</span>
        </button>
        {showAdvancedTags && (
          <div style={{ border: "1.5px solid #D0DDD9", borderTop: "none", borderRadius: "0 0 10px 10px", padding: "16px", display: "flex", flexDirection: "column", gap: 16, background: "white" }}>
            {[
              { label: "② 募集種別", tags: RECRUIT_TAGS,  value: recruitTags,  setter: setRecruitTags },
              { label: "③ 対象学年", tags: TARGET_TAGS,   value: targetTags,   setter: setTargetTags  },
            ].map(({ label, tags, value, setter }) => (
              <div key={label}>
                <label style={s.label}>{label}</label>
                <div style={s.optionGrid}>
                  {tags.map(t => (
                    <button key={t} className={`tag-tab-btn ${value.includes(t) ? "tag-active-tab" : ""}`} style={s.tagBtn}
                      onClick={() => setter(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}>{t}</button>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <label style={s.label}>④ 対象学院</label>
              <div style={s.optionGrid}>
                {Object.keys(GAKUIN).map(g => (
                  <button key={g} className={`tag-tab-btn ${targetGakuin.includes(g) ? "tag-active-tab" : ""}`} style={s.tagBtn}
                    onClick={() => setTargetGakuin(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}>{g}</button>
                ))}
              </div>
            </div>
            {targetGakuin.length > 0 && (
              <div>
                <label style={s.label}>⑤ 対象学系</label>
                <div style={s.optionGrid}>
                  {targetGakuin.flatMap(g => GAKUIN[g]).map(k => (
                    <button key={k} className={`tag-tab-btn ${targetGakukei.includes(k) ? "tag-active-tab" : ""}`} style={s.tagBtn}
                      onClick={() => setTargetGakukei(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])}>{k}</button>
                  ))}
                </div>
              </div>
            )}
            {[
              { label: "⑥ キャンパス",    tags: CAMPUS_TAGS,    value: campusTags,    setter: setCampusTags    },
              { label: "⑦ 参加スタイル",  tags: STYLE_TAGS,     value: styleTags,     setter: setStyleTags     },
              { label: "⑧ 主催者種別",    tags: ORGANIZER_TAGS, value: organizerTags, setter: setOrganizerTags },
            ].map(({ label, tags, value, setter }) => (
              <div key={label}>
                <label style={s.label}>{label}</label>
                <div style={s.optionGrid}>
                  {tags.map(t => (
                    <button key={t} className={`tag-tab-btn ${value.includes(t) ? "tag-active-tab" : ""}`} style={s.tagBtn}
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
                <button style={s.removeBtn} onClick={() => setExistingAttachments(prev => prev.filter((_, j) => j !== i))}><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
        {attachments.length > 0 && (
          <div style={s.attachList}>
            {attachments.map((f, i) => (
              <div key={i} style={s.attachItem}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Paperclip size={12} />{f.name}</span>
                <button style={s.removeBtn} onClick={e => { e.stopPropagation(); setAttachments(prev => prev.filter((_, j) => j !== i)); }}><X size={14} /></button>
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