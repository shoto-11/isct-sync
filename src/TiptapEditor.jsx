import { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import TiptapLink from "@tiptap/extension-link";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { HardBreak } from "@tiptap/extension-hard-break";
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, Link, Eraser, ChevronDown } from "lucide-react";
import { THEME } from "./constants";

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

function TiptapToolbar({ editor }) {
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  if (!editor) return null;

  const iconColor = (active) => active ? THEME : "#374151";
  const sepStyle  = { width: 1, height: 18, background: "#E5E7EB", margin: "0 2px", flexShrink: 0 };
  const btnBase   = { background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", height: 30, transition: "background 0.15s" };
  const hoverOn   = (e) => { e.currentTarget.style.background = "#F3F4F6"; };
  const hoverOff  = (e) => { e.currentTarget.style.background = "none"; };

  return (
    <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 10, padding: "5px 6px", display: "flex", alignItems: "center", gap: 1, boxShadow: "0 2px 16px rgba(0,0,0,0.12)", userSelect: "none" }}
      onMouseDown={e => e.preventDefault()}>
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
              <button key={b.label} onClick={() => { b.fn(editor); setShowBlockMenu(false); }}
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
                <button key={c.color} title={c.label} onClick={() => { editor.chain().focus().setColor(c.color).run(); }}
                  style={{ width: 26, height: 26, borderRadius: 6, border: "1.5px solid #E5E7EB", cursor: "pointer", background: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: c.display, fontWeight: 800, fontSize: 13 }}>A</span>
                </button>
              ))}
            </div>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, marginBottom: 6 }}>背景色</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 26px)", gap: 4 }}>
              {BG_COLORS.map(c => (
                <button key={c.label} title={c.label}
                  onClick={() => { if (!c.color) editor.chain().focus().unsetHighlight().run(); else editor.chain().focus().setHighlight({ color: c.color }).run(); }}
                  style={{ width: 26, height: 26, borderRadius: 6, border: `1.5px solid ${c.border}`, cursor: "pointer", background: c.bg }} />
              ))}
            </div>
          </div>
        )}
      </div>
      <div style={sepStyle} />
      {[
        { label: "bold",   Icon: Bold,          active: editor.isActive("bold"),      fn: () => editor.chain().focus().toggleBold().run() },
        { label: "italic", Icon: Italic,        active: editor.isActive("italic"),    fn: () => editor.chain().focus().toggleItalic().run() },
        { label: "under",  Icon: UnderlineIcon, active: editor.isActive("underline"), fn: () => editor.chain().focus().toggleUnderline().run() },
        { label: "strike", Icon: Strikethrough, active: editor.isActive("strike"),    fn: () => editor.chain().focus().toggleStrike().run() },
      ].map(({ label, Icon, active, fn }) => (
        <button key={label} style={{ ...btnBase }}
          onMouseDown={e => { e.preventDefault(); fn(); e.currentTarget.style.background = "#E5E7EB"; }}
          onMouseUp={e => { e.currentTarget.style.background = "#F3F4F6"; }}
          onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
          <Icon size={15} color={iconColor(active)} strokeWidth={active ? 2.8 : 2} />
        </button>
      ))}
      <div style={sepStyle} />
      <button style={{ ...btnBase }}
        onMouseDown={e => { e.preventDefault(); const url = prompt("URLを入力:", "https://"); if (url) editor.chain().focus().setLink({ href: url }).run(); }}
        onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
        <Link size={15} color="#374151" />
      </button>
      <button style={{ ...btnBase }}
        onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetAllMarks().clearNodes().run(); }}
        onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
        <Eraser size={15} color="#9CA3AF" />
      </button>
    </div>
  );
}

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

// スタイル注入（1回だけ）
function injectTiptapStyles() {
  if (document.getElementById("tiptap-styles")) return;
  const style = document.createElement("style");
  style.id = "tiptap-styles";
  style.textContent = `
    .tiptap { line-height: 1.3; }
    .tiptap p { margin: 0 0 0.6em 0; line-height: 1.3; }
    .tiptap p:last-child { margin-bottom: 0; }
    .tiptap h1 { font-size: 1.8em; font-weight: 700; margin: 0.8em 0 0.4em; line-height: 1.3; }
    .tiptap h2 { font-size: 1.4em; font-weight: 700; margin: 0.7em 0 0.3em; line-height: 1.3; }
    .tiptap h3 { font-size: 1.2em; font-weight: 700; margin: 0.6em 0 0.3em; line-height: 1.3; }
    .tiptap ul, .tiptap ol { padding-left: 1.5em; margin: 0 0 0.7em; }
    .tiptap li { margin: 0.2em 0; }
    .tiptap a { color: #185FA5; text-decoration: underline; }
    .tiptap p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left; color: #BACFCB; pointer-events: none; height: 0;
    }
    .tiptap-view { font-size: 14px; color: #1A2E2B; line-height: 1.3; }
    .tiptap-view p { margin: 0 0 0.6em 0; line-height: 1.3; }
    .tiptap-view p:last-child { margin-bottom: 0; }
    .tiptap-view h1 { font-size: 1.8em; font-weight: 700; margin: 0.8em 0 0.4em; line-height: 1.3; }
    .tiptap-view h2 { font-size: 1.4em; font-weight: 700; margin: 0.7em 0 0.3em; line-height: 1.3; }
    .tiptap-view h3 { font-size: 1.2em; font-weight: 700; margin: 0.6em 0 0.3em; line-height: 1.3; }
    .tiptap-view ul, .tiptap-view ol { padding-left: 1.5em; margin: 0 0 0.7em; }
    .tiptap-view li { margin: 0.2em 0; }
    .tiptap-view a { color: #185FA5; text-decoration: underline; }
    .tiptap-view strong { font-weight: 700; }
    .tiptap-view em { font-style: italic; }
    .tiptap-view u { text-decoration: underline; }
    .tiptap-view s { text-decoration: line-through; }
  `;
  document.head.appendChild(style);
}

// メインコンポーネント
export default function TiptapEditor({ value, onChange, placeholder = "内容を入力してください", showHint = true }) {
  useEffect(() => { injectTiptapStyles(); }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false, underline: false, hardBreak: false }),
      Underline,
      TiptapLink.configure({ openOnClick: false }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder }),
      HardBreak.extend({
        addKeyboardShortcuts() {
          return { "Shift-Enter": () => this.editor.commands.setHardBreak() };
        },
      }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => { onChange(editor.getHTML()); },
    editorProps: {
      attributes: {
        style: [
          "min-height: 160px", "padding: 11px 13px",
          "border: 1.5px solid #D0DDD9", "border-radius: 8px",
          "font-size: 14px", "line-height: 1.3", "outline: none",
          "background: white", "color: #1A2E2B", "cursor: text",
        ].join(";"),
      },
    },
  });

  return (
    <div style={{ position: "relative" }}>
      <FloatingToolbar editor={editor} />
      <EditorContent editor={editor} />
      {showHint && (
        <p style={{ fontSize: 11, color: "#9AADA8", margin: "4px 0 0", lineHeight: 1.6 }}>
          テキストを選択するとツールバーが表示されます。見出し(#)・太字(**)・箇条書き(-)などのコマンド入力も可能です。
        </p>
      )}
    </div>
  );
}